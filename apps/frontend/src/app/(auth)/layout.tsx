/* eslint-disable @next/next/no-img-element */

// Auth shell: centrado, cream, logo arriba. Sin BetaBanner (eso vive en (app)).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-12">
      <img
        src="/logo/login/logo-login-negro@2x.png"
        srcSet="/logo/login/logo-login-negro@1x.png 1x, /logo/login/logo-login-negro@2x.png 2x, /logo/login/logo-login-negro@3x.png 3x"
        alt="Human Growth"
        className="mb-10 h-14 w-auto"
      />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
