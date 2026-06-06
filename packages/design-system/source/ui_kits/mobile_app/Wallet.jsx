// Mobile — Badge wallet
function MobileWallet() {
  const earned = [
    { name: 'Writing',    lvl: 'LVL 2', color: '#FF4500', initial: 'W' },
    { name: 'Leadership', lvl: 'LVL 1', color: '#1A140F', initial: 'L' },
    { name: 'Mentorship', lvl: 'LVL 1', color: '#FF4500', initial: 'M' },
  ];
  const locked = [
    { name: 'Product',   p: 42, color: '#FF4500', initial: 'P' },
    { name: 'Design',    p: 0,  color: '#B8A799', initial: 'D' },
    { name: 'Eng craft', p: 0,  color: '#B8A799', initial: 'E' },
  ];

  return (
    <div style={{ background: 'var(--cream-100)', height: '100%', overflowY: 'auto', fontFamily: 'var(--font-body)', paddingBottom: 100 }}>
      <div style={{ height: 54 }}></div>

      {/* Header */}
      <div style={{ padding: '8px 20px 0' }}>
        <div className="eyebrow">YOUR WALLET</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 40, textTransform: 'uppercase',
          letterSpacing: '-0.02em', lineHeight: 1, marginTop: 4,
        }}>3 of 12 earned</div>
      </div>

      {/* Hero badge */}
      <div style={{ padding: '24px 20px 0', textAlign: 'center' }}>
        <div style={{
          background: 'var(--cream-50)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 28,
        }}>
          <div style={{ width: 160, height: 160, margin: '0 auto', position: 'relative' }}>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              {Array.from({ length: 24 }).map((_, j) => {
                const a = (j / 24) * Math.PI * 2;
                const x1 = (50 + Math.cos(a) * 40).toFixed(1);
                const y1 = (50 + Math.sin(a) * 40).toFixed(1);
                const x2 = (50 + Math.cos(a + 0.13) * 48).toFixed(1);
                const y2 = (50 + Math.sin(a + 0.13) * 48).toFixed(1);
                const x3 = (50 + Math.cos(a + 0.26) * 40).toFixed(1);
                const y3 = (50 + Math.sin(a + 0.26) * 40).toFixed(1);
                return <polygon key={j} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill="#FF4500" />;
              })}
            </svg>
            <div style={{
              position: 'absolute', inset: 28, borderRadius: 9999,
              background: 'var(--orange-500)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 56,
            }}>W</div>
          </div>
          <div style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1, textTransform: 'uppercase' }}>Writing · LVL 2</div>
          <div className="body-sm" style={{ marginTop: 6 }}>Earned 14 Mar 2026 · Verified by 312 peers</div>
          <button style={{
            marginTop: 16, background: 'transparent', color: 'var(--warm-900)',
            border: '1px solid var(--border-strong)', padding: '10px 18px', borderRadius: 8,
            fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-body)',
          }}>Share badge</button>
        </div>
      </div>

      {/* Earned grid */}
      <div style={{ padding: '24px 20px 8px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Earned</div>
      </div>
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {earned.map((b, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto', position: 'relative' }}>
              <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                {Array.from({ length: 18 }).map((_, j) => {
                  const a = (j / 18) * Math.PI * 2;
                  const x1 = (50 + Math.cos(a) * 38).toFixed(1);
                  const y1 = (50 + Math.sin(a) * 38).toFixed(1);
                  const x2 = (50 + Math.cos(a + 0.17) * 48).toFixed(1);
                  const y2 = (50 + Math.sin(a + 0.17) * 48).toFixed(1);
                  const x3 = (50 + Math.cos(a + 0.34) * 38).toFixed(1);
                  const y3 = (50 + Math.sin(a + 0.34) * 38).toFixed(1);
                  return <polygon key={j} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill={b.color} />;
                })}
              </svg>
              <div style={{
                position: 'absolute', inset: 15, borderRadius: 9999,
                background: b.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 24,
              }}>{b.initial}</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700 }}>{b.name}</div>
            <div className="eyebrow" style={{ fontSize: 10 }}>{b.lvl}</div>
          </div>
        ))}
      </div>

      {/* In progress / locked */}
      <div style={{ padding: '24px 20px 8px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>In progress + locked</div>
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {locked.map((b, i) => (
          <div key={i} style={{
            background: 'var(--cream-50)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 12, display: 'flex', gap: 12, alignItems: 'center',
            opacity: b.p === 0 ? 0.6 : 1,
          }}>
            <div style={{ width: 52, height: 52, position: 'relative', flex: 'none' }}>
              <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                {Array.from({ length: 16 }).map((_, j) => {
                  const a = (j / 16) * Math.PI * 2;
                  const x1 = (50 + Math.cos(a) * 38).toFixed(1);
                  const y1 = (50 + Math.sin(a) * 38).toFixed(1);
                  const x2 = (50 + Math.cos(a + 0.19) * 48).toFixed(1);
                  const y2 = (50 + Math.sin(a + 0.19) * 48).toFixed(1);
                  const x3 = (50 + Math.cos(a + 0.38) * 38).toFixed(1);
                  const y3 = (50 + Math.sin(a + 0.38) * 38).toFixed(1);
                  return <polygon key={j} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill={b.color} opacity={b.p === 0 ? 0.6 : 1} />;
                })}
              </svg>
              <div style={{
                position: 'absolute', inset: 12, borderRadius: 9999,
                background: 'var(--cream-200)', color: 'var(--warm-700)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 16,
              }}>{b.initial}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{b.name}</div>
              <div className="body-xs" style={{ marginTop: 2 }}>
                {b.p === 0 ? 'Locked — earn Writing first' : `${b.p}% — 3 of 7 lessons`}
              </div>
            </div>
            {b.p > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange-700)', flex: 'none' }}>{b.p}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

window.MobileWallet = MobileWallet;
