// Features — what the platform offers
function Features() {
  const items = [
    {
      eyebrow: '01 · PATHS',
      title: 'Curated journeys you finish',
      body: 'Short, focused tracks built by people who shipped the thing. Not a syllabus — a sequence with reps.',
      stat: '120+ paths',
    },
    {
      eyebrow: '02 · MENTORSHIPS',
      title: 'Talk to people who did it',
      body: '1:1 and small-group sessions, matched on the actual problem you are solving this quarter.',
      stat: '60+ mentors',
    },
    {
      eyebrow: '03 · BADGES',
      title: 'Proof your manager cares about',
      body: 'Skill-based credentials that travel with you, not vanity certificates. Verified at completion.',
      stat: '40+ badges',
    },
    {
      eyebrow: '04 · TALKS & EVENTS',
      title: 'Live, not recorded',
      body: 'Quarterly summits, monthly office hours, weekly study groups. On-demand replays for everything.',
      stat: '12 / month',
    },
  ];

  return (
    <section style={{ background: 'var(--cream-50)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 64, flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div className="eyebrow eyebrow-accent" style={{ marginBottom: 16 }}>WHAT IS HERE</div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 64, lineHeight: 0.95,
              textTransform: 'uppercase', letterSpacing: '-0.02em',
              color: 'var(--warm-900)', margin: 0, maxWidth: 720,
            }}>
              Four ways to grow.<br />One place to track it.
            </h2>
          </div>
          <a href="#" className="accent" style={{ color: 'var(--orange-700)', fontWeight: 600, borderBottom: '1px solid var(--orange-700)', paddingBottom: 2 }}>
            See everything  →
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {items.map((f, i) => (
            <div key={i} style={{
              background: 'var(--cream-100)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 12,
              minHeight: 260,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="eyebrow eyebrow-accent">{f.eyebrow}</div>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 18,
                  color: 'var(--warm-700)', letterSpacing: '-0.01em',
                }}>{f.stat}</span>
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 0.98,
                textTransform: 'uppercase', letterSpacing: '-0.02em',
                color: 'var(--warm-900)', margin: '8px 0 0', maxWidth: 380,
              }}>
                {f.title}
              </h3>
              <p style={{ color: 'var(--warm-700)', fontSize: 16, lineHeight: 1.5, marginTop: 'auto' }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

window.Features = Features;
