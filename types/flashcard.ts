export interface Flashcard {
  id: string;
  deck_id: string;
  session_id?: string | null;
  front: string;
  back: string;
  hint?: string | null;
  created_at: string;
}

export interface FlashcardDeck {
  id: string;
  user_id: string | null;
  session_id?: string | null;
  name: string;
  description?: string | null;
  document_id?: string | null;
  created_at: string;
  updated_at: string;
  flashcards?: Flashcard[];
}

export interface FlashcardDeckStats {
  deck_id: string;
  user_id: string | null;
  session_id?: string | null;
  name: string;
  total_cards: number;
  reviewed_cards: number;
  cards_due: number;
  last_reviewed_at?: string | null;
}

export interface FlashcardReview {
  id: string;
  flashcard_id: string;
  user_id: string | null;
  session_id?: string | null;
  rating: number;
  ease_factor: number;
  interval_days: number;
  next_review_at: string;
  reviewed_at: string;
}

export interface FlashcardWithReview extends Flashcard {
  status?: "new" | "due" | "upcoming";
  next_review_at?: string;
  latest_review?: FlashcardReview;
}
