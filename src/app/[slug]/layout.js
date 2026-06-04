import { getAnonClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SITE_URL = 'https://luckysquares.com.au';

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const supabase = getAnonClient();
    const col = UUID_RE.test(slug) ? 'id' : 'slug';

    const { data } = await supabase
      .from('fundraisers')
      .select('title, org, description, price_per_sq, grid_size, image_url')
      .eq(col, slug)
      .in('status', ['active', 'drawn'])
      .single();

    if (!data) return {};

    const title = data.title || 'Lucky Squares Fundraiser';
    const description = [
      data.description?.trim() || `Pick a square for $${data.price_per_sq} and go in the draw.`,
      data.org ? `Organised by ${data.org}.` : '',
    ].filter(Boolean).join(' ');

    const ogImage = data.image_url
      ? [{ url: data.image_url, width: 1200, height: 630, alt: title }]
      : [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Lucky Squares Australia' }];

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${SITE_URL}/${slug}`,
        siteName: 'Lucky Squares Australia',
        images: ogImage,
        type: 'website',
        locale: 'en_AU',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ogImage.map((i) => i.url),
      },
    };
  } catch {
    return {};
  }
}

export default function CampaignLayout({ children }) {
  return children;
}
