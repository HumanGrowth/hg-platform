import SupportPublicForm from "@/components/marketing/SupportPublicForm";
import { DocTitle, Tr } from "@/components/marketing/LocalizedText";

export const metadata = { title: "Ayuda — Human Growth" };

export default function AyudaPage() {
  return (
    <div className="landing-flow">
      <DocTitle k="meta.support" />
      <section className="mx-auto w-full max-w-marketing px-5 pb-6 pt-16 md:px-8 md:pt-24">
        <div className="mx-auto max-w-[640px]">
          <div className="eyebrow mb-3">
            <Tr k="support.eyebrow" />
          </div>
          <h1 className="display text-4xl text-fg md:text-5xl">
            <Tr k="support.title" />
          </h1>
          <p className="mt-4 text-lg text-fg-muted">
            <Tr k="support.subtitle" />
          </p>
        </div>
      </section>
      <section className="mx-auto w-full max-w-marketing px-5 pb-24 md:px-8">
        <SupportPublicForm />
      </section>
    </div>
  );
}
