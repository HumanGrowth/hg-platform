// Lesson player modal — opens on Continue / path click
function LessonPlayer({ open, onClose }) {
  if (!open) return null;

  const lessons = [
    { n: 1, title: 'The pattern of drift', done: true },
    { n: 2, title: 'Naming without blame', done: true },
    { n: 3, title: 'Re-scoping in 3 questions', done: false, current: true },
    { n: 4, title: 'The reset memo', done: false },
    { n: 5, title: 'Exercise: Your stuck project', done: false },
    { n: 6, title: 'Sharing the reset', done: false },
    { n: 7, title: 'Following through', done: false },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(26,20,15,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--cream-100)', borderRadius: 16, overflow: 'hidden',
        width: '100%', maxWidth: 1100, maxHeight: '88vh',
        display: 'grid', gridTemplateColumns: '300px 1fr',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Lesson sidebar */}
        <aside style={{
          background: 'var(--cream-50)', borderRight: '1px solid var(--border)',
          padding: 24, overflowY: 'auto',
        }}>
          <div className="eyebrow eyebrow-accent">LEADERSHIP · PATH</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 0.98,
            textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '8px 0 18px',
          }}>Reframing a stuck project</h2>
          <div style={{ height: 4, background: 'var(--cream-200)', borderRadius: 2, marginBottom: 24 }}>
            <div style={{ width: '42%', height: '100%', background: 'var(--orange-500)', borderRadius: 2 }}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {lessons.map(l => (
              <div key={l.n} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: l.current ? 'var(--cream-200)' : 'transparent',
                opacity: l.done ? 0.6 : 1, cursor: 'pointer',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 9999,
                  background: l.done ? 'var(--orange-500)' : l.current ? 'var(--warm-900)' : 'transparent',
                  border: l.done || l.current ? 'none' : '1.5px solid var(--border-strong)',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                }}>{l.done ? '✓' : ''}</span>
                <span style={{ fontSize: 14, fontWeight: l.current ? 600 : 500 }}>{l.title}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Lesson body */}
        <main style={{ padding: '24px 36px', overflowY: 'auto', position: 'relative' }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 24, right: 24, width: 36, height: 36, borderRadius: 8,
            background: 'transparent', border: '1px solid var(--border)',
            cursor: 'pointer', fontSize: 18, color: 'var(--fg-muted)',
          }}>×</button>

          <div className="eyebrow">LESSON 3 OF 7 · 12 MIN READ</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 48, lineHeight: 0.95,
            textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '12px 0 8px', maxWidth: 600,
          }}>Re-scoping in 3 questions</h1>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--warm-700)', maxWidth: 620, marginTop: 14 }}>
            Once you have named the drift, the next move is not a meeting. It is three questions
            you answer alone, on paper, before anyone gets in the room.
          </p>

          <div style={{
            background: 'var(--cream-50)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, marginTop: 24, maxWidth: 620,
          }}>
            <div className="eyebrow eyebrow-accent">EXERCISE</div>
            <div className="serif" style={{
              fontSize: 24, lineHeight: 1.25, margin: '10px 0 6px', color: 'var(--warm-900)',
            }}>
              What is the smallest version of this project that still <em style={{ fontStyle: 'italic' }}>matters</em>?
            </div>
            <textarea placeholder="Write your answer. Two sentences." style={{
              width: '100%', minHeight: 80, marginTop: 14, padding: 12,
              background: 'var(--cream-100)', border: '1px solid var(--border)',
              borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--fg)',
              resize: 'vertical', boxSizing: 'border-box',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, maxWidth: 620 }}>
            <button style={{
              background: 'transparent', color: 'var(--warm-900)', border: '1px solid var(--border-strong)',
              padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}>← Previous</button>
            <button style={{
              background: 'var(--orange-500)', color: '#fff', border: 0,
              padding: '11px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}>Mark complete  →</button>
          </div>
        </main>
      </div>
    </div>
  );
}

window.LessonPlayer = LessonPlayer;
