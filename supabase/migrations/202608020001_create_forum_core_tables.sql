create table if not exists public.zz_forum_categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zz_forum_posts (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.zz_forum_categories(id),
  author_id uuid not null references public.users(id),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 20000),
  status text not null default 'published' check (status in ('published','hidden','deleted')),
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  reply_count integer not null default 0 check (reply_count >= 0),
  like_count integer not null default 0 check (like_count >= 0),
  last_replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.zz_forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.zz_forum_posts(id) on delete cascade,
  author_id uuid not null references public.users(id),
  parent_id uuid references public.zz_forum_replies(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 20000),
  status text not null default 'published' check (status in ('published','hidden','deleted')),
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists zz_forum_posts_category_created_idx on public.zz_forum_posts(category_id, created_at desc);
create index if not exists zz_forum_posts_active_sort_idx on public.zz_forum_posts(is_pinned desc, coalesce(last_replied_at, created_at) desc);
create index if not exists zz_forum_replies_post_created_idx on public.zz_forum_replies(post_id, created_at asc);

insert into public.zz_forum_categories (id, slug, name, description, icon, sort_order) values
('welcome','welcome','初来乍到','先从这里认识大家。','welcome',10),
('world','world','种种世界','分享你在种种世界发现的事物。','world',20),
('tavern','tavern','酒馆闲聊','坐下来聊聊天，交换此刻的心情。','tavern',30),
('dandelion','dandelion','交换与求助','交换信息，也可以在这里寻求帮助。','dandelion',40),
('creative','creative','创作分享','分享你的创作和手账。','creative',50)
on conflict (id) do update set name=excluded.name, description=excluded.description, icon=excluded.icon, sort_order=excluded.sort_order, updated_at=now();

alter table public.zz_forum_categories enable row level security;
alter table public.zz_forum_posts enable row level security;
alter table public.zz_forum_replies enable row level security;
create policy zz_forum_categories_public_read on public.zz_forum_categories for select using (is_active);
create policy zz_forum_posts_public_read on public.zz_forum_posts for select using (status='published');
create policy zz_forum_replies_public_read on public.zz_forum_replies for select using (status='published');
