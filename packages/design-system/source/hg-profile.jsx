// ============================================================
// Human Growth — Mi perfil (niveles L1–L6, badges, Maturity Matrix)
// ============================================================

// The Holistic Maturity Matrix: dimensions × levels (1–6) grid.
function MaturityMatrix() {
  const dims = window.HG.DIMS,levels = window.HG.LEVELS,matrix = window.HG.MATRIX;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `150px repeat(${levels.length}, 1fr)`,
        gap: 6, minWidth: 640 }}>
        {/* header row */}
        <div />
        {levels.map((l) =>
        <div key={l.id} style={{ textAlign: 'center', paddingBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--fg)' }}>{l.code}</div>
            <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l.name}</div>
          </div>
        )}
        {/* dimension rows */}
        {dims.map((d) => {
          const reached = matrix[d.key];
          return (
            <React.Fragment key={d.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <DimIcon dim={d.key} size={18} color={d.color} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>{d.short}</span>
              </div>
              {levels.map((l) => {
                const done = l.id <= reached;
                const current = l.id === reached;
                return (
                  <div key={l.id} style={{ height: 44, borderRadius: 8,
                    background: done ? hexA2(d.color, current ? 0.9 : 0.18) : 'var(--bg-sunken)',
                    border: current ? `2px solid ${d.color}` : '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .2s var(--ease-out)' }}>
                    {current ?
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff',
                      textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aquí</span> :
                    done ?
                    <Icon name="check" size={16} color={d.color} /> :
                    <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--warm-300)' }} />}
                  </div>);

              })}
            </React.Fragment>);

        })}
      </div>
    </div>);

}

function BadgeChip({ b }) {
  const d = window.HG.dim(b.dim);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: b.earned ? 1 : 0.5 }}>
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        {/* faceted ring frame */}
        <svg width="72" height="72" viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0,
          color: b.earned ? d.color : 'var(--warm-300)' }}>
          <g fill="currentColor" transform="translate(100,100)">
            {Array.from({ length: 36 }).map((_, i) =>
            <polygon key={i} points="0,-92 5,-70 -5,-70" transform={`rotate(${360 / 36 * i})`} />)}
          </g>
        </svg>
        <div style={{ position: 'absolute', inset: 14, borderRadius: 999,
          background: b.earned ? hexA2(d.color, 0.14) : 'var(--bg-sunken)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {b.earned ? <DimIcon dim={b.dim} size={24} color={d.color} /> :
          <Icon name="lock" size={20} color="var(--warm-300)" />}
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', textAlign: 'center', lineHeight: 1.2 }}>{b.name}</span>
    </div>);

}

function Profile({ setView }) {
  const dims = window.HG.DIMS,P = window.HG.PERSONAL,badges = window.HG.BADGES;
  const earned = badges.filter((b) => b.earned).length;
  const overall = Math.round(dims.reduce((a, d) => a + P[d.key].now, 0) / dims.length);
  const overallEntry = Math.round(dims.reduce((a, d) => a + P[d.key].entry, 0) / dims.length);
  // next step = lowest now-score dimension
  const next = [...dims].sort((a, b) => P[a.key].now - P[b.key].now)[0];
  const nextCourse = (window.HG.CATALOG.rows.find((r) => r.dim === next.key) || { courses: [] }).courses[0];

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px 56px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 26, flexWrap: 'wrap' }}>
        <Avatar initials="PN" size={72} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, textTransform: 'uppercase',
            letterSpacing: '-0.015em', lineHeight: 0.95, margin: 0 }}>JORGE ARAYA</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <LevelChip code="L3" name="Práctica" />
            <span style={{ fontSize: 13.5, color: 'var(--fg-muted)' }}>Lead Sr. · se unió hace 3 meses</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 26 }}>
          {[['Índice integral', overall, `+${overall - overallEntry}`], ['Badges', `${earned}/${badges.length}`, null], ['Racha', '9 días', null]].map(([l, v, delta], i) =>
          <div key={i} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'var(--fg-subtle)' }}>{l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1, color: 'var(--fg)' }}>{v}</span>
                {delta && <DeltaPill value={parseInt(delta)} />}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* next step banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28,
        background: 'var(--warm-900)', color: 'var(--cream-100)', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: hexA2(next.color, 0.25),
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <DimIcon dim={next.key} size={24} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--orange-300)' }}>Tu siguiente paso ideal</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 3 }}>
            Sube en {next.label}{nextCourse ? ` — empieza con “${nextCourse.title}”` : ''}</div>
        </div>
        <Btn variant="primary" iconRight="arrowRight" onClick={() => setView('catalog')}>Empezar ahora</Btn>
      </div>

      {/* two-col: matrix + dimension scores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 22, marginBottom: 28 }}>
        <section style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase',
              letterSpacing: '-0.01em', margin: 0 }}>Holistic Maturity Matrix</h3>
            <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>Nivel actual por dimensión</span>
          </div>
          <MaturityMatrix />
        </section>

        <section style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: 22 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase',
            letterSpacing: '-0.01em', margin: '0 0 18px' }}>Progreso por dimensión</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {dims.map((d) => {
              const p = P[d.key];
              return (
                <div key={d.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <DimIcon dim={d.key} size={16} color={d.color} />
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{d.label}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: 17 }}>{p.now}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>+{p.now - p.entry}</span>
                  </div>
                  <PillarBar value={p.now} target={p.target} color={d.color} />
                </div>);

            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 16, fontSize: 11.5, color: 'var(--fg-muted)' }}>
            <span>Barra = actual</span><span>│ marca = meta</span>
          </div>
        </section>
      </div>

      {/* badges */}
      <section style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase',
            letterSpacing: '-0.01em', margin: 0 }}>Badges</h3>
          <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>{earned} de {badges.length} obtenidos</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
          {badges.map((b, i) => <BadgeChip key={i} b={b} />)}
        </div>
      </section>
    </div>);

}

window.Profile = Profile;