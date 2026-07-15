import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SleeveTheme from "@/components/SleeveTheme";
import { getTrack, sleeveThemeVars } from "@/lib/tracks";

/**
 * Track chrome: Header/Footer render inside the sleeve-themed wrapper so the
 * whole page is server-painted in the track's palette — no flash of the
 * night-mode header on load. SleeveTheme still lifts the vars to <html> for
 * the body background behind overscroll.
 */
export default async function TrackLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const track = getTrack(Number(id));
  if (!track) notFound();

  return (
    <div
      style={sleeveThemeVars(track)}
      className="flex flex-1 flex-col bg-background text-foreground"
    >
      <SleeveTheme track={track} />
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
