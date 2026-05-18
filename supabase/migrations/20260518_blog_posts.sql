create table if not exists public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  excerpt         text not null default '',
  content         text not null default '',
  author          text not null default 'LuckySquares Australia',
  cover_image_url text,
  tags            text[] not null default '{}',
  status          text not null default 'draft' check (status in ('draft', 'published')),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

create policy "Published posts are publicly readable"
  on public.blog_posts for select using (status = 'published');

-- Admin can do everything (security definer RPCs bypass RLS anyway)
create or replace function public.admin_get_blog_posts()
  returns setof public.blog_posts
  language sql security definer as $$
    select * from public.blog_posts order by created_at desc;
  $$;

create or replace function public.admin_upsert_blog_post(
  p_id              uuid,
  p_slug            text,
  p_title           text,
  p_excerpt         text,
  p_content         text,
  p_author          text,
  p_cover_image_url text,
  p_tags            text[],
  p_status          text
) returns uuid
  language plpgsql security definer as $$
  declare
    v_id           uuid;
    v_published_at timestamptz;
  begin
    if p_status = 'published' then
      select published_at into v_published_at
        from public.blog_posts where id = p_id;
      if v_published_at is null then
        v_published_at := now();
      end if;
    end if;

    if p_id is null then
      insert into public.blog_posts
        (slug, title, excerpt, content, author, cover_image_url, tags, status, published_at)
      values
        (p_slug, p_title, p_excerpt, p_content, p_author, p_cover_image_url, p_tags, p_status, v_published_at)
      returning id into v_id;
    else
      update public.blog_posts set
        slug            = p_slug,
        title           = p_title,
        excerpt         = p_excerpt,
        content         = p_content,
        author          = p_author,
        cover_image_url = p_cover_image_url,
        tags            = p_tags,
        status          = p_status,
        published_at    = coalesce(v_published_at, published_at),
        updated_at      = now()
      where id = p_id
      returning id into v_id;
    end if;

    return v_id;
  end;
  $$;

create or replace function public.admin_delete_blog_post(p_id uuid)
  returns void language sql security definer as $$
    delete from public.blog_posts where id = p_id;
  $$;
