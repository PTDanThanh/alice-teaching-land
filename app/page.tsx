"use client";

import { useState } from "react";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Home from "./(main)/home/home";

export default function Page() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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