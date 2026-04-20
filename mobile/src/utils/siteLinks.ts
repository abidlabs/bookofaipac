import { SITE_BASE_URL } from "../theme";

export function candidateDetailUrl(candidateId: string): string {
  return `${SITE_BASE_URL}/detail/?id=${encodeURIComponent(candidateId)}`;
}
