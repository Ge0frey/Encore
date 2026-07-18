import { runPosterImage, RUN_POSTER_SIZE } from "@/lib/runPosterImage";
import { allTeams, teamBySlug } from "@/lib/tracks";

export const size = RUN_POSTER_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return allTeams.map((t) => ({ team: t.slug }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ team: string }>;
}) {
  const { team } = await params;
  const ref = teamBySlug(team);
  if (!ref) return new Response("not found", { status: 404 });
  return runPosterImage(ref);
}
