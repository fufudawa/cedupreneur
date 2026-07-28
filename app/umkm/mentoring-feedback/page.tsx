import { redirect } from "next/navigation";

// Old route kept as a redirect so existing links don't 404 — the feature now lives at /umkm/mentoring.
export default function UmkmMentoringFeedbackRedirect() {
  redirect("/umkm/mentoring");
}
