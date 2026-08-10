create table if not exists public.zz_page_stats (
  page_key text primary key,
  views integer not null default 0 check (views >= 0),
  heat integer not null default 0 check (heat >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.zz_page_visitors (
  page_key text not null references public.zz_page_stats(page_key) on delete cascade,
  visitor_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  view_count integer not null default 1 check (view_count >= 1),
  primary key (page_key, visitor_hash)
);

create table if not exists public.zz_page_heat (
  page_key text not null references public.zz_page_stats(page_key) on delete cascade,
  visitor_hash text not null,
  created_at timestamptz not null default now(),
  primary key (page_key, visitor_hash)
);

create index if not exists zz_page_visitors_page_key_idx
  on public.zz_page_visitors(page_key);

create index if not exists zz_page_heat_page_key_idx
  on public.zz_page_heat(page_key);

create or replace function public.zz_ensure_page_stats(target_page_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.zz_page_stats (page_key, views, heat, updated_at)
  values (target_page_key, 0, 0, now())
  on conflict (page_key) do nothing;
end;
$$;

create or replace function public.zz_get_page_engagement(
  target_page_key text,
  target_visitor_hash text default null
)
returns table (
  page_key text,
  views integer,
  visitors bigint,
  heat integer,
  heated boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform public.zz_ensure_page_stats(target_page_key);

  return query
  select
    stats.page_key,
    stats.views,
    (
      select count(*)::bigint
      from public.zz_page_visitors visitors
      where visitors.page_key = stats.page_key
    ) as visitors,
    stats.heat,
    exists (
      select 1
      from public.zz_page_heat heat_rows
      where heat_rows.page_key = stats.page_key
        and target_visitor_hash is not null
        and heat_rows.visitor_hash = target_visitor_hash
    ) as heated
  from public.zz_page_stats stats
  where stats.page_key = target_page_key;
end;
$$;

create or replace function public.zz_record_page_view(
  target_page_key text,
  target_visitor_hash text
)
returns table (
  page_key text,
  views integer,
  visitors bigint,
  heat integer,
  heated boolean,
  counted boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform public.zz_ensure_page_stats(target_page_key);

  insert into public.zz_page_visitors (
    page_key,
    visitor_hash,
    first_seen_at,
    last_seen_at,
    view_count
  )
  values (target_page_key, target_visitor_hash, now(), now(), 1)
  on conflict (page_key, visitor_hash) do update
  set
    last_seen_at = excluded.last_seen_at,
    view_count = public.zz_page_visitors.view_count + 1;

  update public.zz_page_stats
  set views = public.zz_page_stats.views + 1, updated_at = now()
  where public.zz_page_stats.page_key = target_page_key;

  return query
  select
    engagement.page_key,
    engagement.views,
    engagement.visitors,
    engagement.heat,
    engagement.heated,
    true as counted
  from public.zz_get_page_engagement(target_page_key, target_visitor_hash) as engagement;
end;
$$;

create or replace function public.zz_stamp_page_heat(
  target_page_key text,
  target_visitor_hash text
)
returns table (
  page_key text,
  views integer,
  visitors bigint,
  heat integer,
  heated boolean,
  awarded boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  did_award boolean := false;
  inserted_count integer := 0;
begin
  perform public.zz_ensure_page_stats(target_page_key);

  insert into public.zz_page_heat (page_key, visitor_hash, created_at)
  values (target_page_key, target_visitor_hash, now())
  on conflict (page_key, visitor_hash) do nothing;
  get diagnostics inserted_count = row_count;
  did_award := inserted_count > 0;

  if did_award then
    update public.zz_page_stats
    set heat = public.zz_page_stats.heat + 1, updated_at = now()
    where public.zz_page_stats.page_key = target_page_key;
  end if;

  return query
  select
    engagement.page_key,
    engagement.views,
    engagement.visitors,
    engagement.heat,
    engagement.heated,
    did_award as awarded
  from public.zz_get_page_engagement(target_page_key, target_visitor_hash) as engagement;
end;
$$;

revoke all on function public.zz_ensure_page_stats(text) from public;
revoke all on function public.zz_get_page_engagement(text, text) from public;
revoke all on function public.zz_record_page_view(text, text) from public;
revoke all on function public.zz_stamp_page_heat(text, text) from public;

grant execute on function public.zz_get_page_engagement(text, text) to service_role;
grant execute on function public.zz_record_page_view(text, text) to service_role;
grant execute on function public.zz_stamp_page_heat(text, text) to service_role;

alter table public.zz_page_stats enable row level security;
alter table public.zz_page_visitors enable row level security;
alter table public.zz_page_heat enable row level security;
