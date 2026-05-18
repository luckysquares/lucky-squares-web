import { createClient } from '@supabase/supabase-js';
import MarketingNav from '@/components/marketing/MarketingNav';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

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
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

function TagPill({ tag }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1,
      background: 'var(--purple-light)', color: 'var(--purple)',
      borderRadius: 4, padding: '3px 9px', display: 'inline-block',
    }}>{tag}</span>
  );
}

export default async function BlogPage() {
  const posts = await getPosts();
  const [featured, ...rest] = posts;

  return (
    <>
      <MarketingNav />

      <section className="section section-hero-bg" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Resources</div>
          <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>Blog</h1>
          <p className="section-body" style={{ margin: '0 auto' }}>
            Tips, stories and inspiration for community fundraisers across Australia.
          </p>
        </div>
      </section>

      <section className="section section-solid-bg" style={{ paddingTop: 0, paddingBottom: 80 }}>
        <div className="section-inner" style={{ maxWidth: 860 }}>

          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Coming soon</h2>
              <p style={{ color: 'var(--text2)', fontSize: 15 }}>
                We are working on articles to help you run better fundraisers. Check back soon.
              </p>
            </div>
          ) : (
            <div>

              {/* Featured post */}
              <Link href={`/blog/${featured.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: 48 }}>
                <article style={{
                  background: '#fff',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--border)',
                  boxShadow: 'var(--shadow)',
                  overflow: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: featured.cover_image_url ? '1fr 1fr' : '1fr',
                  minHeight: 300,
                  transition: 'box-shadow .15s, transform .15s',
                }}>
                  {featured.cover_image_url && (
                    <div style={{ background: 'var(--border)', overflow: 'hidden' }}>
                      <img
                        src={featured.cover_image_url}
                        alt={featured.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  )}
                  <div style={{ padding: '40px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5,
                        color: 'var(--green)', display: 'inline-block', marginBottom: 2,
                      }}>Featured</span>
                      {featured.tags?.slice(0, 2).map((t) => <TagPill key={t} tag={t} />)}
                    </div>
                    <h2 style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 'clamp(22px, 3vw, 30px)',
                      fontWeight: 900, lineHeight: 1.25,
                      color: 'var(--text)', margin: '0 0 14px',
                    }}>{featured.title}</h2>
                    {featured.excerpt && (
                      <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, margin: '0 0 24px' }}>
                        {featured.excerpt}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--purple-light)', border: '2px solid var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--purple)' }}>
                        {featured.author?.[0] ?? 'L'}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{featured.author}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(featured.published_at)}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 800, color: 'var(--purple)' }}>Read article →</span>
                    </div>
                  </div>
                </article>
              </Link>

              {/* Article list */}
              {rest.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text3)', marginBottom: 20, paddingBottom: 12, borderBottom: '2px solid var(--text)' }}>
                    More articles
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {rest.map((post, i) => (
                      <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <article style={{
                          display: 'grid',
                          gridTemplateColumns: post.cover_image_url ? '120px 1fr' : '1fr',
                          gap: 24,
                          padding: '24px 0',
                          borderBottom: i < rest.length - 1 ? '1px solid var(--border)' : 'none',
                          alignItems: 'center',
                        }}>
                          {post.cover_image_url && (
                            <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3', background: 'var(--border)' }}>
                              <img src={post.cover_image_url} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </div>
                          )}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{fmtDate(post.published_at)}</span>
                              {post.tags?.slice(0, 2).map((t) => <TagPill key={t} tag={t} />)}
                            </div>
                            <h3 style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: 19, fontWeight: 900,
                              color: 'var(--text)', lineHeight: 1.3,
                              margin: '0 0 8px',
                            }}>{post.title}</h3>
                            {post.excerpt && (
                              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, margin: '0 0 10px' }}>
                                {post.excerpt.length > 160 ? post.excerpt.slice(0, 160) + '…' : post.excerpt}
                              </p>
                            )}
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>Read more →</span>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </section>
    </>
  );
}
