import { getAnonClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import MarketingNav from '@/components/marketing/MarketingNav';
import BlogShareButtons from '@/components/marketing/BlogShareButtons';
import Link from 'next/link';
import Image from 'next/image';

const SITE_URL = 'https://luckysquares.com.au';

export const dynamic = 'force-dynamic';

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderMarkdown(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith('### ')) {
      output.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      output.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      output.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
      i++; continue;
    }

    // Unordered list
    if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(`<li>${inlineMarkdown(lines[i].slice(2))}</li>`);
        i++;
      }
      output.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^\d+\.\s/, ''))}</li>`);
        i++;
      }
      output.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      output.push('<hr>');
      i++; continue;
    }

    // Blank line — paragraph break
    if (line.trim() === '') {
      i++; continue;
    }

    // Paragraph: collect consecutive non-empty, non-special lines
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('# ') &&
      !lines[i].startsWith('## ') &&
      !lines[i].startsWith('### ') &&
      !lines[i].startsWith('- ') &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      paraLines.push(inlineMarkdown(lines[i]));
      i++;
    }
    if (paraLines.length) {
      output.push(`<p>${paraLines.join('<br>')}</p>`);
    }
  }

  return output.join('\n');
}

function inlineMarkdown(text) {
  // Bold before italic so **bold** doesn't conflict
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

async function getPost(slug) {
  const supabase = getAnonClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  if (error) return null;
  return data;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post not found' };
  const ogImages = post.cover_image_url
    ? [{ url: post.cover_image_url, width: 1200, height: 630, alt: post.title }]
    : [{ url: '/og-default.png', width: 1200, height: 630, alt: post.title }];
  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: { canonical: `https://luckysquares.com.au/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: 'article',
      url: `https://luckysquares.com.au/blog/${slug}`,
      siteName: 'Lucky Squares Australia',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || undefined,
      images: [ogImages[0].url],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const html = renderMarkdown(post.content);
  const postUrl = `${SITE_URL}/blog/${slug}`;

  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
    ],
  };

  const blogPostingSchema = {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || undefined,
    url: postUrl,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: {
      '@type': 'Organization',
      name: 'Lucky Squares Australia',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Lucky Squares Australia',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/og-default.png`,
      },
    },
    ...(post.cover_image_url && {
      image: {
        '@type': 'ImageObject',
        url: post.cover_image_url,
        width: 1200,
        height: 630,
      },
    }),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': [blogPostingSchema, breadcrumbSchema] }) }}
      />
      <MarketingNav />

      {post.cover_image_url && (
        <div style={{ width: '100%', height: 480, overflow: 'hidden', background: '#1A1209', position: 'relative' }}>
          <Image
            src={post.cover_image_url}
            alt={post.title}
            fill
            sizes="100vw"
            priority
            style={{ objectFit: 'cover', opacity: .92 }}
          />
        </div>
      )}

      <section className={post.cover_image_url ? 'section' : 'section dot-bg'} style={{ paddingTop: post.cover_image_url ? 48 : 80, paddingBottom: 16 }}>
        <div className="section-inner" style={{ maxWidth: 760 }}>
          <Link href="/blog" style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
            ← Back to Blog
          </Link>

          {post.tags && post.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {post.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5,
                  background: 'rgba(0,169,110,.1)', color: 'var(--green)',
                  borderRadius: 4, padding: '2px 8px',
                }}>{tag}</span>
              ))}
            </div>
          )}

          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 20, color: 'var(--text)' }}>
            {post.title}
          </h1>

          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 40, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
                {post.author.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{post.author}</div>
                {post.published_at && (
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(post.published_at)}</div>
                )}
              </div>
            </div>
            <BlogShareButtons url={postUrl} title={post.title} />
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--cream)', paddingTop: 0, paddingBottom: 80 }}>
        <div className="section-inner" style={{ maxWidth: 760 }}>
          <style>{`
            .blog-content { color: var(--text); }
            .blog-content h1 { font-family: var(--font-serif); font-size: 32px; font-weight: 900; line-height: 1.25; margin: 40px 0 16px; color: var(--text); }
            .blog-content h2 { font-family: var(--font-serif); font-size: 24px; font-weight: 800; line-height: 1.3; margin: 36px 0 14px; color: var(--text); }
            .blog-content h3 { font-family: var(--font-serif); font-size: 19px; font-weight: 800; line-height: 1.35; margin: 28px 0 10px; color: var(--text); }
            .blog-content p { font-size: 17px; line-height: 1.8; margin: 0 0 20px; color: var(--text); }
            .blog-content ul, .blog-content ol { font-size: 17px; line-height: 1.8; margin: 0 0 20px; padding-left: 28px; color: var(--text); }
            .blog-content li { margin-bottom: 8px; }
            .blog-content strong { font-weight: 800; }
            .blog-content em { font-style: italic; }
            .blog-content hr { border: none; border-top: 1px solid var(--border); margin: 36px 0; }
          `}</style>
          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <FundraisingCTA />
          <RelatedLinks tags={post.tags} />

          <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
                Found this useful? Share it with your club or community.
              </p>
              <BlogShareButtons url={postUrl} title={post.title} />
            </div>
            <Link href="/blog" style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ← Back to Blog
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// ── Fundraising CTA ──────────────────────────────────────────────────────────

function FundraisingCTA() {
  return (
    <div style={{
      marginTop: 48,
      padding: '36px 40px',
      background: 'linear-gradient(135deg, #f5f0ff 0%, #ede8ff 100%)',
      borderRadius: 'var(--radius)',
      border: '1.5px solid #d4c6ff',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🍀</div>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', marginBottom: 10, lineHeight: 1.3 }}>
        Ready to run your own Lucky Squares fundraiser?
      </h3>
      <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
        Set up your grid in under five minutes, share the link with your community, and run a live draw when you&apos;re ready. No spreadsheets, no stress.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/fundraise?register=1" className="btn btn-purple btn-lg">
          Start your fundraiser free →
        </Link>
        <Link href="/how-it-works" className="btn btn-outline btn-lg">
          See how it works
        </Link>
      </div>
    </div>
  );
}

// ── Related internal links ────────────────────────────────────────────────────

const ALL_LINKS = [
  { key: 'how-it-works', title: 'How it works', desc: 'Set up your fundraiser grid in under five minutes.', href: '/how-it-works', tags: ['fundraising', 'lucky-squares', 'community', 'sport', 'education', 'volunteers', 'digital', 'marketing', 'planning'] },
  { key: 'faq',          title: 'Frequently asked questions', desc: 'Everything organisers and participants need to know.', href: '/faq', tags: ['fundraising', 'lucky-squares', 'community', 'sport', 'education', 'volunteers', 'planning'] },
  { key: 'compliance',   title: 'Raffle compliance guide', desc: 'State-by-state permit requirements for Australian fundraisers.', href: '/raffle-compliance', tags: ['planning', 'fundraising', 'community', 'education', 'volunteers'] },
  { key: 'start',        title: 'Start a fundraiser free', desc: 'No credit card needed. Launch your first campaign today.', href: '/fundraise?register=1', tags: ['fundraising', 'lucky-squares', 'community', 'sport', 'education', 'volunteers', 'digital', 'marketing', 'sponsorship'] },
];

function RelatedLinks({ tags = [] }) {
  // Pick up to 3 links whose tag list overlaps with the post's tags, favouring variety
  const postTags = tags.map((t) => t.toLowerCase());
  const matched = ALL_LINKS.filter((l) => l.tags.some((t) => postTags.includes(t)));
  // Fall back to first 3 if no tag overlap (shouldn't happen)
  const links = (matched.length >= 2 ? matched : ALL_LINKS).slice(0, 3);

  return (
    <div style={{ marginTop: 48, padding: '28px 32px', background: '#fff', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text2)', marginBottom: 16 }}>Keep exploring</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {links.map((l) => (
          <Link
            key={l.key}
            href={l.href}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'var(--cream)', borderRadius: 10, border: '1px solid var(--border)', textDecoration: 'none' }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{l.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{l.desc}</div>
            </div>
            <span style={{ color: 'var(--green)', fontWeight: 900, fontSize: 18, flexShrink: 0 }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
