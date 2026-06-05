// ============================================================
// Human Growth — Prototype router
// Landing (marketing) ⇆ App shell (catalog/assessment/profile/leader)
// ============================================================

const { useState, useEffect } = React;

function HGApp() {
  // route: 'landing' or an app view id
  const [route, setRoute] = useState(() => {
    const h = (location.hash || '').replace('#', '');
    return h || 'landing';
  });

  useEffect(() => {
    const onHash = () => setRoute((location.hash || '').replace('#', '') || 'landing');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (r) => { location.hash = r; setRoute(r); };

  if (route === 'landing') {
    return <Landing onEnter={() => go('catalog')} onAssessment={() => go('assessment')}
      onLeader={() => go('leader')} />;
  }

  const appViews = ['catalog', 'assessment', 'profile', 'leader'];
  const view = appViews.includes(route) ? route : 'catalog';
  return <AppShell view={view} setView={go} onExit={() => go('landing')} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<HGApp />);
