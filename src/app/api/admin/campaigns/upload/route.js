import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const fundraiserId = formData.get('fundraiser_id');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!fundraiserId) {
      return NextResponse.json({ error: 'fundraiser_id required' }, { status: 400 });
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP and GIF images are allowed' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const compressed = await sharp(Buffer.from(bytes))
      .resize(1600, 900, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const path = `${fundraiserId}/cover.webp`;

    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from('fundraiser-images')
      .upload(path, compressed, { contentType: 'image/webp', upsert: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from('fundraiser-images').getPublicUrl(data.path);
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
