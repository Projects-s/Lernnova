"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { generateRoadmap } from "@/lib/gemini";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, BookOpen, BrainCircuit, Activity, Target } from "lucide-react";
import Link from "next/link";

function OptionCard({ selected, onClick, title, desc }) {
    return (
        <button
            onClick={onClick}
            className={`p-6 rounded-2xl border text-left transition-all ${selected ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'} flex flex-col items-start h-full`}
        >
            <div className={`w-5 h-5 rounded-full border-2 mb-4 flex items-center justify-center ${selected ? 'border-indigo-400' : 'border-gray-500'}`}>
                {selected && <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full" />}
            </div>
            <h4 className={`font-bold mb-2 text-lg ${selected ? 'text-indigo-300' : 'text-white'}`}>{title}</h4>
            <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
        </button>
    )
}

function SetupContent() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const goal = searchParams.get('goal') || "Your Career Journey";

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [preferences, setPreferences] = useState({
        format: "Visual & Interactive",
        approach: "Practical (Project-based)",
        pace: "Steady & Consistent"
    });

    const getDetailedProfile = () => {
        if (!profile) return null;
        const configs = profile.sourceConfigs || {};
        return {
            youtube: configs.youtube !== false ? profile.youtube?.analysis : null,
            github: configs.github !== false ? profile.github?.analysis : null,
            reddit: configs.reddit !== false ? profile.reddit?.analysis : null,
            instagram: configs.instagram !== false ? profile.instagram?.analysis : null,
            document: configs.document !== false ? profile.document?.analysis : null,
            interests: profile.interests,
            skills: profile.skills,
            strengths: profile.strengths
        };
    };

    const handleGenerate = async () => {
        if (!user) return;
        setIsGenerating(true);
        try {
            const detailed = getDetailedProfile();
            const roadmapData = await generateRoadmap(detailed, goal, preferences);

            const newRoadmap = {
                ...roadmapData,
                createdAt: new Date().toISOString(),
                id: Date.now().toString(),
            };

            const currentHistory = profile?.roadmapHistory || [];

            await setDoc(doc(db, "users", user.uid), {
                roadmap: newRoadmap,
                roadmapHistory: [newRoadmap, ...currentHistory],
                lastRoadmapUpdate: new Date().toISOString()
            }, { merge: true });

            // After successful generation, send them back to the dashboard specifically to the new learning history anchor
            router.push("/dashboard/#learning-history");
        } catch (error) {
            console.error(error);
            alert("Failed to generate the journey plan. Try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading || !user) {
        return <div className="min-h-screen bg-[#050505] flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
    }

    if (isGenerating) {
        return (
            <div className="min-h-screen bg-[#050505] p-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20"></div>

                <div className="glass-panel p-16 max-w-xl w-full text-center relative z-10 border-indigo-500/30">
                    <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse shadow-[0_0_50px_rgba(79,70,229,0.3)]">
                        <BrainCircuit className="w-12 h-12 text-indigo-400" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Architecting Journey</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                        Analyzing your profile and structuring a custom path for <strong className="text-indigo-300 font-bold">"{goal}"</strong> based on your learning style...
                    </p>

                    <div className="flex flex-col items-center gap-4">
                        <div className="flex gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500/50">Processing AI Matrix</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] p-8 pt-32 flex justify-center selection:bg-indigo-500/30">
            <div className="w-full max-w-4xl relative z-10">

                {/* Header */}
                <div className="flex items-center gap-5 mb-12">
                    <Link href="/" className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-colors shrink-0">
                        <ArrowLeft className="w-6 h-6 text-white" />
                    </Link>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white uppercase mb-2">Configure Your Journey</h1>
                        <p className="text-indigo-400 font-bold tracking-widest uppercase text-sm flex items-center gap-2">
                            <Target className="w-4 h-4" /> Pursuit: {goal}
                        </p>
                    </div>
                </div>

                <div className="glass-panel p-10 border border-white/5 mb-10">
                    <p className="text-gray-300 text-lg leading-relaxed mb-10">
                        Before the AI generates the precise technical steps for your roadmap to <strong className="text-white">"{goal}"</strong>, we want to know how you prefer to conquer this challenge. We'll tailor the exact resources and micro-tasks to match your psychology.
                    </p>

                    {/* Format Preference */}
                    <div className="mb-12">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3 uppercase tracking-wider text-gray-200">
                            <Sparkles className="w-6 h-6 text-yellow-400" /> Learning Format
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <OptionCard
                                selected={preferences.format === "Visual & Interactive"}
                                onClick={() => setPreferences({ ...preferences, format: "Visual & Interactive" })}
                                title="Visual"
                                desc="Video tutorials, diagrams, interactive platforms, and visual metaphors."
                            />
                            <OptionCard
                                selected={preferences.format === "Reading & Writing"}
                                onClick={() => setPreferences({ ...preferences, format: "Reading & Writing" })}
                                title="Text & Docs"
                                desc="Official documentation, intensive text-based guides, and articles."
                            />
                            <OptionCard
                                selected={preferences.format === "Auditory & Discussions"}
                                onClick={() => setPreferences({ ...preferences, format: "Auditory & Discussions" })}
                                title="Auditory"
                                desc="Podcasts, audio lectures, and engaging in community discussions."
                            />
                        </div>
                    </div>

                    {/* Approach Preference */}
                    <div className="mb-12">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3 uppercase tracking-wider text-gray-200">
                            <BookOpen className="w-6 h-6 text-purple-400" /> Learning Approach
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <OptionCard
                                selected={preferences.approach === "Practical (Project-based)"}
                                onClick={() => setPreferences({ ...preferences, approach: "Practical (Project-based)" })}
                                title="Strictly Practical"
                                desc="Learn by doing. Build things immediately, ignoring deep theory until it breaks."
                            />
                            <OptionCard
                                selected={preferences.approach === "Theoretical & Fundamental"}
                                onClick={() => setPreferences({ ...preferences, approach: "Theoretical & Fundamental" })}
                                title="Deep Theory"
                                desc="Understand the underlying math and core concepts deeply before writing a line of code."
                            />
                            <OptionCard
                                selected={preferences.approach === "Balanced Approach"}
                                onClick={() => setPreferences({ ...preferences, approach: "Balanced Approach" })}
                                title="Balanced Matrix"
                                desc="A steady mix of conceptual understanding followed immediately by a practical building exercise."
                            />
                        </div>
                    </div>

                    {/* Pace Preference */}
                    <div className="mb-12">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3 uppercase tracking-wider text-gray-200">
                            <Activity className="w-6 h-6 text-emerald-400" /> Desired Pace
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <OptionCard
                                selected={preferences.pace === "Intensive Bootcamp"}
                                onClick={() => setPreferences({ ...preferences, pace: "Intensive Bootcamp" })}
                                title="Intensive Bootcamp"
                                desc="High hours per day. Aggressive timelines. Rapid, immersive skilling."
                            />
                            <OptionCard
                                selected={preferences.pace === "Steady & Consistent"}
                                onClick={() => setPreferences({ ...preferences, pace: "Steady & Consistent" })}
                                title="Steady & Consistent"
                                desc="Moderate hours. Sustainable progress that fits around a normal job or school schedule."
                            />
                            <OptionCard
                                selected={preferences.pace === "Relaxed & Exploratory"}
                                onClick={() => setPreferences({ ...preferences, pace: "Relaxed & Exploratory" })}
                                title="Relaxed Explorer"
                                desc="No rush. Following rabbit holes and learning purely for the joy of the journey."
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end pt-4 pb-20">
                    <button
                        onClick={handleGenerate}
                        className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black transition-all inline-flex items-center gap-3 shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95 uppercase tracking-widest text-sm"
                    >
                        Generate Master Plan <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

            </div>
        </div>
    );
}

export default function SetupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#050505] flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
            <SetupContent />
        </Suspense>
    );
}
