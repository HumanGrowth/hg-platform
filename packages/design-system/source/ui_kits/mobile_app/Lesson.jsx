// Mobile — Lesson player
function MobileLesson() {
  return (
    <div style={{ background: 'var(--cream-100)', height: '100%', overflowY: 'auto', fontFamily: 'var(--font-body)', paddingBottom: 120 }}>
      <div style={{ height: 54 }}></div>

      {/* Top bar */}
      <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={{
          width: 36, height: 36, borderRadius: 8, background: 'var(--cream-200)',
          border: 0, fontSize: 18, color: 'var(--warm-900)',
        }}>←</button>
        <span className="eyebrow">LESSON 3 OF 7</span>
        <button style={{
          width: 36, height: 36, borderRadius: 8, background: 'var(--cream-200)',
          border: 0, fontSize: 14, color: 'var(--warm-900)', fontWeight: 700,
        }}>⋯</button>
      </div>

      {/* Progress segments */}
      <div style={{ padding: '14px 16px 0', display: 'flex', gap: 4 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < 2 ? 'var(--orange-500)' : i === 2 ? 'var(--orange-200)' : 'var(--cream-200)',
          }}></div>
        ))}
      </div>

      {/* Title block */}
      <div style={{ padding: '20px' }}>
        <div className="eyebrow eyebrow-accent">LEADERSHIP · 12 MIN READ</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 40, textTransform: 'uppercase',
          letterSpacing: '-0.02em', lineHeight: 0.95, margin: '10px 0',
        }}>Re-scoping in 3 questions</h1>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--warm-700)' }}>
          Once you have named the drift, the next move is not a meeting. It is three questions
          you answer alone, on paper, before anyone gets in the room.
        </p>
      </div>

      {/* Pull quote */}
      <div style={{ padding: '0 20px' }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 24, lineHeight: 1.25,
          color: 'var(--warm-900)', borderLeft: '3px solid var(--orange-500)',
          paddingLeft: 14,
        }}>
          What is the smallest version of this project that still <em style={{ fontStyle: 'italic' }}>matters</em>?
        </div>
      </div>

      {/* Exercise card */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{
          background: 'var(--cream-50)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 16,
        }}>
          <div className="eyebrow">YOUR ANSWER · DRAFT</div>
          <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5, color: 'var(--warm-800)' }}>
            Ship the rubric for senior IC interviews only — not the full hiring loop.
            Get one cycle of real data before re-scoping.
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="body-xs">Saved · 2 min ago</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange-700)' }}>Edit →</span>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{
        position: 'absolute', bottom: 32, left: 16, right: 16,
        background: 'var(--cream-100)', padding: '12px',
        display: 'flex', gap: 10,
      }}>
        <button style={{
          background: 'var(--cream-200)', color: 'var(--warm-900)', border: 0,
          padding: '12px 14px', borderRadius: 8, fontWeight: 600, fontSize: 14, flex: 'none',
          fontFamily: 'var(--font-body)',
        }}>←</button>
        <button style={{
          background: 'var(--orange-500)', color: '#fff', border: 0,
          padding: '12px', borderRadius: 8, fontWeight: 600, fontSize: 15, flex: 1,
          fontFamily: 'var(--font-body)',
        }}>Mark complete  →</button>
      </div>
    </div>
  );
}

window.MobileLesson = MobileLesson;
