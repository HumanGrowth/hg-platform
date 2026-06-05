// ============================================================
// Human Growth — Landing page (Spanish, marketing)
// Props: onEnter (→ app), onAssessment (→ diagnóstico), onLeader
// ============================================================

function LandingNav({ onEnter, onAssessment }) {
  const link = { fontSize: 14.5, fontWeight: 600, color: 'var(--fg-muted)', cursor: 'pointer' };
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(253,245,230,0.82)',
      backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 32px', display: 'flex',
        alignItems: 'center', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 12 }}>
          <RingMark size={30} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase',
            letterSpacing: '0.02em', lineHeight: 1 }}>Human Growth</span>
        </div>
        <nav style={{ display: 'flex', gap: 24, marginRight: 'auto' }}>
          <span style={link}>El método</span>
          <span style={link} onClick={onAssessment}>Diagnóstico</span>
          <span style={link}>Para empresas</span>
          <span style={link}>Precios</span>
        </nav>
        <span style={{ ...link, color: 'var(--fg)' }} onClick={onEnter}>Iniciar sesión</span>
        <button onClick={onEnter} style={btnPrimary}>Agendar piloto gratuito</button>
      </div>
    </header>
  );
}

const btnPrimary = {
  background: 'var(--orange-500)', color: '#fff', border: 'none', borderRadius: 8,
  padding: '12px 20px', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
};
const btnGhost = {
  background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-strong)',
  borderRadius: 8, padding: '12px 20px', fontFamily: 'var(--font-body)', fontSize: 14.5,
  fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
};

function Landing({ onEnter, onAssessment, onLeader }) {
  const dims = window.HG.DIMS;
  const radarAxes = dims.map((d) => ({ label: d.label, short: d.short }));
  const radarData = [{ name: 'Tú', color: 'var(--orange-500)',
    values: [72, 63, 68, 70, 57, 75], fill: 0.18 }];

  return (
    <div style={{ background: 'var(--cream-100)', color: 'var(--fg)', fontFamily: 'var(--font-body)',
      minHeight: '100%', overflowY: 'auto' }}>
      <LandingNav onEnter={onEnter} onAssessment={onAssessment} />

      {/* HERO */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 32px 64px',
        display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 56, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px',
            background: 'var(--orange-50)', borderRadius: 999, marginBottom: 22 }}>
            <Icon name="sparkles" size={15} color="var(--orange-600)" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--orange-700)',
              textTransform: 'uppercase', letterSpacing: '0.1em' }}>Desarrollo humano integral</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 64, lineHeight: 0.96,
            textTransform: 'uppercase', letterSpacing: '-0.015em', margin: 0 }}>
            Crece en todas las<br /><span style={{ color: 'var(--orange-500)' }}>dimensiones</span> de tu vida
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 22,
            lineHeight: 1.4, color: 'var(--fg-muted)', margin: '22px 0 30px', maxWidth: 520 }}>
            Apoyamos a cada profesional para que crezca de forma integral —carrera, propósito,
            relaciones, salud, paz interior y estabilidad— con un sistema estructurado, no otra
            biblioteca de videos.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={onEnter} style={{ ...btnPrimary, padding: '14px 24px', fontSize: 15.5 }}>
              Agendar piloto gratuito <Icon name="arrowRight" size={17} color="#fff" />
            </button>
            <button onClick={onAssessment} style={{ ...btnGhost, padding: '14px 24px', fontSize: 15.5 }}>
              Hacer el diagnóstico
            </button>
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 30 }}>
            {[['<5 min', 'por cápsula'], ['6', 'dimensiones'], ['L1 → L6', 'recorrido']].map(([a, b], i) => (
              <div key={i}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--fg)' }}>{a}</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-subtle)', fontWeight: 600 }}>{b}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero card: signature 6D radar */}
        <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 16,
          padding: 24, boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Eyebrow accent>Tu perfil HG-6D</Eyebrow>
            <span style={{ fontSize: 12, color: 'var(--fg-subtle)', fontWeight: 600 }}>Diagnóstico inicial</span>
          </div>
          <RadarChart axes={radarAxes} datasets={radarData} size={320} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8,
            padding: '12px 14px', background: 'var(--orange-50)', borderRadius: 10 }}>
            <Icon name="target" size={20} color="var(--orange-600)" />
            <span style={{ fontSize: 13.5, color: 'var(--warm-800)', fontWeight: 600 }}>
              Identifica tus cuellos de botella y recibe el siguiente paso ideal.</span>
          </div>
        </div>
      </section>

      {/* PROBLEMA — data-driven */}
      <section style={{ background: 'var(--warm-900)', color: 'var(--cream-100)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '84px 32px',
          display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <Eyebrow style={{ color: 'var(--orange-300)' }}>El problema</Eyebrow>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, margin: '14px 0 8px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 132, lineHeight: 0.8,
                color: 'var(--orange-500)', letterSpacing: '-0.02em' }}>39%</span>
            </div>
            <p style={{ fontSize: 19, lineHeight: 1.5, color: 'var(--cream-200)', maxWidth: 440, margin: 0 }}>
              de las habilidades actuales serán <strong style={{ color: '#fff' }}>obsoletas para 2030</strong>.
              La formación tradicional no alcanza el ritmo —y abruma al trabajador operativo.
            </p>
            <div style={{ fontSize: 12.5, color: 'var(--warm-300)', marginTop: 16 }}>
              Fuente: WEF · Future of Jobs Report
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { icon: 'trendingDown', stat: '1 de 2', label: 'trabajadores necesita recapacitarse esta década.' },
              { icon: 'clock', stat: '−60%', label: 'de retención cuando el aprendizaje no se aplica al trabajo.' },
              { icon: 'users', stat: '6–9 meses', label: 'de salario: el costo de reemplazar a quien renuncia.' },
              { icon: 'bolt', stat: '23h/sem', label: 'de tiempo operativo perdido por estrés y desconexión.' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,235,214,0.1)',
                borderRadius: 12, padding: 20 }}>
                <Icon name={c.icon} size={22} color="var(--orange-300)" />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, marginTop: 12,
                  color: '#fff', lineHeight: 0.9 }}>{c.stat}</div>
                <div style={{ fontSize: 13.5, color: 'var(--cream-200)', marginTop: 8, lineHeight: 1.4 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUCIÓN — HG-6D */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '84px 32px' }}>
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
          <Eyebrow accent style={{ justifyContent: 'center' }}>El método HG-6D</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 48, textTransform: 'uppercase',
            letterSpacing: '-0.015em', lineHeight: 0.98, margin: '12px 0 16px' }}>
            Un sistema, no un catálogo
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--fg-muted)', margin: 0 }}>
            Seis dimensiones, un recorrido con inicio y cierre. Cada persona avanza por niveles
            con cápsulas cortas y aplicables —y una medición clara de su progreso.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {dims.map((d) => (
            <div key={d.key} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 24, transition: 'box-shadow .15s' }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: hexA(d.color, 0.12), marginBottom: 16 }}>
                <DimIcon dim={d.key} size={26} color={d.color} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, textTransform: 'uppercase',
                letterSpacing: '-0.01em', margin: '0 0 8px' }}>{d.label}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--fg-muted)', margin: 0 }}>{d.desc}</p>
            </div>
          ))}
        </div>

        {/* micro-learning band */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 28,
          background: 'var(--orange-50)', border: '1px solid var(--orange-100)', borderRadius: 16, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56,
            borderRadius: 28, background: 'var(--orange-500)', flexShrink: 0 }}>
            <Icon name="play" size={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 4px' }}>Cápsulas de 5 minutos, aplicables hoy</h3>
            <p style={{ fontSize: 14.5, color: 'var(--fg-muted)', margin: 0 }}>
              Lecciones cortas con mentores de IA, pensadas para no abrumar a quien trabaja en operación.</p>
          </div>
          <button onClick={onEnter} style={btnGhost}>Ver el catálogo</button>
        </div>
      </section>

      {/* B2B — para RRHH */}
      <section style={{ background: 'var(--cream-200)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '84px 32px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <Eyebrow accent>Para líderes de RRHH</Eyebrow>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 46, textTransform: 'uppercase',
              letterSpacing: '-0.015em', lineHeight: 0.98, margin: '12px 0 18px' }}>
              ROI que se mide, no se promete
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: 'users', t: 'Menos rotación', d: 'Equipos que crecen se quedan. Reduce la fuga de talento clave.' },
                { icon: 'chart', t: 'Métricas de desempeño', d: 'Reportes de gap entrada vs. salida por dimensión y por persona.' },
                { icon: 'bolt', t: 'Baja carga operativa', d: 'Programa de autoservicio: se administra solo, sin sumar trabajo a RRHH.' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg-raised)',
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={c.icon} size={20} color="var(--orange-600)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: '2px 0 4px' }}>{c.t}</h3>
                    <p style={{ fontSize: 14.5, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.45 }}>{c.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button onClick={onEnter} style={btnPrimary}>Agendar piloto gratuito</button>
              <button onClick={onLeader} style={btnGhost}>Ver panel del líder <Icon name="arrowRight" size={16} /></button>
            </div>
          </div>

          {/* ROI preview: gap entrada vs salida */}
          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 16,
            padding: 24, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 15.5, fontWeight: 700, margin: 0 }}>Gap del equipo · entrada vs. salida</h3>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5,
                fontWeight: 700, color: 'var(--success)' }}>
                <Icon name="trendingUp" size={15} color="var(--success)" /> +22 pts prom.</span>
            </div>
            <GapBars data={window.HG.TEAM_GAP} dims={dims} compact />
          </div>
        </div>
      </section>

      {/* CTA final + footer */}
      <section style={{ background: 'var(--warm-900)', color: 'var(--cream-100)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
          <RingMark size={48} color="var(--orange-500)" />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 52, textTransform: 'uppercase',
            letterSpacing: '-0.015em', lineHeight: 0.98, margin: '20px 0 14px' }}>
            Empieza el recorrido de tu equipo
          </h2>
          <p style={{ fontSize: 17, color: 'var(--cream-200)', maxWidth: 520, margin: '0 auto 28px' }}>
            Un piloto gratuito de 30 días. Sin tarjeta, sin fricción para RRHH.</p>
          <button onClick={onEnter} style={{ ...btnPrimary, padding: '15px 28px', fontSize: 16 }}>
            Agendar piloto gratuito <Icon name="arrowRight" size={18} color="#fff" />
          </button>
        </div>
        <div style={{ borderTop: '1px solid rgba(245,235,214,0.12)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px', display: 'flex',
            alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--warm-300)' }}>
            <RingMark size={22} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, textTransform: 'uppercase',
              letterSpacing: '0.04em', color: 'var(--cream-100)' }}>Human Growth</span>
            <span style={{ marginLeft: 'auto' }}>© 2026 Human Growth · Hecho para que la gente crezca</span>
          </div>
        </div>
      </section>
    </div>
  );
}

// hex + alpha helper
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

window.Landing = Landing;
window.hexA = hexA;
