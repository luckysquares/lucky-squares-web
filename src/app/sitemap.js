import { getAdminClient as getSupabase } from '@/lib/supabase/server';

const SITE_URL = 'https://luckysquares.com.au';
export default async function sitemap() {
  const staticPages = [
    { url: SITE_URL,                              priority: 1.0,  changeFrequency: 'weekly'  },
    { url: `${SITE_URL}/how-it-works`,            priority: 0.9,  changeFrequency: 'monthly' },
    { url: `${SITE_URL}/pricing`,                 priority: 0.9,  changeFrequency: 'monthly' },
    { url: `${SITE_URL}/fundraise`,               priority: 0.8,  changeFrequency: 'monthly' },
    { url: `${SITE_URL}/org-signup`,              priority: 0.8,  changeFrequency: 'monthly' },
    { url: `${SITE_URL}/feeling-lucky`,           priority: 0.7,  changeFrequency: 'daily'   },
    { url: `${SITE_URL}/blog`,                    priority: 0.8,  changeFrequency: 'weekly'  },
    { url: `${SITE_URL}/faq`,                     priority: 0.7,  changeFrequency: 'monthly' },
    { url: `${SITE_URL}/contact`,                 priority: 0.6,  changeFrequency: 'yearly'  },
    { url: `${SITE_URL}/raffle-compliance`,       priority: 0.6,  changeFrequency: 'monthly' },
    { url: `${SITE_URL}/fair-play`,               priority: 0.5,  changeFrequency: 'yearly'  },
    { url: `${SITE_URL}/privacy`,                 priority: 0.3,  changeFrequency: 'yearly'  },
    { url: `${SITE_URL}/terms`,                   priority: 0.3,  changeFrequency: 'yearly'  },
    { url: `${SITE_URL}/participant-terms`,       priority: 0.3,  changeFrequency: 'yearly'  },
  ];

  // Fetch published blog posts
  let blogEntries = [];
  try {
    const supabase = getSupabase();
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    blogEntries = (posts || []).map((post) => ({
      url:             `${SITE_URL}/blog/${post.slug}`,
      lastModified:    new Date(post.updated_at),
      priority:        0.7,
      changeFrequency: 'monthly',
    }));
  } catch {
    // Silently skip if DB unavailable during build
  }

  return [
    ...staticPages.map((p) => ({ ...p, lastModified: new Date() })),
    ...blogEntries,
  ];
}
