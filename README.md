## StudyBuddy AI

StudyBuddy is a Next.js 14 workspace that combines real-time tutoring, document-grounded retrieval, adaptive quizzes, and Pomodoro-style study sessions. It is wired for Supabase (Postgres + pgvector) storage and powered by OpenAI `gpt-4o-mini`.

### Features
- Streaming chat tutor with optional RAG citations sourced from the document library.
- Document ingestion pipeline for PDF/text uploads that chunk, embed, and persist to Supabase.
- Quiz mode that generates and grades questions using OpenAI JSON output.
- Guided study session timer with goal tracking and analytics saved in Supabase.
- shadcn/ui component toolkit, Tailwind styling, and React Markdown rendering.

### Getting Started
```bash
npm install
npm run dev
# visit http://localhost:3000
```

### Environment Variables
Create a `.env.local` file with:
```
OPENAI_API_KEY=your-openai-key
NEXT_PUBLIC_SUPABASE_URL=https://YOUR.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
```
The service role key is required for server-side ingestion and embeddings. Never expose it to the browser.

### Supabase Setup
1. Enable the `vector` and `uuid-ossp` extensions in your Supabase project.
2. Run the migration in `supabase/migrations/0001_create_core_tables.sql`.
3. Create an OpenAI access policy in Supabase if you plan to trigger embeddings from the database.

### Available Scripts
- `npm run dev` – start the Next.js dev server
- `npm run build` – production build
- `npm run start` – run the built app
- `npm run lint` – lint with ESLint

### Project Structure
- `app/` – App Router pages and API routes
- `components/` – shadcn-based UI primitives and feature components
- `lib/` – OpenAI, Supabase, RAG helpers, rate limiting, prompts
- `supabase/` – SQL migrations and helper SQL

### Notes
- The API routes default to the Edge runtime except where Node.js features (PDF parsing) are required.
- Rate limiting is in-memory and should be replaced with a shared store (e.g., Upstash) for production.
- Remember to secure Supabase policies so users can only access their own content before shipping.
