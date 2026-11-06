import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Home from "./(main)/home/home";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <Header />

      <main className="grow">
        <Home />
      </main>

      <Footer />
    </div>
  );
}