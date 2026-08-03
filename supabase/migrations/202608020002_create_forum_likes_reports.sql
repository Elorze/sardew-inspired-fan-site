create table if not exists public.zz_forum_post_likes (
  post_id uuid not null references public.zz_forum_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.zz_forum_reply_likes (
  reply_id uuid not null references public.zz_forum_replies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

create table if not exists public.zz_forum_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id),
  post_id uuid references public.zz_forum_posts(id) on delete cascade,
  reply_id uuid references public.zz_forum_replies(id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  reviewer_id uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint zz_forum_reports_target_check check ((post_id is not null) <> (reply_id is not null))
);

create index if not exists zz_forum_reports_status_idx on public.zz_forum_reports(status, created_at desc);
alter table public.zz_forum_post_likes enable row level security;
alter table public.zz_forum_reply_likes enable row level security;
alter table public.zz_forum_reports enable row level security;
create policy zz_forum_post_likes_public_read on public.zz_forum_post_likes for select using (true);
create policy zz_forum_reply_likes_public_read on public.zz_forum_reply_likes for select using (true);
