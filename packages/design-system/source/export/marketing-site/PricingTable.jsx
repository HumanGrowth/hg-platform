// Pricing — Personal / Team / Enterprise with monthly/annual toggle
function PricingTable() {
  const [annual, setAnnual] = React.useState(true);

  const tiers = [
    {
      name: 'Personal',
      tagline: 'For one learner — anyone with growth budget.',
      monthly: 24, annual: 19,
      features: ['All paths + library', 'Badges + verified credentials', '1 mentor session / quarter', 'Replays of all talks', 'Mobile + web'],
      cta: 'Start free trial',
    },
    {
      name: 'Team',
      tagline: 'For 5–500 people. Manager dashboards included.',
      monthly: 39, annual: 32, perSeat: true,
      features: ['Everything in Personal', 'Manager view: who is learning what', 'Custom learning paths', '4 mentor sessions / quarter / seat', 'Slack + email digests', 'SSO + SCIM'],
      cta: 'Talk to sales',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      tagline: 'For 500+ people. Bespoke paths and partner mentors.',
      monthly: null,
      features: ['Everything in Team', 'Dedicated CSM + onboarding', 'Custom mentor sourcing', 'Audit log + reporting API', 'Private cohorts', 'Procurement support'],
      cta: 'Talk to sales',
    },
  ];

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 48 }}>
        <div className="eyebrow eyebrow-accent" style={{ marginBottom: 16 }}>PRICING</div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 64, lineHeight: 0.95,
          textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, maxWidth: 760,
        }}>
          Pay for use, not for a catalog
        </h2>
        <div style={{ marginTop: 24, display: 'inline-flex', background: 'var(--cream-200)', borderRadius: 8, padding: 3 }}>
          {[['Monthly', false], ['Annual (save 20%)', true]].map(([label, val]) => (
            <button key={label}
              onClick={() => setAnnual(val)}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600, border: 0, cursor: 'pointer',
                background: annual === val ? 'var(--cream-50)' : 'transparent',
                color: annual === val ? 'var(--warm-900)' : 'var(--fg-muted)',
                borderRadius: 6, boxShadow: annual === val ? 'var(--shadow-sm)' : 'none',
                fontFamily: 'var(--font-body)',
              }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {tiers.map((t, i) => {
          const price = annual ? t.annual : t.monthly;
          return (
            <div key={i} style={{
              background: t.highlighted ? 'var(--warm-900)' : 'var(--cream-100)',
              color: t.highlighted ? 'var(--cream-100)' : 'var(--warm-900)',
              border: t.highlighted ? 'none' : '1px solid var(--border)',
              borderRadius: 16, padding: 32,
              display: 'flex', flexDirection: 'column', gap: 18,
              position: 'relative',
            }}>
              {t.highlighted && (
                <div style={{
                  position: 'absolute', top: -12, left: 24,
                  background: 'var(--orange-500)', color: '#fff',
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '4px 10px', borderRadius: 4,
                }}>Most teams pick this</div>
              )}
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 0.95,
                  textTransform: 'uppercase', letterSpacing: '-0.01em',
                }}>{t.name}</div>
                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: t.highlighted ? '#B8A799' : 'var(--warm-600)' }}>
                  {t.tagline}
                </div>
              </div>
              <div style={{ borderTop: t.highlighted ? '1px solid rgba(245,235,214,0.15)' : '1px solid var(--border)', paddingTop: 18 }}>
                {price !== null ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 64, lineHeight: 0.9,
                    }}>${price}</span>
                    <span style={{ fontSize: 14, color: t.highlighted ? '#B8A799' : 'var(--fg-muted)' }}>
                      / {t.perSeat ? 'seat / month' : 'month'}
                    </span>
                  </div>
                ) : (
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 0.95,
                  }}>Let’s talk</div>
                )}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {t.features.map(f => (
                  <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
                    <span style={{ color: t.highlighted ? 'var(--orange-300)' : 'var(--orange-500)', fontWeight: 700, marginTop: 1 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button style={{
                background: t.highlighted ? 'var(--orange-500)' : 'var(--warm-900)',
                color: t.highlighted ? '#fff' : 'var(--cream-100)',
                border: 0, padding: '14px 22px', borderRadius: 8,
                fontWeight: 600, fontSize: 15, cursor: 'pointer', marginTop: 'auto',
                fontFamily: 'var(--font-body)',
              }}>{t.cta}  →</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

window.PricingTable = PricingTable;
