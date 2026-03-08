"use client";

import Link from "next/link";
import { ArrowRight, Brain, Rocket, Globe, PlayCircle, Github, Youtube, MessageCircle, Instagram, FileText, Sparkles, Target, Zap, CheckCircle2, Database, Star, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/AuthContext";

export default function Home() {
  const { user, profile, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030014]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const mockInterests = ["Indie Game Dev", "Generative Art", "Cinematography", "Machine Learning", "Behavioral Economics", "Urban Photography", "Bouldering", "Synthesizers"];
  const mockSkills = ["Python", "React", "Data Structures", "Color Theory", "Technical Writing", "Agile Methodologies", "Public Speaking", "SEO Optimization", "WebGL"];

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center">
      {/* Background Ambience */}
      <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[70vw] h-[70vw] bg-purple-900/30 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-900/30 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>

      <Navbar />

      <section className="flex flex-col items-center text-center max-w-5xl px-4 pt-20 pb-32 z-10 relative w-full">
        {/* Floating Quick Facts isolated to large screens */}
        <QuickFact
          fact="Over 85% of people possess high-income baseline skills they remain completely unaware of."
          className="absolute xl:-left-10 2xl:-left-52 top-[15%] -rotate-6"
        />
        <QuickFact
          fact="Only 10% of professionals have total clarity on their ultimate career trajectory."
          className="absolute xl:-right-10 2xl:-right-32 top-[40%] rotate-3"
        />

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
          <button onClick={login} className="btn btn-primary text-lg px-8 py-4 group">
            Start Free Analysis
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={() => document.getElementById('demo-video')?.scrollIntoView({ behavior: 'smooth' })} className="btn btn-secondary text-lg px-8 py-4 group">
            <PlayCircle className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            Watch Demo
          </button>
        </div>

        {/* Hero Image / dashboard mock */}
        <div id="demo-video" className="mt-20 w-full relative scroll-mt-32">
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
        <QuickFact
          fact="Aggregating scattered interests into a unified profile instantly highlights an individual's compounding market value."
          className="absolute lg:-left-10 xl:-left-20 2xl:-left-40 -bottom-4 lg:-bottom-8 xl:-bottom-12 -rotate-3 scale-90 z-30"
        />
      </section>

      {/* Ecosystem Section */}
      <section className="w-full py-10 bg-white/[0.02] overflow-hidden flex flex-col items-center justify-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[3px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100vw] h-[3px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-8">Intelligence Fueled By Your Digital Life</p>
        <div className="flex flex-wrap justify-center gap-10 md:gap-20 opacity-40 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="flex items-center gap-2 font-black text-xl tracking-tight"><Youtube className="w-8 h-8 text-red-500" /> YouTube</div>
          <div className="flex items-center gap-2 font-black text-xl tracking-tight"><Github className="w-8 h-8 text-white" /> GitHub</div>
          <div className="flex items-center gap-2 font-black text-xl tracking-tight"><MessageCircle className="w-8 h-8 text-orange-500" /> Reddit</div>
          <div className="flex items-center gap-2 font-black text-xl tracking-tight"><Instagram className="w-8 h-8 text-pink-500" /> Instagram</div>
          <div className="flex items-center gap-2 font-black text-xl tracking-tight"><FileText className="w-8 h-8 text-blue-500" /> Documents</div>
        </div>
      </section>

      {/* Showcase Data Preview */}
      <section className="w-full max-w-7xl px-6 py-20 flex flex-col items-center relative z-20">
        <h2 className="text-4xl md:text-5xl font-black mb-3 tracking-tighter text-center mt-8">
          Unified <span className="text-gradient">Profile Inventory</span>
        </h2>
        <p className="text-gray-400 mb-12 text-center text-xl font-medium max-w-2xl leading-relaxed">
          We aggregate all your scattered knowledge into one cohesive dashboard. Instantly see your true market value based on everything you interact with online.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <div className="glass-panel p-8 bg-yellow-500/5 border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.05)]">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-yellow-300">
              <Star className="w-6 h-6 text-yellow-400" /> Extracted Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {mockInterests.map((item, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-yellow-500/10 text-yellow-200 rounded-lg text-sm font-bold border border-yellow-500/20">
                  {item}
                </span>
              ))}
              <span className="px-3 py-1.5 bg-yellow-500/5 text-yellow-400/50 rounded-lg text-sm font-bold">
                +12 more
              </span>
            </div>
          </div>

          <div className="glass-panel p-8 bg-purple-500/5 border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-purple-300">
              <Trophy className="w-6 h-6 text-purple-400" /> Verified Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {mockSkills.map((item, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-purple-500/10 text-purple-200 rounded-lg text-sm font-bold border border-purple-500/20">
                  {item}
                </span>
              ))}
              <span className="px-3 py-1.5 bg-purple-500/5 text-purple-400/50 rounded-lg text-sm font-bold">
                +8 more
              </span>
            </div>
            {/* QuickFact placed right under the WebGL card */}
            <QuickFact
              fact="Analyzing passive digital habits can uncover technical and soft skills worth highlighting on your resume."
              className="absolute -bottom-20 right-0 rotate-6 z-30"
            />
          </div>
        </div>
      </section>

      {/* Feature Block 1: Deep Discovery */}
      <section id="discovery" className="w-full max-w-7xl px-6 py-32 flex flex-col md:flex-row items-center gap-16 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[3px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="flex-1 space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-4 h-4" /> Profile Discovery
          </div>
          <h2 className="text-5xl md:text-6xl font-black leading-tight tracking-tighter">Your Digital Footprint,<br /><span className="text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">Decoded.</span></h2>
          <p className="text-xl text-muted leading-relaxed font-medium">We analyze your watched videos, code commits, and social interactions to build a deeply accurate psychological and technical profile. Discover skills and interests you didn't even know you had.</p>
          <ul className="space-y-5 mt-8 text-gray-300 font-medium">
            <li className="flex items-center gap-4"><CheckCircle2 className="w-6 h-6 text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> Automatic Skill Extraction</li>
            <li className="flex items-center gap-4"><CheckCircle2 className="w-6 h-6 text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> Personality & Strength Analysis</li>
            <li className="flex items-center gap-4"><CheckCircle2 className="w-6 h-6 text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> Real-time Knowledge Graph</li>
          </ul>
          <div className="relative h-32 w-full mt-12 hidden xl:block">
            <QuickFact
              fact="Analyzing passive digital habits can uncover technical and soft skills worth highlighting on your resume."
              className="top-20 xl:left-0 2xl:left-8 -rotate-6 z-20"
            />
          </div>
        </div>
        <div className="flex-1 w-full flex justify-center z-10">
          <div className="relative w-full max-w-lg hover:scale-105 transition-transform duration-700">
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-[3rem]"></div>
            <div className="glass-panel p-8 relative border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] bg-slate-900/80">
              <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                <span className="font-black text-2xl uppercase tracking-tighter text-white">Inferred Core Skills</span>
                <Database className="w-8 h-8 text-blue-400" />
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-xl text-sm font-bold border border-blue-500/30 shadow-lg shadow-blue-500/10">Vocal Training</span>
                <span className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-sm font-bold border border-purple-500/30 shadow-lg shadow-purple-500/10">Music Theory</span>
                <span className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl text-sm font-bold border border-emerald-500/30 shadow-lg shadow-emerald-500/10">Creative Writing</span>
                <span className="px-4 py-2 bg-pink-500/20 text-pink-300 rounded-xl text-sm font-bold border border-pink-500/30 shadow-lg shadow-pink-500/10">Digital Marketing</span>
                <span className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-xl text-sm font-bold border border-yellow-500/30 shadow-lg shadow-yellow-500/10">Public Speaking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Block 2: AI Architect */}
      <section id="architect" className="w-full max-w-7xl px-6 py-32 flex flex-col md:flex-row-reverse items-center gap-16 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[3px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>
        <QuickFact
          fact="Adaptive, personalized learning paths increase course completion rates by up to 60% compared to static tutorials."
          className="absolute xl:right-0 2xl:-right-12 -top-6 rotate-3 z-20"
        />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="flex-1 space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest">
            <Target className="w-4 h-4" /> Career Architect
          </div>
          <h2 className="text-5xl md:text-6xl font-black leading-tight tracking-tighter">Adaptive Learning<br /><span className="text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">Roadmaps.</span></h2>
          <p className="text-xl text-muted leading-relaxed font-medium">Stop following generic tutorials. Our AI generates a step-by-step career trajectory explicitly tailored to your current abilities, whether you're becoming a software engineer, an indie musician, or an executive chef.</p>
          <ul className="space-y-5 mt-8 text-gray-300 font-medium">
            <li className="flex items-center gap-4"><CheckCircle2 className="w-6 h-6 text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" /> Step-by-step Actionable Milestones</li>
            <li className="flex items-center gap-4"><CheckCircle2 className="w-6 h-6 text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" /> Daily Micro-tasks Generation</li>
            <li className="flex items-center gap-4"><CheckCircle2 className="w-6 h-6 text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" /> Goal Pivot Capability</li>
          </ul>
        </div>
        <div className="flex-1 w-full flex justify-center z-10">
          {/* Visual */}
          <div className="relative w-full max-w-lg hover:scale-105 transition-transform duration-700">
            <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-[3rem]"></div>
            <div className="glass-panel p-8 relative border-purple-500/30 flex flex-col gap-6 bg-slate-900/80 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
              <div className="glass-panel p-5 bg-purple-500/10 border-purple-500/40 flex gap-5 items-center shadow-lg shadow-purple-500/10">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-300 font-black text-lg">1</div>
                <div>
                  <div className="font-bold text-lg text-white mb-1">Mastering Breath Control</div>
                  <div className="text-xs text-purple-300/80 font-bold uppercase tracking-wider">Currently Learning • 45% Compete</div>
                </div>
              </div>
              <div className="glass-panel p-5 bg-white/5 border-white/10 flex gap-5 items-center opacity-60">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 font-black text-lg">2</div>
                <div>
                  <div className="font-bold text-lg text-white mb-1">Stage Presence & Performance</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Locked Milestone</div>
                </div>
              </div>
              <div className="glass-panel p-5 bg-white/5 border-white/10 flex gap-5 items-center opacity-40">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 font-black text-lg">3</div>
                <div>
                  <div className="font-bold text-lg text-white mb-1">Studio Recording Basics</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Locked Milestone</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Block 3: AI Mentor */}
      <section id="mentor" className="w-full max-w-7xl px-6 py-32 flex flex-col md:flex-row items-center gap-16 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[3px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>
        <QuickFact
          fact="Having an always-on mentor to dynamically clear learning roadblocks increases new skill acquisition speed by 2.5x."
          className="absolute xl:left-0 2xl:-left-12 -top-16 rotate-6 z-20"
        />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="flex-1 space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
            <Brain className="w-4 h-4" /> Personal AI Mentor
          </div>
          <h2 className="text-5xl md:text-6xl font-black leading-tight tracking-tighter">Always-on Guidance<br /><span className="text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">In Your Pocket.</span></h2>
          <p className="text-xl text-muted leading-relaxed font-medium">Stuck on a concept? Seeking career advice? Chat with an AI mentor that retains full context of your journey, your strengths, and your current learning blockages.</p>
        </div>
        <div className="flex-1 w-full flex justify-center z-10">
          <div className="relative w-full max-w-lg hover:scale-105 transition-transform duration-700">
            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-[3rem]"></div>
            <div className="glass-panel p-8 relative border-emerald-500/30 space-y-6 bg-slate-900/80 shadow-[0_0_50px_rgba(16,185,129,0.15)]">
              <div className="flex justify-end">
                <div className="px-5 py-4 bg-indigo-600 rounded-2xl rounded-tr-sm text-sm max-w-[85%] font-medium leading-relaxed shadow-lg">How should I prepare for my first live gig given my classical training?</div>
              </div>
              <div className="flex justify-start">
                <div className="px-5 py-4 bg-white/10 rounded-2xl rounded-tl-sm text-sm max-w-[95%] border border-white/10 text-gray-200 font-medium leading-relaxed">
                  Based on your strong <strong className="text-emerald-400 font-bold">pitch control</strong> from your YouTube covers, I recommend starting with microphone techniques. Since you understand dynamics well, adapting to stage amplification will be very intuitive for you. Let's start with a quick task.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-40 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[3px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>
        <QuickFact
          fact="Professionals who seamlessly align their careers with their latent interests are 3x more likely to achieve accelerated promotions."
          className="absolute xl:right-20 top-16 rotate-6 z-20"
        />
        <QuickFact
          fact="Individuals who use AI to continuously analyze market trends transition into higher-paying roles 2 years faster than their peers."
          className="absolute xl:left-20 2xl:left-40 bottom-16 -rotate-6 z-20"
        />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] md:w-[40vw] md:h-[40vw] bg-indigo-600/20 blur-[150px] rounded-full point-events-none"></div>

        <h2 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter relative z-10">Ready to <span className="text-gradient">Level Up?</span></h2>
        <p className="text-2xl text-gray-400 mb-12 max-w-3xl px-4 relative z-10 font-medium">Stop guessing your career trajectory. Let data and AI illuminate the path to your professional destiny.</p>
        <button onClick={login} className="btn btn-primary text-xl px-12 py-6 group shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)] relative z-10">
          Begin Your Journey Now
          <Zap className="w-6 h-6 group-hover:scale-125 transition-transform" />
        </button>
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

function QuickFact({ fact, className }) {
  return (
    <div className={`hidden xl:flex absolute glass-panel p-4 items-start gap-4 text-sm font-medium border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-slate-900/60 backdrop-blur-xl z-30 transition-transform hover:scale-105 duration-300 ${className}`}>
      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
        <Zap className="w-4 h-4 text-indigo-400" />
      </div>
      <p className="max-w-[180px] leading-tight text-gray-300 text-left">
        <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 block mb-1">Did you know?</span>
        {fact}
      </p>
    </div>
  )
}

