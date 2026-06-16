import Nav from "@/components/marketing/Nav";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="min-h-screen">{children}</main>
      {/* <Footer /> se agrega en FE-v2-05 */}
    </>
  );
}
