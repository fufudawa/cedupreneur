import { redirect } from "next/navigation";

// Old route kept as a redirect so existing links don't 404 — the feature now lives at /umkm/mentoring/[id].
export default async function UmkmMentoringFeedbackDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/umkm/mentoring/${id}`);
}
