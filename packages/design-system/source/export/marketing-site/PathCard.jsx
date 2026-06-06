// Path cards — featured grid
function PathCard({ path }) {
  return (
    <div style={{
      background: path.dark ? 'var(--warm-900)' : 'var(--cream-100)',
      color: path.dark ? 'var(--cream-100)' : 'var(--warm-900)',
      border: path.dark ? 'none' : '1px solid var(--border)',
      borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column',
      gap: 16, minHeight: 320, cursor: 'pointer',
      transition: 'box-shadow 200ms var(--ease-state)',
    }}
    onMouseEnter={(e) => { if (!path.dark) e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="eyebrow" style={{ color: path.dark ? 'var(--orange-300)' : 'var(--orange-700)' }}>
          {path.category}
        </div>
        <span className="body-xs" style={{ color: path.dark ? '#B8A799' : 'var(--fg-muted)' }}>{path.meta}</span>
      </div>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 0.98,
        textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0,
      }}>
        {path.title}
      </h3>
      <p style={{
        fontSize: 14, lineHeight: 1.5, marginTop: 'auto',
        color: path.dark ? '#B8A799' : 'var(--warm-700)',
      }}>
        {path.body}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          {path.faces.map((c, i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: 9999, background: c,
              border: `2px solid ${path.dark ? 'var(--warm-900)' : 'var(--cream-100)'}`,
              marginLeft: i ? -10 : 0,
            }} />
          ))}
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: path.dark ? '#B8A799' : 'var(--fg-muted)' }}>
          {path.cohort} in cohort
        </span>
      </div>
    </div>
  );
}

function FeaturedPaths() {
  const paths = [
    {
      category: 'WRITING',
      meta: '7 LESSONS · BEGINNER',
      title: 'PR descriptions reviewers actually read',
      body: 'Reframe before you draft. The 5-line opener that gets approvals back faster.',
      faces: ['#FFB48A', '#5C4A3F', '#F0E0BD'],
      cohort: 312,
    },
    {
      category: 'LEADERSHIP',
      meta: '12 LESSONS · INTERMEDIATE',
      title: 'Reframing a stuck project',
      body: 'Spotting drift early. Naming it without blame. Resetting scope without losing trust.',
      faces: ['#1A140F', '#FFB48A', '#8A7765'],
      cohort: 184,
      dark: true,
    },
    {
      category: 'PRODUCT',
      meta: '5 LESSONS · ALL LEVELS',
      title: 'Designing a hiring rubric',
      body: 'Calibration that survives the third interview. Signals you can defend in a debrief.',
      faces: ['#F0E0BD', '#FF4500', '#3D3027'],
      cohort: 96,
    },
  ];

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 56, lineHeight: 0.95,
          textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0,
        }}>
          New this season
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Writing', 'Product', 'Leadership', 'Design'].map((t, i) => (
            <span key={t} style={{
              background: i === 0 ? 'var(--warm-900)' : 'transparent',
              color: i === 0 ? 'var(--cream-100)' : 'var(--warm-700)',
              border: i === 0 ? 'none' : '1px solid var(--border-strong)',
              padding: '8px 14px', borderRadius: 9999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {paths.map((p, i) => <PathCard key={i} path={p} />)}
      </div>
    </section>
  );
}

window.PathCard = PathCard;
window.FeaturedPaths = FeaturedPaths;
