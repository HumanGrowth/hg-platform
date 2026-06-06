// ============================================================
// Human Growth — Dashboard Direction A: "Command Grid"
// Dense, data-forward. KPI tiles → radar+trend split → donut
// rings → comparison bars.
// ============================================================

function KpiTile({ kpi }) {
  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.label}</span>
        <DeltaPill value={kpi.delta} size="sm" />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 0.9, color: 'var(--fg)',
          fontVariantNumeric: 'tabular-nums' }}>
          {kpi.value}<span style={{ fontSize: 20, color: 'var(--fg-subtle)' }}>{kpi.unit}</span>
        </div>
        <Sparkline data={kpi.spark} w={84} h={34} />
      </div>
    </div>
  );
}

function Panel({ title, meta, children, style, action }) {
  return (
    <section style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12,
      padding: 22, display: 'flex', flexDirection: 'column', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{title}</h3>
          {meta && <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 3 }}>{meta}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function LegendDot({ color, dashed, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)', fontWeight: 600 }}>
      <span style={{ width: 14, height: 0, borderTop: dashed ? '2px dashed' : '3px solid', borderColor: color }} />
      {label}
    </span>
  );
}

function CommandGrid({ data, level }) {
  const radarAxes = data.competencies.map((c) => ({
    label: c.label,
    short: c.label.split(' ')[0] === 'Leadership' ? 'Leadership' : c.label.split(' & ')[0].split(' ')[0],
  }));
  // nicer short labels
  const shortMap = { ai: 'AI', ops: 'Ops', team: 'Team', lead: 'Leadership', comm: 'Comms' };
  radarAxes.forEach((a, i) => { a.short = shortMap[data.competencies[i].key]; });

  const radarData = [
    { name: data.selfLabel, color: 'var(--orange-500)', values: data.competencies.map((c) => c.score), fill: 0.18 },
    { name: data.compareLabel, color: 'var(--fg-subtle)', values: data.compareValues, fill: 0 },
  ];

  const barData = level === 'team'
    ? data.members.map((m) => ({ label: m.initials, full: m.name, value: m.gi, sub: m.name.split(' ')[0] }))
    : data.competencies.map((c) => ({ label: { ai: 'AI', ops: 'Ops', team: 'Team', lead: 'Lead', comm: 'Comms' }[c.key],
        full: c.label, value: c.score, target: c.target, color: c.color }));

  return (
    <>
      {/* Page heading */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Eyebrow accent>Analytics · {data.range.label}</Eyebrow>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 46, textTransform: 'uppercase',
            letterSpacing: '-0.015em', lineHeight: 0.95, margin: '8px 0 0', color: 'var(--fg)' }}>
            {level === 'team' ? 'Team growth' : 'Your growth'}
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
            color: 'var(--fg-subtle)' }}>Growth index</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'flex-end', marginTop: 2 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 54, lineHeight: 0.85, color: 'var(--orange-500)' }}>{data.giNow}</span>
            <DeltaPill value={data.giNow - data.giStart} />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {data.kpis.map((k) => <KpiTile key={k.key} kpi={k} />)}
      </div>

      {/* Radar + Trend split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 16, marginBottom: 16 }}>
        <Panel title="Competency profile" meta={`${data.selfLabel} vs ${data.compareLabel.toLowerCase()}`}
          action={<div style={{ display: 'flex', gap: 14 }}>
            <LegendDot color="var(--orange-500)" label={data.selfLabel} />
            <LegendDot color="var(--fg-subtle)" dashed label={data.compareLabel} />
          </div>}>
          <RadarChart axes={radarAxes} datasets={radarData} size={290} />
        </Panel>

        <Panel title="Growth index over time" meta={data.range.label}>
          <AreaChart series={data.giSeries} axis={data.range.axis} bands={data.range.bands}
            height={258} label="Growth index" />
        </Panel>
      </div>

      {/* Donut rings */}
      <Panel title="Progress to next level" meta="Ring = current score · tick = target"
        style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'start' }}>
          {data.competencies.map((c) => (
            <div key={c.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <DonutRing value={c.score} target={c.target} size={108} stroke={11} color={c.color} sub={`/ ${c.target}`} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.2 }}>{c.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 3 }}>
                  {c.level} · <span style={{ color: c.delta >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                    {c.delta >= 0 ? '+' : ''}{c.delta}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Comparison bars */}
      <Panel title={level === 'team' ? 'Growth index by team member' : 'Score vs target by competency'}
        meta={level === 'team' ? `${data.members.length} people` : 'Dashed line = target'}>
        <BarChart data={barData} height={210} max={100}
          showTarget={level !== 'team'} color="var(--orange-500)" />
      </Panel>
    </>
  );
}

Object.assign(window, { CommandGrid, LegendDot, Panel, KpiTile });
