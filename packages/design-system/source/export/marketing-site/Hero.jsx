// Hero — display headline, dual CTA, faceted ring accent
function Hero() {
  return (
    <section style={{
      paddingTop: 144, paddingBottom: 120,
      maxWidth: 1280, margin: '0 auto',
      padding: '144px 32px 120px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Faceted ring background */}
      <div style={{
        position: 'absolute', right: -80, top: 40,
        opacity: 0.06, pointerEvents: 'none',
      }}>
        <img src="assets/logo-color.svg" style={{ height: 720 }} />
      </div>

      <div style={{ maxWidth: 920, position: 'relative' }}>
        <div className="eyebrow eyebrow-accent" style={{ marginBottom: 24 }}>SEASON 02 · ENROLLMENT OPEN</div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(64px, 9vw, 128px)',
          lineHeight: 0.9,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          color: 'var(--warm-900)',
          margin: 0,
          textWrap: 'balance',
        }}>
          Grow on<br />purpose.
        </h1>
        <p style={{
          fontSize: 22, lineHeight: 1.45,
          maxWidth: 560, marginTop: 28, marginBottom: 36,
          color: 'var(--warm-700)',
        }}>
          Educational paths, mentorships, and badges for working professionals.
          Built for people who hate the word <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>journey</em>.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={{
            background: 'var(--orange-500)', color: '#fff', border: 0,
            padding: '16px 28px', borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: 'pointer',
            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
          }}>Start a path  →</button>
          <button style={{
            background: 'transparent', color: 'var(--warm-900)',
            border: '1px solid var(--border-strong)',
            padding: '15px 28px', borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: 'pointer',
            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
          }}>For your team</button>
          <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex' }}>
              {['#FFB48A', '#5C4A3F', '#F0E0BD'].map((c, i) => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: 9999, background: c,
                  border: '2px solid var(--cream-100)', marginLeft: i ? -10 : 0,
                }} />
              ))}
            </div>
            <span className="body-sm" style={{ fontWeight: 500 }}>14,300 professionals growing now</span>
          </div>
        </div>
      </div>
    </section>
  );
}

window.Hero = Hero;
