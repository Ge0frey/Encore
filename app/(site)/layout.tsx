import Header from "@/components/Header";
import Footer from "@/components/Footer";

/** Default chrome for every page except /track/[id] (which themes its own). */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </>
  );
}
