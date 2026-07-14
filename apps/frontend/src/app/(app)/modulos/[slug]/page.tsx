import { ModuloDetailView } from "@/components/modulos/ModuloDetailView";

export default function ModuloDetailPage({ params }: { params: { slug: string } }) {
  return <ModuloDetailView slug={params.slug} />;
}
