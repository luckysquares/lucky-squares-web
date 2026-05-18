import { createClient } from '@supabase/supabase-js';
import MarketingNav from '@/components/marketing/MarketingNav';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Blog | LuckySquares Australia',
  description: 'Tips, stories and inspiration for community fundraisers across Australia.',
};

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
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

function categoryEmoji(tag) {
  const map = {
    'lucky-squares': '🍀',
    fundraising: '💡',
    sport: '⚽',
    community: '🤝',
    marketing: '📢',
    education: '📚',
    digital: '💻',
    volunteers: '🙋',
    planning: '📅',
    sponsorship: '🤝',
  };
  return map[tag] ?? '📌';
}

function CompactCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow .15s',
      }}>
        {post.cover_image_url && (
          <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: 'var(--border)', flexShrink: 0, position: 'relative' }}>
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              style={{ objectFit: 'cover' }}
              loading="lazy"
            />
          </div>
        )}
        <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {post.tags?.[0] && (
            <TagPill tag={post.tags[0]} />
          )}
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 17, fontWeight: 800, lineHeight: 1.3,
            color: 'var(--text)', margin: 0, flex: 1,
          }}>{post.title}</h3>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, marginTop: 'auto' }}>
            {fmtDate(post.published_at)}
          </div>
        </div>
      </article>
    </Link>
  );
}

export default async function BlogPage() {
  const posts = await getPosts();

  if (posts.length === 0) {
    return (
      <>
        <MarketingNav />
        <div style={{ textAlign: 'center', padding: '120px 24px' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>📝</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900, marginBottom: 10, color: 'var(--text)' }}>Coming soon</h2>
          <p style={{ color: 'var(--text2)', fontSize: 16, maxWidth: 400, margin: '0 auto' }}>
            We are working on articles to help you run better fundraisers. Check back soon.
          </p>
        </div>
      </>
    );
  }

  // Partition posts
  const featured = posts[0];
  const popular = posts.slice(1, 5);
  const remaining = posts.slice(5);
  const trending = posts.slice(1, 7);

  // Group remaining by first tag
  const categoryMap = {};
  for (const post of remaining) {
    const tag = post.tags?.[0];
    if (!tag) continue;
    if (!categoryMap[tag]) categoryMap[tag] = [];
    categoryMap[tag].push(post);
  }
  const categories = Object.entries(categoryMap);

  // Fundraising resources (from all posts)
  const resourcePosts = posts.filter(p =>
    p.tags?.includes('lucky-squares') || p.tags?.includes('fundraising')
  ).slice(0, 6);

  return (
    <>
      <MarketingNav />

      {/* Hero strip */}
      <div className="section-hero-bg" style={{ paddingTop: 56, paddingBottom: 0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px 32px' }}>
          <div className="section-label">Blog</div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(26px, 4vw, 42px)',
            fontWeight: 900,
            lineHeight: 1.2,
            color: 'var(--text)',
            margin: '10px 0 0',
            maxWidth: 700,
          }}>
            Stories, tips and resources for Australian community fundraisers
          </h1>
        </div>
      </div>

      {/* Main two-column layout */}
      <div style={{ background: 'var(--cream)' }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '40px 28px 80px',
          display: 'flex', gap: 48, flexWrap: 'wrap', alignItems: 'flex-start',
        }}>

          {/* Left column: main content */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>

            {/* Featured hero post */}
            <Link href={`/blog/${featured.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: 48 }}>
              <article style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow)',
                overflow: 'hidden',
              }}>
                {featured.cover_image_url && (
                  <div style={{ aspectRatio: '16/7', overflow: 'hidden', background: 'var(--border)', position: 'relative' }}>
                    <Image
                      src={featured.cover_image_url}
                      alt={featured.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 800px"
                      style={{ objectFit: 'cover' }}
                      priority
                    />
                  </div>
                )}
                <div style={{ padding: '28px 32px 32px' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    {featured.tags?.slice(0, 3).map((t) => <TagPill key={t} tag={t} />)}
                  </div>
                  <h2 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(26px, 4vw, 36px)',
                    fontWeight: 900, lineHeight: 1.2,
                    color: 'var(--text)', margin: '0 0 14px',
                  }}>{featured.title}</h2>
                  {featured.excerpt && (
                    <p style={{
                      fontSize: 16, color: 'var(--text2)', lineHeight: 1.7,
                      margin: '0 0 20px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {featured.excerpt}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: 'var(--purple-light)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 900, color: 'var(--purple)',
                      flexShrink: 0,
                    }}>
                      {featured.author?.[0]?.toUpperCase() ?? 'L'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{featured.author || 'LuckySquares'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(featured.published_at)}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 800, color: 'var(--purple)' }}>Read article →</span>
                  </div>
                </div>
              </article>
            </Link>

            {/* Most popular */}
            {popular.length > 0 && (
              <div style={{ marginBottom: 52 }}>
                <div style={{
                  fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2,
                  color: 'var(--text3)', marginBottom: 16,
                  paddingBottom: 10, borderBottom: '2px solid var(--text)',
                  display: 'inline-block',
                }}>Most popular</div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 20,
                }}>
                  {popular.map((post) => (
                    <CompactCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}

            {/* Category sections */}
            {categories.map(([tag, catPosts]) => (
              <div key={tag} style={{ marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
                    {categoryEmoji(tag)}&nbsp; {tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' ')}
                  </div>
                  <a href="#all-articles" style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)', textDecoration: 'none' }}>
                    View all →
                  </a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {catPosts.slice(0, 3).map((post) => (
                    <CompactCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            ))}

            {/* Fundraising resources */}
            {resourcePosts.length > 0 && (
              <div style={{ marginBottom: 52 }}>
                <div style={{
                  background: '#F0FDF8',
                  border: '1.5px solid #B6EDD8',
                  borderRadius: 'var(--radius-lg)',
                  padding: '32px 36px',
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2,
                    color: '#22a06b', marginBottom: 8,
                  }}>Fundraising Toolkit</div>
                  <h2 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 22, fontWeight: 900, color: 'var(--text)',
                    margin: '0 0 24px', lineHeight: 1.25,
                  }}>Lucky Squares Fundraising Resources</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {resourcePosts.map((post) => {
                      const emoji = categoryEmoji(post.tags?.[0]);
                      const snippet = post.excerpt ? (post.excerpt.length > 80 ? post.excerpt.slice(0, 80) + '…' : post.excerpt) : '';
                      return (
                        <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{
                            background: '#fff',
                            borderRadius: 'var(--radius)',
                            border: '1px solid #B6EDD8',
                            padding: '16px 18px',
                            display: 'flex', flexDirection: 'column', gap: 6,
                            height: '100%',
                          }}>
                            <div style={{ fontSize: 22 }}>{emoji}</div>
                            <div style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3,
                            }}>{post.title}</div>
                            {snippet && (
                              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>{snippet}</div>
                            )}
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>Read →</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* All articles */}
            <div id="all-articles">
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 28 }} />
              <div style={{
                fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2,
                color: 'var(--text3)', marginBottom: 20,
              }}>All articles</div>
              <div>
                {posts.map((post, i) => (
                  <div
                    key={post.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 16,
                      padding: '14px 0',
                      borderBottom: i < posts.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{
                      width: 70, flexShrink: 0,
                      fontSize: 12, color: 'var(--text3)', fontWeight: 500,
                      textAlign: 'right', paddingTop: 2, lineHeight: 1.4,
                    }}>
                      {fmtDate(post.published_at)}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                        <span style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 16, fontWeight: 800, color: 'var(--text)', lineHeight: 1.35,
                        }}>
                          {post.title}
                        </span>
                      </Link>
                      {post.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {post.tags.slice(0, 3).map((t) => (
                            <span key={t} style={{
                              fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8,
                              background: 'var(--purple-light)', color: 'var(--purple)',
                              borderRadius: 3, padding: '2px 7px',
                            }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right sidebar */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Trending */}
              {trending.length > 0 && (
                <div className="scratch-card" style={{ padding: '22px 24px' }}>
                  <div style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 17, fontWeight: 900, color: 'var(--text)',
                    marginBottom: 16,
                  }}>
                    🔥 Trending
                  </div>
                  <div>
                    {trending.map((post, i) => (
                      <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{
                          display: 'flex', gap: 14, alignItems: 'flex-start',
                          padding: '14px 0',
                          borderBottom: i < trending.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                          <div style={{
                            fontSize: 32, fontWeight: 900, color: 'var(--border2)',
                            lineHeight: 1, flexShrink: 0, minWidth: 34,
                          }}>
                            {String(i + 1).padStart(2, '0')}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: 14, fontWeight: 800, color: 'var(--text)', lineHeight: 1.35,
                            }}>{post.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(post.published_at)}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Start your fundraiser CTA */}
              <div style={{
                background: '#F0FDF8',
                border: '1.5px solid #B6EDD8',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 24px 28px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🍀</div>
                <div style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 18, fontWeight: 900, color: 'var(--text)',
                  marginBottom: 8, lineHeight: 1.25,
                }}>Ready to fundraise?</div>
                <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 18px' }}>
                  Set up your Lucky Squares board in minutes and start raising money for your community.
                </p>
                <Link href="/fundraise?register=1" className="btn btn-purple" style={{ display: 'block', textAlign: 'center' }}>
                  Start for free →
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}
