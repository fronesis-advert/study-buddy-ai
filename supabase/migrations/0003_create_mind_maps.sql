-- Mind maps table (parent container)
create table if not exists public.mind_maps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  thumbnail_data text, -- Base64 encoded thumbnail
  is_exported boolean default false,
  exported_document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

create index if not exists mind_maps_user_idx on public.mind_maps (user_id);
create index if not exists mind_maps_updated_idx on public.mind_maps (updated_at desc);

-- Mind map nodes (topics/concepts)
create table if not exists public.mind_map_nodes (
  id uuid primary key default uuid_generate_v4(),
  mind_map_id uuid references public.mind_maps(id) on delete cascade,
  label text not null,
  content text, -- Markdown content
  node_type text check (node_type in ('root', 'topic', 'subtopic', 'note')) default 'topic',
  position_x float not null,
  position_y float not null,
  style jsonb default '{}', -- { "color": "#hex", "icon": "name", "size": "md" }
  created_at timestamptz default timezone('utc'::text, now())
);

create index if not exists mind_map_nodes_map_idx on public.mind_map_nodes (mind_map_id);

-- Connections between nodes (edges)
create table if not exists public.mind_map_edges (
  id uuid primary key default uuid_generate_v4(),
  mind_map_id uuid references public.mind_maps(id) on delete cascade,
  source_node_id uuid references public.mind_map_nodes(id) on delete cascade,
  target_node_id uuid references public.mind_map_nodes(id) on delete cascade,
  label text,
  style jsonb default '{}', -- { "type": "solid", "color": "#hex", "animated": false }
  created_at timestamptz default timezone('utc'::text, now())
);

create index if not exists mind_map_edges_map_idx on public.mind_map_edges (mind_map_id);

-- Function to update updated_at timestamp
create or replace function public.update_mind_map_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger update_mind_map_timestamp
  before update on public.mind_maps
  for each row
  execute function public.update_mind_map_timestamp();
