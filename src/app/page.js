"use client";

import Link from "next/link";
import { ArrowRight, Brain, Rocket, Globe, PlayCircle, CheckCircle2 } from "lucide-react";
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

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center">
      {/* Background Ambience */}
      <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[70vw] h-[70vw] bg-purple-900/30 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-900/30 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>

      <Navbar />

      {/* CONDITIONAL CONTENT: Dashboard (Logged In) OR Hero (Logged Out) */}
      {user ? (
        <Dashboard user={user} profile={profile} />
      ) : (
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
            <div className="relative glass-panel rounded-2xl p-2 border-white/10 aspect-[16/9] shadow-2xl flex items-center justify-center bg-black/40 overflow-hidden">
              <video
                src="/screenrecording.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>
        </section>
      )}

      {/* MARKETING SECTIONS (Features, How it Works, Pricing)
          Now rendered for BOTH Logged In and Logged Out states 
          so the navbar links always have a target to scroll to.
      */}

      {/* Features Section */}
      <section id="features" className="w-full max-w-7xl px-6 py-24 border-t border-white/5">
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

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full max-w-7xl px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">How It Works</h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">From data to career mastery in three simple steps.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-500/0 via-purple-500/50 to-pink-500/0 border-t border-dashed border-white/20 -z-10"></div>

          <StepCard number="1" title="Connect Data" desc="Securely link your YouTube and GitHub profiles to give Lernova a view of your true interests." />
          <StepCard number="2" title="AI Analysis" desc="Our Gemini-powered engine builds a psychometric profile of your skills and learning style." />
          <StepCard number="3" title="Get Guided" desc="Receive a personalized roadmap and daily micro-tasks to reach your career goals." />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="w-full max-w-7xl px-6 py-24 border-t border-white/5 mb-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Simple Pricing</h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">Start for free, upgrade when you're ready to master your craft.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingCard title="Starter" price="$0" features={["Social Data Analysis", "Basic Roadmap", "Community Support"]} />
          <PricingCard title="Pro" price="$12" features={["Deep Skill Audit", "AI Mentor Chat", "Live Project Reviews", "Certificate of Mastery"]} featured={true} />
          <PricingCard title="Team" price="$49" features={["Team Analytics", "Collaborative Learning", "Admin Dashboard", "API Access"]} />
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

function StepCard({ number, title, desc }) {
  return (
    <div className="glass-panel p-8 flex flex-col items-center text-center relative z-10 bg-[#0A0520] border-gray-800">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold mb-6 shadow-lg shadow-purple-500/20">
        {number}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted text-sm">{desc}</p>
    </div>
  )
}

function PricingCard({ title, price, features, featured = false }) {
  return (
    <div className={`glass-panel p-8 flex flex-col relative ${featured ? 'border-indigo-500/50 shadow-2xl shadow-indigo-500/10' : ''}`}>
      {featured && (
        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
          MOST POPULAR
        </div>
      )}
      <h3 className="text-xl font-medium text-gray-300 mb-2">{title}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold text-white">{price}</span>
        <span className="text-muted">/mo</span>
      </div>
      <ul className="flex-1 space-y-4 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            {feature}
          </li>
        ))}
      </ul>
      <button className={`btn w-full py-3 ${featured ? 'btn-primary' : 'btn-secondary'}`}>
        Choose {title}
      </button>
    </div>
  )
}
