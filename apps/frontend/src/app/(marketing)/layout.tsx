import { AmbientBackdrop } from "@/components/marketing/fx/AmbientBackdrop";
import { ScrollProgress } from "@/components/marketing/fx/ScrollProgress";
import { StickyCta } from "@/components/marketing/fx/StickyCta";
import Footer from "@/components/marketing/Footer";
import { MarketingLanguageProvider } from "@/components/marketing/LanguageProvider";
import Nav from "@/components/marketing/Nav";
import { MotionProvider } from "@/components/motion/MotionProvider";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingLanguageProvider>
      <MotionProvider>
        {/* Sin JS no corren los observers: las entradas animadas quedan visibles. */}
        <noscript>
          <style>{`.rv{opacity:1!important;transform:none!important;filter:none!important}.fx-words .fx-word{opacity:1!important}`}</style>
        </noscript>
        <AmbientBackdrop />
        <ScrollProgress />
        {/* Sticky footer: en páginas cortas el main se estira solo lo necesario
            y el footer verde queda pegado al fondo del viewport. */}
        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </div>
        <StickyCta />
      </MotionProvider>
    </MarketingLanguageProvider>
  );
}
