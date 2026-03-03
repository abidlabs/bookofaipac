#!/usr/bin/env python3

from urllib.parse import unquote, urlparse

import requests
from requests import RequestException

USER_AGENT = "bookofaipac-image-bot/1.0 (open-license portrait ingestion)"


def is_http_url(value: str) -> bool:
  if not value:
    return False
  parsed = urlparse(value)
  return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def is_wikimedia_upload(url: str) -> bool:
  if not is_http_url(url):
    return False
  host = urlparse(url).netloc.lower()
  return "upload.wikimedia.org" in host


def is_us_government_portrait_host(url: str) -> bool:
  if not is_http_url(url):
    return False
  host = urlparse(url).netloc.lower()
  return host.endswith(".house.gov") or host.endswith(".senate.gov") or host.endswith(".gov")


def extract_commons_file_title(image_url: str) -> str | None:
  if not is_wikimedia_upload(image_url):
    return None
  parsed = urlparse(image_url)
  path = unquote(parsed.path)
  if "/thumb/" in path:
    path = path.split("/thumb/", 1)[1]
    parts = path.split("/")
    if len(parts) < 2:
      return None
    return parts[1]
  filename = path.rsplit("/", 1)[-1]
  return filename if filename else None


def get_with_retry(
  session: requests.Session,
  url: str,
  params: dict,
  max_attempts: int = 2,
) -> requests.Response | None:
  backoff = 0.4
  for _ in range(max_attempts):
    try:
      response = session.get(url, params=params, timeout=25)
      if response.status_code in {429, 500, 502, 503, 504}:
        response.close()
        raise RequestException(f"Retryable status {response.status_code}")
      response.raise_for_status()
      return response
    except RequestException:
      import time

      time.sleep(backoff)
      backoff = min(backoff * 2.0, 2.0)
  return None


def wikipedia_page_image(session: requests.Session, title: str) -> dict | None:
  params = {
    "action": "query",
    "format": "json",
    "formatversion": "2",
    "prop": "pageimages|info",
    "piprop": "original",
    "pilicense": "free",
    "redirects": "1",
    "inprop": "url",
    "titles": title,
  }
  response = get_with_retry(session, "https://en.wikipedia.org/w/api.php", params=params)
  if not response:
    return None
  payload = response.json()
  pages = payload.get("query", {}).get("pages", [])
  if not pages:
    return None
  page = pages[0]
  if "missing" in page:
    return None
  original = page.get("original", {})
  source = original.get("source")
  if not source:
    return None
  return {
    "source_url": source,
    "source_page_url": page.get("fullurl"),
    "match_method": "wikipedia_pageimages_free",
    "license": "free_via_wikipedia_pageimages",
  }


def commons_license_metadata(session: requests.Session, image_url: str) -> dict:
  file_title = extract_commons_file_title(image_url)
  if not file_title:
    return {}
  if not file_title.lower().startswith("file:"):
    file_title = f"File:{file_title}"
  params = {
    "action": "query",
    "format": "json",
    "formatversion": "2",
    "titles": file_title,
    "prop": "imageinfo",
    "iiprop": "extmetadata|url",
  }
  response = get_with_retry(session, "https://commons.wikimedia.org/w/api.php", params=params)
  if not response:
    return {}
  payload = response.json()
  pages = payload.get("query", {}).get("pages", [])
  if not pages:
    return {}
  imageinfo = pages[0].get("imageinfo", [])
  if not imageinfo:
    return {}
  ext = imageinfo[0].get("extmetadata", {})
  return {
    "license": ext.get("LicenseShortName", {}).get("value"),
    "license_url": ext.get("LicenseUrl", {}).get("value"),
    "attribution_required": ext.get("AttributionRequired", {}).get("value"),
    "usage_terms": ext.get("UsageTerms", {}).get("value"),
  }


def resolve_candidate_image_source(session: requests.Session, candidate: dict) -> dict | None:
  existing = candidate.get("imageUrl") or ""
  if is_wikimedia_upload(existing):
    source = {
      "source_url": existing,
      "source_page_url": None,
      "match_method": "existing_wikimedia_url",
      "license": "wikimedia_free_or_open",
    }
    source.update({k: v for k, v in commons_license_metadata(session, existing).items() if v})
    return source
  if is_us_government_portrait_host(existing):
    return {
      "source_url": existing,
      "source_page_url": None,
      "match_method": "existing_us_government_url",
      "license": "us_government_public_domain_or_open",
    }
  name = candidate.get("name") or ""
  if not name:
    return None
  wikipedia_source = wikipedia_page_image(session, name)
  if not wikipedia_source:
    return None
  wikipedia_source.update(
    {
      k: v
      for k, v in commons_license_metadata(session, wikipedia_source["source_url"]).items()
      if v
    }
  )
  return wikipedia_source
