// Recommended paths — 3-card grid
function RecommendedPaths({ onPathClick }) {
  const paths = [
    {
      cat: 'WRITING', meta: '7 LESSONS · 1H 20M',
      title: 'PR descriptions reviewers actually read',
      body: 'Reframe before you draft. The 5-line opener that gets approvals faster.',
      progress: 0,
    },
    {
      cat: 'PRODUCT', meta: '5 LESSONS · 55 MIN',
      title: 'Designing a hiring rubric',
      body: 'Calibration that survives the third interview.',
      progress: 0,
    },
    {
      cat: 'LEADERSHIP', meta: '12 LESSONS · 3H 10M',
      title: 'Running a debrief without blame',
      body: 'Postmortem scripts that surface signal, not stories.',
      progress: 12,
    },
  ];

  return (
    <section style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>
          Picked for you
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Based on your role', 'Writing', 'Leadership'].map((t, i) => (
            <span key={t} style={{
              background: i === 0 ? 'var(--warm-900)' : 'transparent',
              color: i === 0 ? 'var(--cream-100)' : 'var(--warm-700)',
              border: i === 0 ? 'none' : '1px solid var(--border-strong)',
              padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {paths.map((p, i) => (
          <div key={i} onClick={onPathClick} style={{
            background: 'var(--cream-50)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
            cursor: 'pointer', minHeight: 240,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="eyebrow eyebrow-accent">{p.cat}</div>
              <span className="body-xs" style={{ color: 'var(--fg-muted)' }}>{p.meta}</span>
            </div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 0.98,
              textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0,
            }}>{p.title}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--warm-700)' }}>{p.body}</p>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex' }}>
                {['#FFB48A', '#5C4A3F', '#F0E0BD'].map((c, j) => (
                  <div key={j} style={{
                    width: 24, height: 24, borderRadius: 9999, background: c,
                    border: '2px solid var(--cream-50)', marginLeft: j ? -8 : 0,
                  }} />
                ))}
              </div>
              <button style={{
                background: 'transparent', color: 'var(--orange-700)', border: 0,
                padding: 0, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                fontFamily: 'var(--font-body)', borderBottom: '1px solid var(--orange-700)',
              }}>Start path →</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.RecommendedPaths = RecommendedPaths;
