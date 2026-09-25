/**
 * Logo de marca que cambia con el tema: negro sobre glass claro, blanco sobre
 * glass oscuro. Se renderizan ambos y CSS oculta uno según <html data-theme>
 * (así también acierta antes de hidratar, con el tema del sistema).
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/nav/logo-nav-negro@1x.png"
        srcSet="/logo/nav/logo-nav-negro@1x.png 1x, /logo/nav/logo-nav-negro@2x.png 2x, /logo/nav/logo-nav-negro@3x.png 3x"
        alt="Human Growth"
        className={`logo-on-light ${className ?? ""}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/nav/logo-nav-blanco@1x.png"
        srcSet="/logo/nav/logo-nav-blanco@1x.png 1x, /logo/nav/logo-nav-blanco@2x.png 2x, /logo/nav/logo-nav-blanco@3x.png 3x"
        alt="Human Growth"
        className={`logo-on-dark ${className ?? ""}`}
      />
    </>
  );
}
