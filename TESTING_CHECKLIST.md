# Flashcard Feature - Testing Checklist

## Pre-Testing Setup
- [ ] Run migration: `supabase/migrations/0004_create_flashcards.sql`
- [ ] Verify OpenAI API key in `.env.local`
- [ ] Verify Upstash Redis keys (optional, for rate limiting)
- [ ] Start dev server: `npm run dev`

## Database Tests
- [ ] Check `flashcard_decks` table exists
- [ ] Check `flashcards` table exists
- [ ] Check `flashcard_reviews` table exists
- [ ] Check `flashcard_deck_stats` view exists
- [ ] Verify RLS policies are enabled

## Manual Card Creation
- [ ] Navigate to `/flashcards`
- [ ] Click "New Deck"
- [ ] Enter deck name and description
- [ ] Switch to "Manual" tab
- [ ] Add 3-5 test cards
- [ ] Click "Save All"
- [ ] Verify cards appear in deck view

## AI Generation from Text
- [ ] Go to `/flashcards/new`
- [ ] Enter deck name
- [ ] Switch to "AI Generate" tab
- [ ] Paste sample text (200+ words)
- [ ] Click "Generate Flashcards"
- [ ] Verify 5-15 cards are created
- [ ] Check card quality (relevant Q&A pairs)

## AI Generation from Document
- [ ] Go to "Documents" tab
- [ ] Upload a PDF or paste text
- [ ] Wait for processing
- [ ] Click Brain icon (🧠) next to document
- [ ] Wait for flashcard generation
- [ ] Go to "Flashcards" tab
- [ ] Verify new deck appears with cards

## Study Session
- [ ] Open any deck with cards
- [ ] Click "Study Now"
- [ ] Verify card displays (front side)
- [ ] Press Space to flip
- [ ] Verify back shows answer
- [ ] Click rating buttons (1-5)
- [ ] Verify next card appears
- [ ] Complete full session
- [ ] Check "All done!" screen appears

## Keyboard Shortcuts
- [ ] During study, press Space (should flip)
- [ ] After flip, press 1-5 (should rate and advance)
- [ ] Verify shortcuts work consistently

## Spaced Repetition
- [ ] Review a card and rate it 5 (Perfect)
- [ ] Check database: `flashcard_reviews` has entry
- [ ] Verify `next_review_at` is in future
- [ ] Rate another card 1 (Again)
- [ ] Verify `next_review_at` is ~1 day from now
- [ ] Rate card 3 (Good)
- [ ] Verify `next_review_at` is ~6 days from now

## Due Cards API
- [ ] Visit `/api/flashcards/due` (should show JSON)
- [ ] Check `new_cards` array (never reviewed)
- [ ] Check `due_cards` array (past due date)
- [ ] Check `upcoming_cards` array (future reviews)

## Deck Management
- [ ] Edit deck name (PATCH `/api/flashcards/decks/[deckId]`)
- [ ] Delete a card from deck
- [ ] Delete entire deck
- [ ] Verify cascade deletes work (cards removed)

## UI Components
- [ ] FlashcardList renders all decks
- [ ] Each deck shows stats (total, due, reviewed)
- [ ] Card flip animation is smooth
- [ ] Progress bar updates during study
- [ ] Empty states display properly
- [ ] Mobile responsive (if applicable)

## Integration Points
- [ ] "Flashcards" tab appears in main nav
- [ ] Brain icon appears next to each document
- [ ] Clicking Brain icon generates flashcards
- [ ] Success message appears after generation

## Error Handling
- [ ] Try generating with no OpenAI key (should error gracefully)
- [ ] Try accessing non-existent deck (404)
- [ ] Try reviewing card without auth (401)
- [ ] Try creating deck with empty name (validation error)

## Edge Cases
- [ ] Deck with 0 cards (study button disabled)
- [ ] Deck with 100+ cards (pagination/performance)
- [ ] Very long card text (wraps properly)
- [ ] Cards with special characters
- [ ] Multiple users (RLS isolation)

## Performance
- [ ] AI generation completes in <30s
- [ ] Card flip is instant
- [ ] Deck list loads quickly (<2s)
- [ ] Review flow is smooth (no lag)

## Browser Compatibility
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

## Production Readiness
- [ ] No console errors
- [ ] No TypeScript errors (build succeeds)
- [ ] Rate limiting works (if Upstash configured)
- [ ] RLS policies prevent unauthorized access
- [ ] All API routes have error handling

## Known Issues to Ignore
- ✅ CSS lint warnings for `@tailwind` (Tailwind standard)
- ✅ TypeScript warnings about Supabase types (cosmetic)
- ✅ "onRefresh" serialization warning (client component pattern)

## Success Criteria
✅ Can create decks manually
✅ Can generate flashcards from documents
✅ Can study cards with spaced repetition
✅ Cards reschedule based on ratings
✅ Progress tracking works
✅ UI is smooth and responsive
✅ No critical errors in console

## If Issues Found
1. Check browser console for errors
2. Check server logs in terminal
3. Verify migration applied correctly
4. Check `.env.local` has all required keys
5. Refer to `FLASHCARDS_FEATURE.md` for troubleshooting
