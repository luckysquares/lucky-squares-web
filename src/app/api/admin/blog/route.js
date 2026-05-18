import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_get_blog_posts');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, slug, title, excerpt, content, author, cover_image_url, tags, status } = body;

    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_upsert_blog_post', {
      p_id:              id ?? null,
      p_slug:            slug,
      p_title:           title,
      p_excerpt:         excerpt ?? '',
      p_content:         content ?? '',
      p_author:          author ?? 'LuckySquares Australia',
      p_cover_image_url: cover_image_url ?? null,
      p_tags:            tags ?? [],
      p_status:          status ?? 'draft',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const supabase = getSupabase();
    const { error } = await supabase.rpc('admin_delete_blog_post', { p_id: id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
