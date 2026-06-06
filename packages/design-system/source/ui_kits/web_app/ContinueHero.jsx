// ContinueHero — the big "pick up where you left off" card
function ContinueHero({ onOpen }) {
  return (
    <section style={{
      background: 'var(--warm-900)', color: 'var(--cream-100)',
      borderRadius: 16, padding: 40, position: 'relative', overflow: 'hidden',
      minHeight: 280,
    }}>
      {/* Faceted ring bleed */}
      <div style={{
        position: 'absolute', right: -120, top: -40, opacity: 0.10,
        pointerEvents: 'none',
      }}>
        <img src="../../assets/logo-white.svg" style={{ height: 460 }} />
      </div>

      <div style={{ position: 'relative', maxWidth: 720 }}>
        <div className="eyebrow" style={{ color: 'var(--orange-300)' }}>CONTINUE  ·  LEADERSHIP  ·  LESSON 3 OF 7</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 64, lineHeight: 0.95,
          textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '12px 0 16px',
        }}>Reframing a stuck project</h1>
        <p style={{ fontSize: 18, lineHeight: 1.5, color: '#B8A799', maxWidth: 580 }}>
          Spot drift early. Name it without blame. Reset scope without losing trust.
          This lesson is the framework. The exercises are the brief you write back.
        </p>
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={onOpen} style={{
            background: 'var(--orange-500)', color: '#fff', border: 0,
            padding: '14px 24px', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer',
            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
          }}>Continue lesson  →</button>
          <button style={{
            background: 'transparent', color: 'var(--cream-100)',
            border: '1px solid rgba(245,235,214,0.24)',
            padding: '13px 24px', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer',
            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
          }}>Skip to exercise 2</button>

          <div style={{ flex: 1, minWidth: 200, maxWidth: 280, marginLeft: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B8A799' }}>Progress</span>
              <span style={{ fontSize: 13, color: 'var(--orange-300)', fontWeight: 600 }}>42%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(245,235,214,0.15)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '42%', height: '100%', background: 'var(--orange-500)' }}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.ContinueHero = ContinueHero;
