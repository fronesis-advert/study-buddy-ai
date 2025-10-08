-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- Profiles track subscription plan metadata
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text default 'free',
  created_at timestamptz default timezone('utc'::text, now())
);

-- Documents uploaded by learners
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  source_type text check (source_type in ('upload', 'url', 'note')),
  raw_text text,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(raw_text, '')), 'B')
  ) stored,
  created_at timestamptz default timezone('utc'::text, now())
);

create index if not exists documents_user_idx on public.documents (user_id);
create index if not exists documents_search_vector_idx on public.documents using gin (search_vector);

-- Chunked representations for retrieval
create table if not exists public.chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references public.documents(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  token_count integer,
  created_at timestamptz default timezone('utc'::text, now())
);

create index if not exists chunks_document_idx on public.chunks (document_id);
create index if not exists chunks_embedding_idx on public.chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Study sessions
create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  mode text check (mode in ('chat', 'quiz', 'study')),
  meta jsonb,
  created_at timestamptz default timezone('utc'::text, now())
);

create index if not exists sessions_user_idx on public.sessions (user_id);
create index if not exists sessions_created_idx on public.sessions (created_at desc);

-- Conversation history
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade,
  role text check (role in ('user', 'assistant', 'system')),
  content text,
  json jsonb,
  created_at timestamptz default timezone('utc'::text, now())
);

create index if not exists messages_session_idx on public.messages (session_id, created_at);

-- Quiz lifecycle tracking
create table if not exists public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade,
  spec jsonb,
  result jsonb,
  created_at timestamptz default timezone('utc'::text, now())
);

create index if not exists quizzes_session_idx on public.quizzes (session_id);

-- Helper function for pgvector similarity search
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count int default 6,
  doc_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  where doc_ids is null or c.document_id = any(doc_ids)
  order by c.embedding <-> query_embedding
  limit match_count;
$$;
