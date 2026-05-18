import { createClient } from '@supabase/supabase-js';
import MarketingNav from '@/components/marketing/MarketingNav';
import Link from 'next/link';

export const revalidate = 60;

export const metadata = {
  title: 'Blog | LuckySquares Australia',
  description: 'Tips, stories and inspiration for community fundraisers across Australia.',
};

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function getPosts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, author, cover_image_url, tags, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) { console.error('[blog/page]', error.message); return []; }
  return data ?? [];
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <>
      <MarketingNav />

      <section className="section dot-bg" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Resources</div>
          <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>Blog</h1>
          <p className="section-body" style={{ margin: '0 auto' }}>
            Tips, stories and inspiration for community fundraisers across Australia.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--cream)', paddingTop: 0, paddingBottom: 80 }}>
        <div className="section-inner">

          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Coming soon</h2>
              <p style={{ color: 'var(--text2)', fontSize: 15 }}>
                We are working on articles to help you run better fundraisers. Check back soon.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 28,
            }}>
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
                >
                  <article className="scratch-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%', transition: 'box-shadow .15s', cursor: 'pointer' }}>
                    {post.cover_image_url && (
                      <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--border)' }}>
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    )}
                    <div style={{ padding: '24px 24px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {post.tags && post.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                          {post.tags.slice(0, 3).map((tag) => (
                            <span key={tag} style={{
                              fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5,
                              background: 'rgba(0,169,110,.1)', color: 'var(--green)',
                              borderRadius: 4, padding: '2px 8px',
                            }}>{tag}</span>
                          ))}
                        </div>
                      )}
                      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 900, lineHeight: 1.3, marginBottom: 10, color: 'var(--text)' }}>
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16, flex: 1 }}>
                          {post.excerpt}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{post.author}</span>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(post.published_at)}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
