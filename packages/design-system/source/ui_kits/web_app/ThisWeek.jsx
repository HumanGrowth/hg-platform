// ThisWeek — events + mentor sessions row
function ThisWeek() {
  const items = [
    { kind: 'event', date: 'TUE 14',  time: '11:00–12:00', title: 'Designing a hiring rubric', who: 'with Anjali Rao · Stripe', status: 'LIVE' },
    { kind: 'mentor', date: 'WED 15', time: '15:30–16:00', title: '1:1 with Marcus Beck',     who: 'Staff Designer · Linear', status: 'CONFIRMED' },
    { kind: 'event', date: 'THU 16',  time: '09:00–10:00', title: 'Office hours: writing briefs', who: '12 attending · drop in',  status: 'OPEN' },
  ];

  return (
    <section style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>
          This week
        </h2>
        <a className="accent" style={{ color: 'var(--orange-700)', fontSize: 14, fontWeight: 600, borderBottom: '1px solid var(--orange-700)' }}>
          Full calendar  →
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            background: 'var(--cream-50)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div className="eyebrow" style={{ color: it.kind === 'event' ? 'var(--orange-700)' : 'var(--info)' }}>
                  {it.kind === 'event' ? 'TALK' : '1:1 MENTOR'}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1, marginTop: 6, whiteSpace: 'nowrap' }}>{it.date}</div>
                <div className="body-xs" style={{ marginTop: 6 }}>{it.time}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 4,
                background: it.status === 'LIVE' ? 'var(--orange-500)' : it.status === 'CONFIRMED' ? 'var(--success-bg)' : 'var(--cream-300)',
                color: it.status === 'LIVE' ? '#fff' : it.status === 'CONFIRMED' ? 'var(--success)' : 'var(--warm-700)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{it.status}</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{it.title}</div>
              <div className="body-sm" style={{ marginTop: 2 }}>{it.who}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.ThisWeek = ThisWeek;
