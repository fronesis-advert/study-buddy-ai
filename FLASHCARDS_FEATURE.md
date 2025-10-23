# Flashcards Feature

## Overview
AI-powered flashcard system with spaced repetition (SM-2 algorithm) integrated into StudyBuddy. Generate flashcards from documents or create them manually.

## Features
- ✅ **AI Generation** - Automatically create flashcards from documents or text
- ✅ **Spaced Repetition** - SM-2 algorithm schedules reviews based on performance
- ✅ **Manual Creation** - Build custom flashcard decks from scratch
- ✅ **3D Flip Animation** - Smooth card flipping with keyboard shortcuts
- ✅ **Progress Tracking** - Track cards reviewed, due, and upcoming
- ✅ **Document Integration** - Generate flashcards directly from your knowledge base

## Database Setup

### Run the migration
```bash
# The migration file is at: supabase/migrations/0004_create_flashcards.sql
# Apply it through your Supabase dashboard or CLI:
supabase db push
```

### Tables Created
- `flashcard_decks` - Container for flashcard sets
- `flashcards` - Individual cards (front/back/hint)
- `flashcard_reviews` - Review history with spaced repetition metadata
- `flashcard_deck_stats` - View aggregating deck statistics

## API Routes

### Decks
- `GET /api/flashcards/decks` - List all decks with stats
- `POST /api/flashcards/decks` - Create new deck
- `GET /api/flashcards/decks/[deckId]` - Get deck with all cards
- `PATCH /api/flashcards/decks/[deckId]` - Update deck details
- `DELETE /api/flashcards/decks/[deckId]` - Delete deck

### Cards
- `GET /api/flashcards/decks/[deckId]/cards` - Get all cards in deck
- `POST /api/flashcards/decks/[deckId]/cards` - Add card to deck
- `GET /api/flashcards/cards/[cardId]` - Get single card
- `PATCH /api/flashcards/cards/[cardId]` - Update card
- `DELETE /api/flashcards/cards/[cardId]` - Delete card

### Reviews
- `POST /api/flashcards/cards/[cardId]/review` - Record review with rating (1-5)
- `GET /api/flashcards/cards/[cardId]/review` - Get review history

### AI Generation
- `POST /api/flashcards/generate` - Generate flashcards from document or text
  ```json
  {
    "document_id": "uuid",  // OR
    "text": "content...",
    "deck_name": "My Deck",
    "deck_description": "Optional"
  }
  ```

### Due Cards
- `GET /api/flashcards/due?deck_id=uuid` - Get cards due for review

## UI Components

### FlashcardList
Location: `/components/flashcards/FlashcardList.tsx`
- Displays all decks with stats (total cards, due, reviewed)
- Quick actions: View, Study, Delete

### FlashcardReview
Location: `/components/flashcards/FlashcardReview.tsx`
- 3D flip card interface
- Keyboard shortcuts: Space (flip), 1-5 (rate)
- Spaced repetition scheduling after each review

### FlashcardEditor
Location: `/components/flashcards/FlashcardEditor.tsx`
- Create/edit multiple cards at once
- Fields: Front (question), Back (answer), Hint (optional)

## Pages

### `/flashcards`
Main flashcard dashboard - view all decks

### `/flashcards/new`
Create new deck with two modes:
1. **Manual** - Add cards one by one
2. **AI Generate** - Paste text and let AI create cards

### `/flashcards/[deckId]`
View deck details and all cards

### `/flashcards/[deckId]/study`
Study session with spaced repetition

## Integration Points

### Main App Tab
Added "Flashcards" tab to main page navigation

### Documents Library
Each document has a **Brain icon** button to generate flashcards instantly

## Spaced Repetition (SM-2 Algorithm)

### Rating Scale
- **1 (Again)** - Forgot, review soon (1 day)
- **2 (Hard)** - Difficult recall (1.2x interval)
- **3 (Good)** - Standard progression (first: 6 days, then ease factor)
- **4 (Easy)** - Quick recall (1.3x ease factor multiplier)
- **5 (Perfect)** - Instant recall (1.3x ease factor multiplier)

### Ease Factor
- Starts at 2.5
- Adjusts based on performance
- Bounded between 1.3 and 2.5

### Scheduling
- New cards start with 1-day interval
- Each rating adjusts the next review date
- Algorithm in: `/app/api/flashcards/cards/[cardId]/review/route.ts`

## Usage Examples

### Generate from Document
```typescript
// Click the Brain icon next to any document in the Documents tab
// OR use the API:
const response = await fetch('/api/flashcards/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    document_id: 'uuid-of-document',
    deck_name: 'Chapter 3 Flashcards'
  })
});
```

### Create Manual Deck
1. Go to Flashcards tab → "New Deck"
2. Enter deck name
3. Choose "Manual" mode
4. Add cards with front/back/hint
5. Click "Save All"

### Study Session
1. Open deck → "Study Now"
2. Read front of card (question)
3. Press Space to flip
4. Rate yourself 1-5 (keyboard or buttons)
5. Algorithm schedules next review

## Keyboard Shortcuts

### During Study
- `Space` - Flip card
- `1` - Rate "Again"
- `2` - Rate "Hard"
- `3` - Rate "Good"
- `4` - Rate "Easy"
- `5` - Rate "Perfect"

## Styling

Custom CSS for flip animation in `app/globals.css`:
```css
.perspective-1000 { perspective: 1000px; }
.transform-style-3d { transform-style: preserve-3d; }
.backface-hidden { backface-visibility: hidden; }
.rotate-y-180 { transform: rotateY(180deg); }
```

## TypeScript Types

Location: `/types/flashcard.ts`
- `Flashcard` - Card data
- `FlashcardDeck` - Deck container
- `FlashcardDeckStats` - Aggregated statistics
- `FlashcardReview` - Review record with SM-2 data
- `FlashcardWithReview` - Card enriched with review status

## Future Enhancements

Potential additions:
- [ ] Export/import Anki format
- [ ] Deck sharing between users
- [ ] Image attachments on cards
- [ ] Audio pronunciation
- [ ] Mobile swipe gestures (already has touch support)
- [ ] Gamification (streaks, XP, achievements)
- [ ] Advanced analytics dashboard
- [ ] Cloze deletions (fill-in-the-blank)
- [ ] Reverse cards (swap front/back)

## Troubleshooting

### No decks showing
- Check Supabase migration was applied
- Verify RLS policies are active
- Check browser console for API errors

### Flashcards not generating
- Ensure OpenAI API key is set in `.env.local`
- Check document has content (chunks exist)
- Review `/api/flashcards/generate` logs

### Cards not scheduling properly
- Verify `flashcard_reviews` table has correct structure
- Check SM-2 algorithm logic in review API
- Ensure next_review_at is being set

## Credits

Built with:
- Next.js 14 (App Router)
- Supabase (Postgres + RLS)
- OpenAI GPT-4o-mini
- shadcn/ui components
- SM-2 spaced repetition algorithm
