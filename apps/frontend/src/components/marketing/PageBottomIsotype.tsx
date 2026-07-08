/** Logo "Hï" centrado al pie de página, antes del Footer (decisión D, web-v3). */
export function PageBottomIsotype() {
  return (
    <div className="landing-flow-section flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/isotype/isotype-oscuro.svg"
        alt=""
        aria-hidden
        className="h-24 w-auto opacity-[0.4]"
      />
    </div>
  );
}
