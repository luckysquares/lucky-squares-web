import { getAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

function fmtAud(cents) {
  return (cents / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

function fmtDate(iso) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtDateTime(iso) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
}

export async function generateMetadata() {
  return { title: 'Draw Integrity Certificate — Lucky Squares' };
}

export default async function CertificatePage({ params }) {
  const { id } = await params;
  const db = getAdminClient();

  const { data: fundraiser, error: frErr } = await db
    .from('fundraisers')
    .select('id, title, org, status, grid_size, price_per_sq, launched_at, draw_date, contact_name, payment_method, prize_reserve_cents')
    .eq('id', id)
    .single();

  if (frErr || !fundraiser || fundraiser.status !== 'drawn') {
    notFound();
  }

  const { count: soldCount } = await db
    .from('squares')
    .select('id', { count: 'exact', head: true })
    .eq('fundraiser_id', id)
    .eq('paid', true);

  const { data: prizes } = await db
    .from('prizes')
    .select('place, description, value, donated, sort_order')
    .eq('fundraiser_id', id)
    .order('sort_order', { ascending: true });

  const { data: claims } = await db
    .from('prize_claims')
    .select('place, buyer_name, prize_description, status')
    .eq('fundraiser_id', id);

  const claimByPlace = {};
  for (const c of claims ?? []) claimByPlace[c.place] = c;

  const priceCents   = Math.round(parseFloat(fundraiser.price_per_sq || 0) * 100);
  const grossCents   = (soldCount || 0) * priceCents;
  const reserveCents = fundraiser.prize_reserve_cents || 0;
  const soldFraction = fundraiser.grid_size > 0
    ? Math.round(((soldCount || 0) / fundraiser.grid_size) * 100)
    : 0;
  const certId       = `CERT-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const issuedAt     = new Date().toISOString();
  const activePrizes = (prizes ?? []).filter((p) => p.description);

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    /* ── Screen styles ─────────────────────────────────────────────── */
    .cert-page{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#F5F3EE;color:#1A1209;padding:32px 16px 80px;min-height:100vh}
    .cert{max-width:720px;margin:0 auto;background:#fff;border:2px solid #E5E0D5;border-radius:16px;padding:44px 52px;box-shadow:0 4px 24px rgba(61,46,26,.10)}
    .hd{text-align:center;border-bottom:2px solid #E5E0D5;padding-bottom:22px;margin-bottom:22px}
    .hd-emoji{font-size:32px;display:block;margin-bottom:4px}
    .hd-name{font-size:18px;font-weight:900;letter-spacing:-.5px}
    .hd-sub{font-size:10px;font-weight:700;color:#6B7280;letter-spacing:2px;text-transform:uppercase;margin-top:2px}
    .cert-title{font-size:24px;font-weight:900;color:#7C3AED;margin:16px 0 4px;letter-spacing:-.5px}
    .cert-sub{font-size:12px;color:#9C8060;font-weight:600;letter-spacing:.5px}
    .sec{margin-bottom:20px}
    .sec-lbl{font-size:10px;font-weight:800;color:#9C8060;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #F0EAE0}
    .kv{display:grid;grid-template-columns:160px 1fr;gap:4px 16px}
    .kv-k{font-size:12px;color:#9C8060;font-weight:600}
    .kv-v{font-size:12px;color:#1A1209;font-weight:700}
    .fboxes{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
    .fbox{background:#F5F3EE;border-radius:10px;padding:12px 14px;text-align:center}
    .fbox-lbl{font-size:10px;font-weight:700;color:#9C8060;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:3px}
    .fbox-val{font-size:16px;font-weight:900;color:#16A34A}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{text-align:left;font-size:10px;font-weight:800;color:#9C8060;text-transform:uppercase;letter-spacing:1.2px;padding:0 12px 7px 0;border-bottom:1px solid #E5E0D5}
    td{padding:7px 12px 7px 0;border-bottom:1px solid #F5F3EE;vertical-align:top}
    .badge{display:inline-block;background:#F5F0FF;color:#7C3AED;font-weight:800;font-size:11px;padding:2px 8px;border-radius:99px}
    .attest{background:#F5F0FF;border:1.5px solid #DDD6FE;border-radius:10px;padding:13px 18px;font-size:11.5px;line-height:1.6;color:#4A3728}
    .footer{margin-top:20px;padding-top:14px;border-top:1px solid #E5E0D5;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#9C8060}
    .cert-id{font-family:monospace;font-size:12px;font-weight:800;color:#7C3AED;letter-spacing:1px}
    .print-btn{display:block;margin:24px auto 0;max-width:720px;background:#7C3AED;color:#fff;border:none;border-radius:10px;padding:14px 28px;font-size:15px;font-weight:800;cursor:pointer;text-align:center;font-family:inherit;width:100%}
    .print-btn:hover{background:#6D28D9}
    /* ── Print: single A4 page, full colour ───────────────────────── */
    @page{size:A4 portrait;margin:12mm}
    @media print{
      /* Preserve all background colours and images exactly as on screen */
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
      /* Hide everything except the certificate — catches any injected
         widgets, analytics, or layout chrome that could overflow */
      body>*{display:none!important}
      body>.cert-page{display:block!important}
      /* Let the content be its natural height — no forced min-height that
         could overflow Safari's reduced content area when headers/footers
         are enabled. page-break-inside:avoid keeps the cert in one piece. */
      html,body{min-height:0!important;overflow:visible!important}
      .cert-page{background:#F5F3EE;padding:0;min-height:0}
      .cert{box-shadow:none;border-radius:8px;padding:28px 38px;max-width:100%;margin:0;page-break-inside:avoid;break-inside:avoid}
      .print-btn{display:none!important}
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="cert-page">
        <div className="cert">

          {/* Header */}
          <div className="hd">
            <span className="hd-emoji">🍀</span>
            <div className="hd-name">Lucky Squares</div>
            <div className="hd-sub">Australia</div>
            <div className="cert-title">Draw Integrity Certificate</div>
            <div className="cert-sub">
              Confirming this draw was conducted through the Lucky Squares platform
            </div>
          </div>

          {/* Campaign details */}
          <div className="sec">
            <div className="sec-lbl">Campaign Details</div>
            <div className="kv">
              <span className="kv-k">Campaign</span>
              <span className="kv-v">{fundraiser.title}</span>
              <span className="kv-k">Organisation</span>
              <span className="kv-v">{fundraiser.org}</span>
              <span className="kv-k">Organiser</span>
              <span className="kv-v">{fundraiser.contact_name}</span>
              <span className="kv-k">Launched</span>
              <span className="kv-v">{fmtDate(fundraiser.launched_at)}</span>
              <span className="kv-k">Draw date</span>
              <span className="kv-v">{fmtDate(fundraiser.draw_date)}</span>
              <span className="kv-k">Grid</span>
              <span className="kv-v">{fundraiser.grid_size} squares at {fmtAud(priceCents)} per square</span>
              <span className="kv-k">Squares sold</span>
              <span className="kv-v">{soldCount ?? 0} of {fundraiser.grid_size} ({soldFraction}% fill rate)</span>
            </div>
          </div>

          {/* Financial summary */}
          <div className="sec">
            <div className="sec-lbl">Financial Summary</div>
            <div className="fboxes">
              <div className="fbox">
                <div className="fbox-lbl">Total raised</div>
                <div className="fbox-val">{fmtAud(grossCents)}</div>
              </div>
              <div className="fbox">
                <div className="fbox-lbl">Squares sold</div>
                <div className="fbox-val" style={{ color: '#7C3AED' }}>{soldCount ?? 0}</div>
              </div>
              <div className="fbox">
                <div className="fbox-lbl">Prize pool</div>
                <div className="fbox-val" style={{ color: '#F59E0B' }}>{fmtAud(reserveCents)}</div>
              </div>
            </div>
          </div>

          {/* Prizes and winners */}
          {activePrizes.length > 0 && (
            <div className="sec">
              <div className="sec-lbl">Prizes and Winners</div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>Place</th>
                    <th>Prize</th>
                    <th>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {activePrizes.map((p, i) => {
                    const claim = claimByPlace[p.place];
                    const valueStr = p.donated ? ' (donated prize)' : p.value ? ` — ${p.value}` : '';
                    return (
                      <tr key={i}>
                        <td><span className="badge">{p.place}</span></td>
                        <td style={{ color: '#4A3728' }}>{p.description}{valueStr}</td>
                        <td>
                          {claim
                            ? <strong style={{ color: '#1A1209' }}>{claim.buyer_name}</strong>
                            : <span style={{ color: '#9C8060', fontStyle: 'italic' }}>Pending claim</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Attestation */}
          <div className="sec">
            <div className="sec-lbl">Platform Attestation</div>
            <div className="attest">
              Lucky Squares Australia confirms that the draw for <strong>{fundraiser.title}</strong>{' '}
              ({fundraiser.org}) was conducted using the Lucky Squares platform.
              Winner selection was performed by the campaign organiser through the Lucky Squares draw
              interface. All participant registrations, payment records and winner selections are
              recorded in the Lucky Squares platform and are available for review upon request.
              This certificate may be shared with participants as evidence of a transparent draw process.
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <div>
              <div className="cert-id">{certId}</div>
              <div style={{ marginTop: 3 }}>Issued {fmtDateTime(issuedAt)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700 }}>Lucky Squares Australia</div>
              <div>luckysquares.com.au</div>
            </div>
          </div>

        </div>

        {/* Print button — hidden in print */}
        <PrintButton />
      </div>
    </>
  );
}
