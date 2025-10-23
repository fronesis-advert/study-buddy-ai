# Quick Start: Flashcards

## 1. Apply Database Migration

Run the flashcard migration in your Supabase project:

```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Manually in Supabase Dashboard
# 1. Go to SQL Editor in your Supabase dashboard
# 2. Copy contents of supabase/migrations/0004_create_flashcards.sql
# 3. Run the SQL
```

## 2. Verify Tables Created

Check that these tables exist in your Supabase database:
- ✅ `flashcard_decks`
- ✅ `flashcards`
- ✅ `flashcard_reviews`
- ✅ `flashcard_deck_stats` (view)

## 3. Start Dev Server

```bash
npm run dev
```

Visit http://localhost:3000

## 4. Try the Feature

### Method 1: Generate from Document
1. Go to **Documents** tab
2. Upload a PDF or paste text
3. Click the **Brain icon** (🧠) next to the document
4. Wait for AI to generate flashcards (~10-30 seconds)
5. Click **Flashcards** tab to see your new deck

### Method 2: Create Manually
1. Go to **Flashcards** tab
2. Click **New Deck**
3. Enter deck name
4. Choose **Manual** mode
5. Add cards:
   - **Front**: Question (e.g., "What is the capital of France?")
   - **Back**: Answer (e.g., "Paris")
   - **Hint**: Optional hint
6. Click **Add Card** for more
7. Click **Save All**

### Method 3: Generate from Text
1. Go to **Flashcards** tab → **New Deck**
2. Enter deck name
3. Choose **AI Generate** tab
4. Paste your study notes/text
5. Click **Generate Flashcards**
6. AI creates 5-15 cards automatically

## 5. Study Your Cards

1. Open any deck
2. Click **Study Now**
3. Read the front (question)
4. Press **Space** to flip
5. Rate yourself 1-5:
   - **1** = Forgot it (review tomorrow)
   - **2** = Hard recall
   - **3** = Good (standard progression)
   - **4** = Easy recall
   - **5** = Perfect (longer interval)

### Keyboard Shortcuts
- `Space` - Flip card
- `1-5` - Rate when card is flipped

## 6. Track Progress

The deck list shows:
- **Total cards** in each deck
- **Due cards** (need review today)
- **Reviewed cards** count
- **Last reviewed** date

Cards you rate highly will appear less frequently (spaced repetition).

## Common Issues

### "Unauthorized" Error
- Make sure you're logged in or auth is configured
- Check RLS policies were created by migration

### No Cards Generated
- Verify OpenAI API key in `.env.local`
- Check document has content (chunks exist)
- Look for errors in browser console

### TypeScript Errors in API Routes
- The Supabase client types might show warnings
- These don't affect functionality
- Run `npm run build` to verify no runtime issues

## Next Steps

- Generate flashcards from multiple documents
- Study daily to maintain streaks
- Mix manual and AI-generated cards
- Check **FLASHCARDS_FEATURE.md** for full documentation

## Example Workflow

**Day 1:**
1. Upload course notes PDF
2. Generate flashcards
3. Study all new cards (rate each 3-5)

**Day 2:**
1. Open Flashcards tab
2. Due cards appear automatically
3. Review them (harder cards = lower rating)

**Day 3+:**
- Cards you mastered appear less often
- Difficult cards come back sooner
- System optimizes your review schedule

That's it! 🎉 You now have an AI-powered flashcard system with spaced repetition.
