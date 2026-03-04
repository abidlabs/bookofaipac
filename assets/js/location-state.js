import { loadJson } from "./data.js";
import { getStateName } from "./states-data.js";

const button = document.getElementById("myStateButton");
const statusRoot = document.getElementById("myStateStatus");
const statesIndexPath = "./states/index.html";

let knownStateCodes = new Set();

function setStatus(message) {
  if (!statusRoot) return;
  statusRoot.textContent = message;
}

function goToState(code) {
  window.location.href = `./states/${code.toLowerCase()}/index.html`;
}

function goToStatesIndex() {
  window.location.href = statesIndexPath;
}

function getCoordinates() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 120000,
    });
  });
}

function extractStateCode(reverseResult) {
  const countryCode =
    reverseResult?.countryCode ||
    reverseResult?.country_code ||
    reverseResult?.address?.country_code ||
    "";
  if (String(countryCode).toUpperCase() !== "US") {
    return { code: "", isUs: false };
  }
  const subdivision = reverseResult?.principalSubdivisionCode || reverseResult?.address?.state_code || "";
  const code = String(subdivision).toUpperCase().replace(/^US-/, "");
  return { code, isUs: true };
}

async function reverseLookupState(latitude, longitude) {
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`
  );
  if (!response.ok) {
    throw new Error("Reverse geocode failed");
  }
  return response.json();
}

async function initStatesSet() {
  const federalCandidates = await loadJson("./data/2026-federal-candidates.json");
  knownStateCodes = new Set(federalCandidates.map((candidate) => candidate.state).filter(Boolean));
}

async function handleMyStateClick() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is unavailable in this browser. Opening states index.");
    goToStatesIndex();
    return;
  }

  button.disabled = true;
  setStatus("Finding your location...");
  try {
    const position = await getCoordinates();
    const reverse = await reverseLookupState(position.coords.latitude, position.coords.longitude);
    const { code, isUs } = extractStateCode(reverse);
    if (!isUs) {
      setStatus("Location appears outside the U.S. Opening states index.");
      goToStatesIndex();
      return;
    }
    if (!code || !knownStateCodes.has(code)) {
      setStatus("Could not match your state in this dataset. Opening states index.");
      goToStatesIndex();
      return;
    }
    setStatus(`Routing to ${getStateName(code)}...`);
    goToState(code);
  } catch (error) {
    setStatus("State lookup failed. Opening states index.");
    goToStatesIndex();
    console.error(error);
  } finally {
    button.disabled = false;
  }
}

async function init() {
  if (!button || !statusRoot) return;
  try {
    await initStatesSet();
  } catch (error) {
    setStatus("State data unavailable right now.");
    console.error(error);
  }
  button.addEventListener("click", handleMyStateClick);
}

init();
import { loadJson } from "./data.js";

const button = document.getElementById("myStateButton");
const statusRoot = document.getElementById("myStateStatus");

function setStatus(message, isError = false) {
  if (!statusRoot) return;
  statusRoot.textContent = message;
  statusRoot.classList.toggle("is-error", isError);
}

function setStatusHtml(message, isError = false) {
  if (!statusRoot) return;
  statusRoot.innerHTML = message;
  statusRoot.classList.toggle("is-error", isError);
}

function stateUrl(code) {
  return `./states/${code.toLowerCase()}/index.html`;
}

async function resolveStateCode(latitude, longitude) {
  const url =
    "https://api.bigdatacloud.net/data/reverse-geocode-client" +
    `?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}` +
    "&localityLanguage=en";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Reverse geocode failed: ${response.status}`);
  }
  const payload = await response.json();
  const principalSubdivisionCode = payload.principalSubdivisionCode || "";
  if (principalSubdivisionCode.startsWith("US-")) {
    return principalSubdivisionCode.slice(3).toUpperCase();
  }
  return "";
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

async function onClick() {
  if (!button) return;
  if (!("geolocation" in navigator)) {
    setStatusHtml(
      'Location is unavailable in this browser. <a href="./states/index.html">Browse all states</a>.',
      true
    );
    return;
  }
  button.disabled = true;
  setStatus("Detecting your location...");
  try {
    const federal = await loadJson("./data/2026-federal-candidates.json");
    const availableStates = new Set(federal.map((candidate) => (candidate.state || "").toUpperCase()));
    const position = await getCurrentPosition();
    const stateCode = await resolveStateCode(position.coords.latitude, position.coords.longitude);
    if (!stateCode) {
      setStatus("Could not determine a U.S. state. Opening all states.", true);
      window.location.href = "./states/index.html";
      return;
    }
    if (!availableStates.has(stateCode)) {
      setStatusHtml(
        `State ${stateCode} is not in dataset yet. <a href="./states/index.html">Browse all states</a>.`,
        true
      );
      return;
    }
    setStatus(`Opening ${stateCode}...`);
    window.location.href = stateUrl(stateCode);
  } catch (_error) {
    setStatusHtml(
      'Unable to find your state from location. <a href="./states/index.html">Browse all states</a>.',
      true
    );
  } finally {
    button.disabled = false;
  }
}

if (button) {
  button.addEventListener("click", onClick);
}
