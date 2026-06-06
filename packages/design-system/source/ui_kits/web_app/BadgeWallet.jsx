// Badge wallet — earned + in-progress badges
function BadgeWallet() {
  const badges = [
    { name: 'Writing',     state: 'EARNED', lvl: 'LVL 2', filled: true,  color: '#FF4500', initial: 'W' },
    { name: 'Leadership',  state: 'EARNED', lvl: 'LVL 1', filled: true,  color: '#1A140F', initial: 'L' },
    { name: 'Mentorship',  state: 'EARNED', lvl: 'LVL 1', filled: true,  color: '#FF4500', initial: 'M' },
    { name: 'Product',     state: 'IN PROGRESS', lvl: '42%', filled: false, color: '#FF4500', initial: 'P' },
    { name: 'Design',      state: 'LOCKED', lvl: '—',     filled: false, color: '#B8A799', initial: 'D' },
    { name: 'Eng craft',   state: 'LOCKED', lvl: '—',     filled: false, color: '#B8A799', initial: 'E' },
  ];

  return (
    <section style={{ marginTop: 40, marginBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>
          Your wallet
        </h2>
        <span className="body-sm">3 of 12 badges earned</span>
      </div>

      <div style={{
        background: 'var(--cream-50)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24,
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16,
      }}>
        {badges.map((b, i) => (
          <div key={i} style={{ textAlign: 'center', opacity: b.state === 'LOCKED' ? 0.5 : 1 }}>
            <div style={{ width: 96, height: 96, margin: '0 auto', position: 'relative' }}>
              <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: 96, height: 96 }}>
                {Array.from({ length: 24 }).map((_, j) => {
                  const a = (j / 24) * Math.PI * 2;
                  const x1 = (50 + Math.cos(a) * 40).toFixed(1);
                  const y1 = (50 + Math.sin(a) * 40).toFixed(1);
                  const x2 = (50 + Math.cos(a + 0.13) * 48).toFixed(1);
                  const y2 = (50 + Math.sin(a + 0.13) * 48).toFixed(1);
                  const x3 = (50 + Math.cos(a + 0.26) * 40).toFixed(1);
                  const y3 = (50 + Math.sin(a + 0.26) * 40).toFixed(1);
                  return <polygon key={j} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill={b.color} />;
                })}
              </svg>
              <div style={{
                position: 'absolute', inset: 18, borderRadius: 9999,
                background: b.filled ? b.color : 'var(--cream-200)',
                color: b.filled ? '#fff' : 'var(--warm-700)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 28,
              }}>{b.initial}</div>
            </div>
            <div style={{ marginTop: 8, fontWeight: 700, fontSize: 14 }}>{b.name}</div>
            <div className="eyebrow" style={{ marginTop: 2, fontSize: 10 }}>
              {b.state}  ·  {b.lvl}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.BadgeWallet = BadgeWallet;
