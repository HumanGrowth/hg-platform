/* eslint-disable @next/next/no-img-element */

// Auth shell: centrado, cream, logo arriba. Sin BetaBanner (eso vive en (app)).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-12">
      <img src="/brand/logo-color.svg" alt="Human Growth" className="mb-10 h-20 w-auto" />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
