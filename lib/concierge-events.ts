export const OPEN_CONCIERGE_EVENT = "neurocity:open-selma";
export type ConciergeRequest = { platformSlug?: string; initialPrompt?: string };
export function openConcierge(request: ConciergeRequest = {}) {
  window.dispatchEvent(new CustomEvent(OPEN_CONCIERGE_EVENT, { detail: request }));
}
