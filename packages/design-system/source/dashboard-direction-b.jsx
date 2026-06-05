// ============================================================
// Human Growth — Dashboard Direction B: "Editorial Focus"
// Generous whitespace, big Anton numerals, a serif narrative line.
// Hero index + trend → competency ledger w/ horizontal bars +
// radar → momentum small-multiples.
// ============================================================

function HBar({ value, target, max = 100, color }) {
  const frac = Math.max(0, Math.min(1, value / max));
  const tFrac = Math.max(0, Math.min(1, target / max));
  return (
    <div style={{ position: 'relative', height: 10, background: 'var(--bg-sunken)', borderRadius: 6 }}>
      <div style={{ position: 'absolute', inset: 0, width: `${frac * 100}%`, background: color,
        borderRadius: 6, transition: 'width .6s var(--ease-out)' }} />
      <div title={`Target ${target}`} style={{ position: 'absolute', top: -3, bottom: -3,
        left: `${tFrac * 100}%`, width: 2, background: 'var(--fg)', opacity: 0.5, borderRadius: 2 }} />
    </div>
  );
}

function CompRow({ c }) {
  const shortLevelColor = c.delta >= 0 ? 'var(--success)' : 'var(--danger)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 20px',
      alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ gridColumn: '1 / 2' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{c.label}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--fg-subtle)' }}>{c.level}</span>
        </div>
      </div>
      <div style={{ gridColumn: '2 / 3', gridRow: '1 / 3', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Sparkline data={c.data} color={c.color} w={88} h={30} fill={false} />
        <div style={{ textAlign: 'right', minWidth: 52 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 0.85, color: 'var(--fg)' }}>{c.score}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: shortLevelColor, marginTop: 2 }}>
            {c.delta >= 0 ? '+' : ''}{c.delta}</div>
        </div>
      </div>
      <div style={{ gridColumn: '1 / 2', marginTop: 8 }}>
        <HBar value={c.score} target={c.target} color={c.color} />
      </div>
    </div>
  );
}

function MomentumCard({ c }) {
  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '14px 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
      </div>
      <Sparkline data={c.data} color={c.color} w={150} h={40} />
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--fg)' }}>{c.score}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: c.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {c.delta >= 0 ? '+' : ''}{c.delta}</span>
      </div>
    </div>
  );
}

function EditorialFocus({ data, level }) {
  const top = data.competencies.reduce((a, b) => (b.delta > a.delta ? b : a));
  const radarAxes = data.competencies.map((c) => ({
    label: c.label, short: { ai: 'AI', ops: 'Ops', team: 'Team', lead: 'Leadership', comm: 'Comms' }[c.key],
  }));
  const radarData = [
    { name: data.selfLabel, color: 'var(--orange-500)', values: data.competencies.map((c) => c.score), fill: 0.16 },
    { name: data.compareLabel, color: 'var(--fg-subtle)', values: data.compareValues, fill: 0 },
  ];

  return (
    <>
      {/* Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.4fr', gap: 36, alignItems: 'center',
        paddingBottom: 30, marginBottom: 30, borderBottom: '1px solid var(--border)' }}>
        <div>
          <Eyebrow accent>{level === 'team' ? 'Team growth' : 'Your growth'} · {data.range.label}</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, margin: '10px 0 14px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 104, lineHeight: 0.8,
              color: 'var(--fg)', letterSpacing: '-0.02em' }}>{data.giNow}</span>
            <div style={{ paddingBottom: 12 }}>
              <DeltaPill value={data.giNow - data.giStart} />
              <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 6, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.1em' }}>Growth index</div>
            </div>
          </div>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 22, lineHeight: 1.35,
            color: 'var(--fg-muted)', margin: 0, maxWidth: 360 }}>
            Up {data.giNow - data.giStart} points this {level === 'team' ? 'quarter' : 'quarter'} — fastest gain
            in <span style={{ color: 'var(--orange-700)' }}>{top.label.toLowerCase()}</span>.
          </p>
        </div>
        <div>
          <AreaChart series={data.giSeries} axis={data.range.axis} bands={data.range.bands}
            height={210} label="Growth index" />
        </div>
      </div>

      {/* Ledger + radar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 40, marginBottom: 34 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, textTransform: 'uppercase',
              letterSpacing: '-0.01em', color: 'var(--fg)', margin: 0 }}>Competencies</h2>
            <span style={{ fontSize: 12.5, color: 'var(--fg-subtle)', fontWeight: 600 }}>
              Bar = score · marker = target</span>
          </div>
          <div>
            {data.competencies.map((c) => <CompRow key={c.key} c={c} />)}
          </div>
        </div>

        <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '20px 18px', alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>Profile</h3>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 600 }}>vs {data.compareLabel.toLowerCase()}</span>
          </div>
          <RadarChart axes={radarAxes} datasets={radarData} size={272} />
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6 }}>
            <LegendDot color="var(--orange-500)" label={data.selfLabel} />
            <LegendDot color="var(--fg-subtle)" dashed label={data.compareLabel} />
          </div>
        </div>
      </div>

      {/* Momentum small multiples */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, textTransform: 'uppercase',
          letterSpacing: '-0.01em', color: 'var(--fg)', margin: '0 0 16px' }}>Momentum</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {data.competencies.map((c) => <MomentumCard key={c.key} c={c} />)}
        </div>
      </div>
    </>
  );
}

window.EditorialFocus = EditorialFocus;
