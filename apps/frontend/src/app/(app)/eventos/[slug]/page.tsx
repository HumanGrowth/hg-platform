import { CourseDetailView } from "@/components/library/CourseDetailView";

export default function CourseDetailPage({ params }: { params: { slug: string } }) {
  return <CourseDetailView slug={params.slug} />;
}
