// ============================================================
// Human Growth — Vista del líder (RRHH/manager)
// Completitud del grupo, NPS, y el gap entrada→salida (ROI).
// ============================================================

function StatCard({ label, value, unit, delta, icon, foot }) {
  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--orange-50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={19} color="var(--orange-600)" /></span>
        {delta != null && <DeltaPill value={delta} size="sm" />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 0.9, color: 'var(--fg)' }}>{value}</span>
        {unit && <span style={{ fontSize: 18, color: 'var(--fg-subtle)', fontWeight: 700 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 8, fontWeight: 600 }}>{label}</div>
      {foot && <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 4 }}>{foot}</div>}
    </div>
  );
}

// NPS gauge — promoters/passives/detractors split bar.
function NpsBar() {
  const seg = [{ c: 'var(--success)', w: 62, l: 'Promotores' },
    { c: 'var(--warm-300)', w: 27, l: 'Pasivos' },
    { c: 'var(--danger)', w: 11, l: 'Detractores' }];
  return (
    <div>
      <div style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
        {seg.map((s, i) => <div key={i} style={{ width: `${s.w}%`, background: s.c }} />)}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {seg.map((s, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5,
            color: 'var(--fg-muted)', fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.c }} /> {s.l} · {s.w}%</span>
        ))}
      </div>
    </div>
  );
}

function Leader({ setView }) {
  const dims = window.HG.DIMS, team = window.HG.TEAM, gap = window.HG.TEAM_GAP;
  const avgCompletion = Math.round(team.reduce((a, t) => a + t.completion, 0) / team.length);
  const avgGap = Math.round(dims.reduce((a, d) => a + (gap[d.key].exit - gap[d.key].entry), 0) / dims.length);
  const active = team.filter((t) => t.completion >= 50).length;

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px 56px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
        marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 360px' }}>
          <Eyebrow accent>Vista del líder · Equipo de Diseño</Eyebrow>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, textTransform: 'uppercase',
            letterSpacing: '-0.015em', lineHeight: 0.95, margin: '6px 0 0' }}>Impacto del programa</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
          <Segmented size="sm" value="q" onChange={() => {}} options={[
            { value: '6w', label: '6 sem' }, { value: 'q', label: 'Trimestre' }, { value: '12m', label: '12 meses' }]} />
          <Btn variant="ghost" icon="arrowUpRight">Exportar reporte</Btn>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <StatCard icon="users" label="Adopción del equipo" value={active} unit={`/${team.length}`} delta={+3}
          foot="personas activas este trimestre" />
        <StatCard icon="checkCircle" label="Completitud promedio" value={avgCompletion} unit="%" delta={+14}
          foot="del recorrido asignado" />
        <StatCard icon="trendingUp" label="Gap entrada → salida" value={`+${avgGap}`} delta={+6}
          foot="puntos promedio en 6D" />
        <StatCard icon="star" label="eNPS del programa" value={48} delta={+9} foot="−100 a +100" />
      </div>

      {/* gap ROI + NPS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <section style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase',
                letterSpacing: '-0.01em', margin: 0 }}>Gap del equipo · entrada vs. salida</h3>
              <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 4 }}>
                La prueba de ROI: cuánto creció el equipo por dimensión</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13.5,
              fontWeight: 800, color: 'var(--success)' }}>
              <Icon name="trendingUp" size={16} color="var(--success)" /> +{avgGap} pts prom.</span>
          </div>
          <GapBars data={gap} dims={dims} />
        </section>

        <section style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14,
          padding: 24, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase',
            letterSpacing: '-0.01em', margin: '0 0 4px' }}>Satisfacción (eNPS)</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '8px 0 20px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 56, lineHeight: 0.85,
              color: 'var(--orange-500)' }}>+48</span>
            <DeltaPill value={+9} />
          </div>
          <NpsBar />
          <div style={{ marginTop: 'auto', paddingTop: 20, fontSize: 13.5, color: 'var(--fg-muted)',
            lineHeight: 1.5, fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
            “Por primera vez siento que la empresa invierte en mí como persona, no solo como recurso.”</div>
        </section>
      </div>

      {/* team table */}
      <section style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14,
        padding: '8px 8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase',
            letterSpacing: '-0.01em', margin: 0 }}>Tu equipo · {team.length} personas</h3>
          <Btn variant="soft" size="sm" icon="plus">Asignar recorrido</Btn>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              {['Persona', 'Nivel', 'Completitud', 'Gap 6D', 'NPS', ''].map((h, i) => (
                <th key={i} style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-subtle)',
                  borderBottom: '1px solid var(--border)', textAlign: i >= 2 && i <= 4 ? 'left' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {team.map((t, i) => (
              <tr key={i} style={{ borderBottom: i < team.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <Avatar initials={t.initials} size={34} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}><LevelChip code={t.level} size="sm" /></td>
                <td style={{ padding: '12px 16px', minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, maxWidth: 130 }}><PillarBar value={t.completion} color="var(--orange-500)" height={7} /></div>
                    <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                      color: 'var(--fg)' }}>{t.completion}%</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--success)' }}>+{t.gap}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13.5,
                    fontWeight: 700, color: t.nps >= 9 ? 'var(--success)' : t.nps >= 7 ? 'var(--fg)' : 'var(--danger)' }}>
                    {t.nps >= 9 ? '★' : ''} {t.nps}</span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <Icon name="chevronRight" size={18} color="var(--fg-subtle)" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

window.Leader = Leader;
