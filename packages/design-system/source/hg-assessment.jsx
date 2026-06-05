// ============================================================
// Human Growth — Diagnóstico situacional + Resultados (radar 6D)
// Phases: intro → questions → results
// ============================================================

function Likert({ value, onPick }) {
  const scale = window.HG.SCALE;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${scale.length}, 1fr)`, gap: 10 }}>
      {scale.map((s) => {
        const active = value === s.v;
        return (
          <button key={s.v} onClick={() => onPick(s.v)} style={{
            padding: '18px 10px', borderRadius: 12, cursor: 'pointer',
            border: active ? '2px solid var(--orange-500)' : '1px solid var(--border)',
            background: active ? 'var(--orange-50)' : 'var(--bg-raised)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            transition: 'all var(--dur-fast) var(--ease-state)', fontFamily: 'var(--font-body)' }}>
            <span style={{ width: 26, height: 26, borderRadius: 999,
              border: active ? 'none' : '2px solid var(--border-strong)',
              background: active ? 'var(--orange-500)' : 'transparent', display: 'flex',
              alignItems: 'center', justifyContent: 'center' }}>
              {active && <Icon name="check" size={15} color="#fff" />}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--orange-700)' : 'var(--fg-muted)' }}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function scoresFromAnswers(answers) {
  const dims = window.HG.DIMS, Q = window.HG.QUESTIONS;
  return dims.map((d) => {
    const idxs = Q.map((q, i) => (q.dim === d.key ? i : -1)).filter((i) => i >= 0);
    const ans = idxs.map((i) => answers[i]).filter((v) => v != null);
    const score = ans.length
      ? Math.round((ans.reduce((a, b) => a + b, 0) / ans.length) * 20)
      : window.HG.PERSONAL[d.key].now; // fallback to demo baseline
    return { ...d, score };
  });
}

function Assessment({ setView }) {
  const Q = window.HG.QUESTIONS;
  const [phase, setPhase] = React.useState('intro');
  const [idx, setIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState({});

  const total = Q.length;
  const answered = Object.keys(answers).length;
  const pct = Math.round((answered / total) * 100);

  if (phase === 'intro') return <AssessmentIntro total={total} onStart={() => setPhase('questions')}
    onDemo={() => setPhase('results')} />;

  if (phase === 'results') return <Results scores={scoresFromAnswers(answers)} setView={setView}
    onRetake={() => { setAnswers({}); setIdx(0); setPhase('intro'); }} />;

  // questions
  const q = Q[idx];
  const d = window.HG.dim(q.dim);
  const pick = (v) => {
    const next = { ...answers, [idx]: v };
    setAnswers(next);
    setTimeout(() => { if (idx < total - 1) setIdx(idx + 1); else setPhase('results'); }, 180);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 32px 56px' }}>
      {/* progress */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg-muted)' }}>
            Pregunta {idx + 1} de {total}</span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--orange-700)' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-sunken)', borderRadius: 999 }}>
          <div style={{ height: '100%', width: `${((idx) / total) * 100}%`, background: 'var(--orange-500)',
            borderRadius: 999, transition: 'width .3s var(--ease-out)' }} />
        </div>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px',
        background: hexA2(d.color, 0.12), borderRadius: 999, marginBottom: 18 }}>
        <DimIcon dim={d.key} size={16} color={d.color} />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: d.color, textTransform: 'uppercase',
          letterSpacing: '0.06em' }}>{d.label}</span>
      </div>

      <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.3, margin: '0 0 32px', color: 'var(--fg)',
        textWrap: 'balance' }}>{q.text}</h2>

      <Likert value={answers[idx]} onPick={pick} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32 }}>
        <Btn variant="quiet" icon="chevronLeft" onClick={() => setIdx(Math.max(0, idx - 1))}
          style={{ visibility: idx === 0 ? 'hidden' : 'visible' }}>Atrás</Btn>
        <span style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>Sin respuestas correctas — sé honesto.</span>
        <Btn variant="ghost" iconRight="chevronRight" onClick={() => idx < total - 1 ? setIdx(idx + 1) : setPhase('results')}>
          {answers[idx] ? 'Siguiente' : 'Saltar'}</Btn>
      </div>
    </div>
  );
}

function AssessmentIntro({ total, onStart, onDemo }) {
  const dims = window.HG.DIMS;
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '52px 32px' }}>
      <div style={{ textAlign: 'center', marginBottom: 34 }}>
        <div style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: 16,
          background: 'var(--orange-50)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Icon name="clipboard" size={30} color="var(--orange-600)" />
        </div>
        <Eyebrow accent style={{ justifyContent: 'center' }}>Diagnóstico situacional</Eyebrow>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 46, textTransform: 'uppercase',
          letterSpacing: '-0.015em', lineHeight: 0.98, margin: '12px 0 14px' }}>
          ¿Dónde estás hoy?</h1>
        <p style={{ fontSize: 17, color: 'var(--fg-muted)', lineHeight: 1.55, maxWidth: 520, margin: '0 auto' }}>
          {total} preguntas, unos 6 minutos. Sin respuestas correctas: mide tu punto de partida en las
          6 dimensiones para encontrar tus cuellos de botella.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 30 }}>
        {dims.map((d) => (
          <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
            background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <DimIcon dim={d.key} size={20} color={d.color} />
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{d.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
        <Btn variant="primary" size="lg" iconRight="arrowRight" onClick={onStart}>Empezar diagnóstico</Btn>
        <Btn variant="quiet" onClick={onDemo}>Ver resultado de ejemplo</Btn>
      </div>
    </div>
  );
}

function Results({ scores, setView, onRetake }) {
  const axes = scores.map((s) => ({ label: s.label, short: s.short }));
  const radar = [
    { name: 'Tú', color: 'var(--orange-500)', values: scores.map((s) => s.score), fill: 0.2 },
    { name: 'Meta', color: 'var(--fg-subtle)', values: scores.map((s) => window.HG.PERSONAL[s.key].target), fill: 0 },
  ];
  const bottlenecks = [...scores].sort((a, b) => a.score - b.score).slice(0, 2);
  const recFor = (dimKey) => (window.HG.CATALOG.rows.find((r) => r.dim === dimKey) || { courses: [] }).courses[0];

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 32px 56px' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <Eyebrow accent style={{ justifyContent: 'center' }}>Tu perfil HG-6D</Eyebrow>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, textTransform: 'uppercase',
          letterSpacing: '-0.015em', lineHeight: 0.98, margin: '10px 0 4px' }}>Esto dice tu diagnóstico</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.92fr', gap: 32, alignItems: 'center',
        marginTop: 24 }}>
        {/* radar */}
        <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <RadarChart axes={axes} datasets={radar} size={360} />
          <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 4 }}>
            <LegendDot color="var(--orange-500)" label="Tú" />
            <LegendDot color="var(--fg-subtle)" dashed label="Meta sugerida" />
          </div>
        </div>

        {/* bottlenecks + scores */}
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 700, margin: '0 0 14px' }}>
            <Icon name="target" size={20} color="var(--orange-600)" /> Tus cuellos de botella</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {bottlenecks.map((b) => {
              const rec = recFor(b.key);
              return (
                <div key={b.key} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16,
                  background: 'var(--bg-raised)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', background: hexA2(b.color, 0.14) }}>
                      <DimIcon dim={b.key} size={20} color={b.color} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{b.label}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>Puntaje {b.score} / 100</div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: b.color }}>{b.score}</span>
                  </div>
                  {rec && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10,
                      borderTop: '1px solid var(--border)' }}>
                      <Icon name="playCircle" size={18} color="var(--orange-600)" />
                      <span style={{ fontSize: 13.5, flex: 1 }}>Empieza con <strong>“{rec.title}”</strong> · {rec.min} min</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="primary" iconRight="arrowRight" onClick={() => setView('catalog')}>Empezar mi siguiente paso</Btn>
            <Btn variant="ghost" onClick={() => setView('profile')}>Ver mi perfil</Btn>
          </div>
          <button onClick={onRetake} style={{ marginTop: 14, background: 'none', border: 'none',
            color: 'var(--fg-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)' }}>↺ Volver a hacer el diagnóstico</button>
        </div>
      </div>
    </div>
  );
}

window.Assessment = Assessment;
