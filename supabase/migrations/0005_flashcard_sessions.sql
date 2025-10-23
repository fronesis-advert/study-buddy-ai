-- Expand session modes to include flashcards
alter table public.sessions
  drop constraint if exists sessions_mode_check;

alter table public.sessions
  add constraint sessions_mode_check
  check (mode in ('chat', 'quiz', 'study', 'flashcards'));

-- Associate flashcard entities with study sessions
alter table public.flashcard_decks
  add column if not exists session_id uuid references public.sessions(id) on delete cascade;

create index if not exists flashcard_decks_session_idx
  on public.flashcard_decks (session_id);

alter table public.flashcards
  add column if not exists session_id uuid references public.sessions(id) on delete cascade;

create index if not exists flashcards_session_idx
  on public.flashcards (session_id);

alter table public.flashcard_reviews
  add column if not exists session_id uuid references public.sessions(id) on delete cascade;

create index if not exists flashcard_reviews_session_idx
  on public.flashcard_reviews (session_id);

-- Rebuild view with session awareness
drop view if exists public.flashcard_deck_stats;

create or replace view public.flashcard_deck_stats as
select
  fd.id as deck_id,
  fd.user_id,
  fd.session_id,
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
    and (
      (fd.user_id is not null and fr.user_id = fd.user_id)
      or (fd.user_id is null and fr.session_id = fd.session_id)
    )
  order by fr.flashcard_id, fr.reviewed_at desc
) fr on true
group by fd.id, fd.user_id, fd.session_id, fd.name;
