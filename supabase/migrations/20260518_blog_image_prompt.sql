alter table public.blog_posts
  add column if not exists image_prompt text not null default '';

drop function if exists public.admin_upsert_blog_post(uuid,text,text,text,text,text,text,text[],text);

create or replace function public.admin_upsert_blog_post(
  p_id              uuid,
  p_slug            text,
  p_title           text,
  p_excerpt         text,
  p_content         text,
  p_author          text,
  p_cover_image_url text,
  p_image_prompt    text,
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
        (slug, title, excerpt, content, author, cover_image_url, image_prompt, tags, status, published_at)
      values
        (p_slug, p_title, p_excerpt, p_content, p_author, p_cover_image_url, coalesce(p_image_prompt,''), p_tags, p_status, v_published_at)
      returning id into v_id;
    else
      update public.blog_posts set
        slug            = p_slug,
        title           = p_title,
        excerpt         = p_excerpt,
        content         = p_content,
        author          = p_author,
        cover_image_url = p_cover_image_url,
        image_prompt    = coalesce(p_image_prompt, image_prompt),
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
