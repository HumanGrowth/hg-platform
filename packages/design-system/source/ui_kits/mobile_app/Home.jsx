// Mobile — Home screen
function MobileHome() {
  return (
    <div style={{
      background: 'var(--cream-100)', height: '100%', overflowY: 'auto',
      paddingBottom: 100, fontFamily: 'var(--font-body)',
    }}>
      {/* Top spacer for status bar */}
      <div style={{ height: 54 }}></div>

      {/* Greeting */}
      <div style={{ padding: '8px 20px 0' }}>
        <div className="eyebrow" style={{ color: 'var(--fg-muted)' }}>TUE · 14 MAR</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 40, textTransform: 'uppercase',
          letterSpacing: '-0.02em', lineHeight: 1, marginTop: 4,
        }}>Back, Priya.</div>
      </div>

      {/* Daily lesson card */}
      <div style={{ padding: '20px' }}>
        <div style={{
          background: 'var(--warm-900)', color: 'var(--cream-100)',
          borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -30, right: -30, opacity: 0.10,
            pointerEvents: 'none',
          }}>
            <img src="../../assets/logo-white.svg" style={{ height: 220 }} />
          </div>
          <div style={{ position: 'relative' }}>
            <div className="eyebrow" style={{ color: 'var(--orange-300)' }}>TODAY · 12 MIN</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1.05,
              textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '10px 0 14px',
            }}>Re-scoping in 3 questions</div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: '#B8A799', margin: '6px 0 16px' }}>
              Lesson 3 of 7 · Reframing a stuck project
            </p>
            <button style={{
              background: 'var(--orange-500)', color: '#fff', border: 0,
              padding: '12px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14,
              fontFamily: 'var(--font-body)', width: '100%',
            }}>Continue lesson  →</button>
          </div>
        </div>
      </div>

      {/* Quick actions row */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { label: 'Browse paths', em: '120' },
          { label: 'Find mentor',  em: '60+' },
          { label: 'Live events',  em: '12' },
        ].map((q, i) => (
          <div key={i} style={{
            background: 'var(--cream-50)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 14, textAlign: 'left',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--orange-500)', lineHeight: 1 }}>{q.em}</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: 'var(--warm-700)' }}>{q.label}</div>
          </div>
        ))}
      </div>

      {/* Up next section */}
      <div style={{ padding: '28px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Up next</div>
        <span className="body-xs" style={{ color: 'var(--orange-700)', fontWeight: 600 }}>See all</span>
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { time: 'WED · 15:30',  title: '1:1 with Marcus Beck', sub: 'Staff Designer · Linear', tag: 'MENTOR', tagBg: 'var(--info-bg)', tagFg: 'var(--info)' },
          { time: 'THU · 09:00',  title: 'Office hours: writing briefs', sub: '12 attending', tag: 'TALK', tagBg: 'var(--orange-500)', tagFg: '#fff' },
        ].map((it, i) => (
          <div key={i} style={{
            background: 'var(--cream-50)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div className="eyebrow">{it.time}</div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                background: it.tagBg, color: it.tagFg, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{it.tag}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{it.title}</div>
            <div className="body-sm" style={{ marginTop: 2 }}>{it.sub}</div>
          </div>
        ))}
      </div>

      {/* In progress */}
      <div style={{ padding: '28px 20px 8px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>In progress</div>
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { cat: 'LEADERSHIP', title: 'Reframing a stuck project', p: 42 },
          { cat: 'WRITING',    title: 'PR descriptions that ship', p: 14 },
        ].map((p, i) => (
          <div key={i} style={{
            background: 'var(--cream-50)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 14,
          }}>
            <div className="eyebrow eyebrow-accent">{p.cat}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>{p.title}</div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 4, background: 'var(--cream-200)', borderRadius: 2 }}>
                <div style={{ width: p.p + '%', height: '100%', background: 'var(--orange-500)', borderRadius: 2 }}></div>
              </div>
              <span className="body-xs" style={{ fontWeight: 600, color: 'var(--orange-700)' }}>{p.p}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom tab bar */}
      <div style={{
        position: 'absolute', bottom: 20, left: 12, right: 12,
        background: 'rgba(253,245,230,0.85)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        borderRadius: 9999, padding: '10px 14px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        {[
          ['Home',    true],
          ['Paths',   false],
          ['Live',    false],
          ['Wallet',  false],
        ].map(([l, active], i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            color: active ? 'var(--orange-700)' : 'var(--fg-muted)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: active ? 'var(--orange-500)' : 'transparent' }}></span>
            <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.MobileHome = MobileHome;
