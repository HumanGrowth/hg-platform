import Footer from "@/components/marketing/Footer";
import { MarketingLanguageProvider } from "@/components/marketing/LanguageProvider";
import Nav from "@/components/marketing/Nav";
import { MotionProvider } from "@/components/motion/MotionProvider";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingLanguageProvider>
      <MotionProvider>
        {/* Sticky footer: en páginas cortas el main se estira solo lo necesario
            y el footer verde queda pegado al fondo del viewport. */}
        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </div>
      </MotionProvider>
    </MarketingLanguageProvider>
  );
}
