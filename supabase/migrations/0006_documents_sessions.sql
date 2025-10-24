-- Associate documents with study sessions for guest user support
alter table public.documents
  add column if not exists session_id uuid references public.sessions(id) on delete cascade;

create index if not exists documents_session_idx
  on public.documents (session_id);

-- Add check constraint to ensure either user_id or session_id is set
alter table public.documents
  drop constraint if exists documents_user_or_session_check;

alter table public.documents
  add constraint documents_user_or_session_check
  check (user_id is not null or session_id is not null);
