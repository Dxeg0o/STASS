"use client";

import Navbar from "../components/DeepTech/Navbar";
import Hero from "../components/DeepTech/Hero";
import Problem from "../components/DeepTech/Problem";
import CoreTech from "../components/DeepTech/CoreTech";
import Validation from "../components/DeepTech/Validation";
import Footer from "../components/DeepTech/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-cyan-400/30 font-sans overflow-x-hidden">
      <Navbar />
      <Hero />
      <Problem />
      <CoreTech />
      <Validation />
      <Footer />
    </main>
  );
}
