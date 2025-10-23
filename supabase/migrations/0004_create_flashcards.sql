-- Flashcard decks table
create table if not exists public.flashcard_decks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  document_id uuid references public.documents(id) on delete set null, -- Optional source document
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

create index if not exists flashcard_decks_user_idx on public.flashcard_decks (user_id);
create index if not exists flashcard_decks_updated_idx on public.flashcard_decks (updated_at desc);
create index if not exists flashcard_decks_document_idx on public.flashcard_decks (document_id);

-- Individual flashcards
create table if not exists public.flashcards (
  id uuid primary key default uuid_generate_v4(),
  deck_id uuid references public.flashcard_decks(id) on delete cascade,
  front text not null, -- Question/prompt
  back text not null, -- Answer
  hint text, -- Optional hint
  created_at timestamptz default timezone('utc'::text, now())
);

create index if not exists flashcards_deck_idx on public.flashcards (deck_id);

-- Review history for spaced repetition
create table if not exists public.flashcard_reviews (
  id uuid primary key default uuid_generate_v4(),
  flashcard_id uuid references public.flashcards(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  rating int check (rating between 1 and 5) not null, -- 1=Again, 2=Hard, 3=Good, 4=Easy, 5=Perfect
  ease_factor float default 2.5, -- SM-2 algorithm ease factor
  interval_days int default 1, -- Days until next review
  next_review_at timestamptz,
  reviewed_at timestamptz default timezone('utc'::text, now())
);

create index if not exists flashcard_reviews_card_idx on public.flashcard_reviews (flashcard_id);
create index if not exists flashcard_reviews_user_idx on public.flashcard_reviews (user_id);
create index if not exists flashcard_reviews_next_review_idx on public.flashcard_reviews (next_review_at);

-- Deck statistics view
create or replace view public.flashcard_deck_stats as
select
  fd.id as deck_id,
  fd.user_id,
  fd.name,
  count(distinct f.id) as total_cards,
  count(distinct fr.flashcard_id) as reviewed_cards,
  count(distinct case when fr.next_review_at <= now() then fr.flashcard_id end) as cards_due,
  max(fr.reviewed_at) as last_reviewed_at
from public.flashcard_decks fd
left join public.flashcards f on f.deck_id = fd.id
left join lateral (
  select distinct on (fr.flashcard_id)
    fr.flashcard_id,
    fr.next_review_at,
    fr.reviewed_at
  from public.flashcard_reviews fr
  where fr.flashcard_id = f.id
  order by fr.flashcard_id, fr.reviewed_at desc
) fr on true
group by fd.id, fd.user_id, fd.name;

-- Function to update deck timestamp
create or replace function public.update_flashcard_deck_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at on decks
create trigger update_flashcard_deck_timestamp
  before update on public.flashcard_decks
  for each row
  execute function public.update_flashcard_deck_timestamp();

-- RLS Policies for flashcard_decks
alter table public.flashcard_decks enable row level security;

create policy "Users can view their own decks"
  on public.flashcard_decks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own decks"
  on public.flashcard_decks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own decks"
  on public.flashcard_decks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own decks"
  on public.flashcard_decks for delete
  using (auth.uid() = user_id);

-- RLS Policies for flashcards
alter table public.flashcards enable row level security;

create policy "Users can view cards in their decks"
  on public.flashcards for select
  using (
    exists (
      select 1 from public.flashcard_decks fd
      where fd.id = flashcards.deck_id
      and fd.user_id = auth.uid()
    )
  );

create policy "Users can insert cards into their decks"
  on public.flashcards for insert
  with check (
    exists (
      select 1 from public.flashcard_decks fd
      where fd.id = flashcards.deck_id
      and fd.user_id = auth.uid()
    )
  );

create policy "Users can update cards in their decks"
  on public.flashcards for update
  using (
    exists (
      select 1 from public.flashcard_decks fd
      where fd.id = flashcards.deck_id
      and fd.user_id = auth.uid()
    )
  );

create policy "Users can delete cards in their decks"
  on public.flashcards for delete
  using (
    exists (
      select 1 from public.flashcard_decks fd
      where fd.id = flashcards.deck_id
      and fd.user_id = auth.uid()
    )
  );

-- RLS Policies for flashcard_reviews
alter table public.flashcard_reviews enable row level security;

create policy "Users can view their own reviews"
  on public.flashcard_reviews for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reviews"
  on public.flashcard_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reviews"
  on public.flashcard_reviews for update
  using (auth.uid() = user_id);

create policy "Users can delete their own reviews"
  on public.flashcard_reviews for delete
  using (auth.uid() = user_id);
