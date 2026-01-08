"use client";

import Link from "next/link";
import { ArrowRight, Brain, Rocket, Globe, PlayCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/AuthContext";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030014]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (user) {
    return (
      <main className="min-h-screen relative overflow-hidden flex flex-col items-center">
        {/* Background Ambience */}
        <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[70vw] h-[70vw] bg-purple-900/30 rounded-full blur-[120px] animate-blob"></div>
          <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-900/30 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        </div>

        <Navbar />

        {/* Render Dashboard instead of Hero if logged in */}
        <Dashboard user={user} profile={profile} />
      </main>
    );
  }

  // Not Logged In -> Show Landing Page
  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center">

      {/* Background Ambience */}
      <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[70vw] h-[70vw] bg-purple-900/30 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-900/30 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-pink-900/20 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center max-w-5xl px-4 pt-20 pb-32 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-indigo-500/30 mb-8 backdrop-blur-md">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="text-sm font-medium text-indigo-200">The Future of Career Guidance is Here</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-[1.1]">
          Master Your <span className="text-gradient">Passion</span>
          <br /> with AI Precision
        </h1>

        <p className="text-xl text-muted mb-12 max-w-2xl leading-relaxed">
          Lernova analyzes your unique digital footprint to build personalized learning roadmaps,
          connect you with mentors, and guide you from ambition to mastery.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link href="/analyze">
            <button className="btn btn-primary text-lg px-8 py-4 group">
              Start Free Analysis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <button className="btn btn-secondary text-lg px-8 py-4 group">
            <PlayCircle className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            Watch Demo
          </button>
        </div>

        {/* Hero Image / dashboard mock */}
        <div className="mt-20 w-full relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-30"></div>
          <div className="relative glass-panel rounded-2xl p-4 border-white/10 aspect-[16/9] shadow-2xl flex items-center justify-center bg-black/40">
            <p className="text-muted">Dashboard UI Mockup / Interactive Graph Placeholder</p>
            {/* Note: In a real app, placeholder image goes here */}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full max-w-7xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Powered by Advanced Intelligence</h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">We combine social data analysis with generative AI to offer guidance that is surprisingly personal and effectively actionable.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Globe className="w-8 h-8 text-blue-400" />}
            title="Social Deep Scan"
            desc="Our algorithms analyze your public interactions to uncover latent interests you didn't even know you had."
          />
          <FeatureCard
            icon={<Brain className="w-8 h-8 text-purple-400" />}
            title="Hyper-Personalized Mentorship"
            desc="Chat with an AI that knows your context. It adapts its advice based on your progress and changing goals."
          />
          <FeatureCard
            icon={<Rocket className="w-8 h-8 text-pink-400" />}
            title="Dynamic Skill Roadmaps"
            desc="Forget static courses. Get a living curriculum that updates automatically as industry trends shift."
          />
        </div>
      </section>

    </main>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="glass-panel p-8 hover:bg-white/5 transition-all duration-300 hover:-translate-y-2 group">
      <div className="mb-6 p-4 rounded-2xl bg-white/5 w-fit border border-white/10 group-hover:border-white/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-3 group-hover:text-white/90">{title}</h3>
      <p className="text-muted leading-relaxed">{desc}</p>
    </div>
  );
}
