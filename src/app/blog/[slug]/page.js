import { createClient } from '@supabase/supabase-js';
import MarketingNav from '@/components/marketing/MarketingNav';
import Link from 'next/link';

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);
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
    return (
      <>
        <MarketingNav />
        <section className="section dot-bg" style={{ paddingTop: 80, paddingBottom: 80, minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
          <div className="section-inner" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>Post not found</h1>
            <p className="section-body" style={{ margin: '0 auto 32px' }}>
              This article does not exist or has not been published yet.
            </p>
            <Link href="/blog" className="btn btn-primary">Back to Blog</Link>
          </div>
        </section>
      </>
    );
  }

  const html = renderMarkdown(post.content);

  return (
    <>
      <MarketingNav />

      {post.cover_image_url && (
        <div style={{ width: '100%', maxHeight: 480, overflow: 'hidden', background: '#1A1209' }}>
          <img
            src={post.cover_image_url}
            alt={post.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: .92 }}
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

          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 40, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
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

          <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
            <Link href="/blog" style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ← Back to Blog
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
