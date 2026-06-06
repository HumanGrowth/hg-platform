// ============================================================
// Human Growth — Catálogo (micro-cursos estilo Netflix)
// ============================================================

function DurationBadge({ min }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
      background: 'var(--warm-900)', color: 'var(--cream-100)', borderRadius: 999, fontSize: 11.5,
      fontWeight: 700 }}>
      <Icon name="clock" size={12} color="var(--cream-100)" /> {min} min
    </span>);

}

function CourseCard({ c, onOpen }) {
  const d = window.HG.dim(c.dim);
  return (
    <div onClick={() => onOpen(c)} style={{ width: 244, flexShrink: 0, cursor: 'pointer',
      background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12,
      overflow: 'hidden', transition: 'transform .15s var(--ease-out), box-shadow .15s' }}
    onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-3px)';e.currentTarget.style.boxShadow = 'var(--shadow-md)';}}
    onMouseLeave={(e) => {e.currentTarget.style.transform = '';e.currentTarget.style.boxShadow = '';}}>
      {/* thumbnail */}
      <div style={{ position: 'relative', height: 132, background: hexA2(d.color, 0.13),
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -16, bottom: -16, opacity: 0.18 }}>
          <DimIcon dim={d.key} size={120} color={d.color} />
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}><DurationBadge min={c.min} /></div>
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'inline-flex', alignItems: 'center',
          gap: 5, padding: '3px 8px', background: 'var(--bg-raised)', borderRadius: 999, fontSize: 11,
          fontWeight: 800, color: d.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <DimIcon dim={d.key} size={13} color={d.color} /> {d.short}
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--orange-500)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)',
          position: 'relative', zIndex: 1 }}>
          <Icon name="play" size={20} color="#fff" />
        </div>
        {c.progress != null &&
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(26,20,15,0.12)' }}>
            <div style={{ height: '100%', width: `${c.progress}%`, background: 'var(--orange-500)' }} />
          </div>
        }
      </div>
      <div style={{ padding: '13px 14px 15px' }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, margin: '0 0 10px',
          color: 'var(--fg)', minHeight: 38 }}>{c.title}</h4>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <LevelChip code={c.level} size="sm" color={d.color} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar initials={c.mentor[0]} size={22} />
            <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 600 }}>{c.mentor} · IA</span>
          </div>
        </div>
      </div>
    </div>);

}

function Row({ title, subtitle, children, accent }) {
  return (
    <section style={{ marginBottom: 34 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 26, textTransform: 'uppercase',
          letterSpacing: '-0.01em', margin: 0, color: 'var(--fg)' }}>{title}</h3>
        {subtitle && <span style={{ fontSize: 13.5, color: 'var(--fg-muted)' }}>{subtitle}</span>}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 13.5, fontWeight: 700, color: 'var(--orange-700)', cursor: 'pointer' }}>
          Ver todo <Icon name="chevronRight" size={15} color="var(--orange-700)" /></span>
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8,
        scrollbarWidth: 'thin' }}>{children}</div>
    </section>);

}

function LessonModal({ course, onClose }) {
  if (!course) return null;
  const d = window.HG.dim(course.dim);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(26,20,15,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)', background: 'var(--bg-raised)',
        borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ position: 'relative', height: 220, background: hexA2(d.color, 0.16),
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', right: -10, bottom: -20, opacity: 0.2 }}>
            <DimIcon dim={d.key} size={200} color={d.color} /></div>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34,
            borderRadius: 999, border: 'none', background: 'var(--bg-raised)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <Icon name="x" size={18} color="var(--fg)" /></button>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--orange-500)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)', zIndex: 1 }}>
            <Icon name="play" size={26} color="#fff" /></div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <LevelChip code={course.level} size="sm" color={d.color} />
            <DurationBadge min={course.min} />
            <span style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontWeight: 600 }}>{d.label}</span>
          </div>
          <h3 style={{ fontSize: 23, fontWeight: 700, margin: '0 0 8px' }}>{course.title}</h3>
          <p style={{ fontSize: 14.5, color: 'var(--fg-muted)', lineHeight: 1.5, margin: '0 0 18px' }}>
            Una cápsula corta y aplicable, guiada por {course.mentor} (mentor de IA). Termínala en {course.min} minutos
            y llévate una acción concreta para hoy.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="primary" icon="play" onClick={onClose}>Empezar cápsula</Btn>
            <Btn variant="ghost" icon="check" onClick={onClose}>Marcar como vista</Btn>
          </div>
        </div>
      </div>
    </div>);

}

function Catalog({ setView }) {
  const [open, setOpen] = React.useState(null);
  const cat = window.HG.CATALOG;
  const cont = cat.continuar.map((c, i) => ({ ...c, progress: [62, 35, 80][i] }));

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1320, margin: '0 auto' }}>
      {/* greeting + structured-path banner */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        <div>
          <Eyebrow accent>Tu recorrido · Nivel L3</Eyebrow>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, textTransform: 'uppercase',
            letterSpacing: '-0.015em', lineHeight: 0.95, margin: '6px 0 0' }}>HOLA, JORGE</h1>
        </div>
        <Btn variant="ghost" iconRight="arrowRight" onClick={() => setView('profile')}>Ver mi progreso</Btn>
      </div>

      {/* structured system strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '18px 0 30px',
        background: 'var(--orange-50)', border: '1px solid var(--orange-100)', borderRadius: 12, padding: '14px 18px' }}>
        <Icon name="layers" size={22} color="var(--orange-600)" />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700 }}>Un sistema con inicio y cierre, no una biblioteca. </span>
          <span style={{ fontSize: 14.5, color: 'var(--fg-muted)' }}>Vas en la semana 3 de 12 de tu ruta integral.</span>
        </div>
        <div style={{ width: 180 }}><PillarBar value={25} color="var(--orange-500)" height={7} /></div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>25%</span>
      </div>

      <Row title="Continúa donde quedaste" subtitle="Retoma en segundos">
        {cont.map((c, i) => <CourseCard key={i} c={c} onOpen={setOpen} />)}
      </Row>

      {cat.rows.map((r) =>
      <Row key={r.dim} title={r.title} subtitle={`${r.courses.length} cápsulas · ${window.HG.dim(r.dim).desc}`}>
          {r.courses.map((c, i) => <CourseCard key={i} c={c} onOpen={setOpen} />)}
        </Row>
      )}

      <LessonModal course={open} onClose={() => setOpen(null)} />
    </div>);

}

window.Catalog = Catalog;