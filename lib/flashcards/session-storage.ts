const STORAGE_KEY = "studybuddy.flashcards.session";

export function getStoredFlashcardSession(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function storeFlashcardSession(sessionId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, sessionId);
}

export function clearFlashcardSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
