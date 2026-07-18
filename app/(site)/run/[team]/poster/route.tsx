import { runPosterImage } from "@/lib/runPosterImage";
import { teamBySlug } from "@/lib/tracks";

/** Stable, human-openable URL for the run poster (the OG route gets a hashed
 *  suffix inside the route group, so open/download buttons point here). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ team: string }> }
) {
  const { team } = await params;
  const ref = teamBySlug(team);
  if (!ref) return new Response("not found", { status: 404 });
  return runPosterImage(ref);
}
