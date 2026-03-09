"use client";

import { use, useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Award, Trophy, CheckCircle2, Star, BookOpen, Calendar, Clock, ChevronRight, Youtube, Code, Headphones, FileText, CheckSquare, X, Sparkles, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";

export default function AchievementDetailPage({ params: paramsPromise }) {
    const params = use(paramsPromise);
    const { profile, user, loading } = useAuth();
    const [achievement, setAchievement] = useState(null);
    const [isGeneratingCert, setIsGeneratingCert] = useState(false);
    const router = useRouter();
    const certificateRef = useRef(null);

    useEffect(() => {
        if (!loading && profile?.achievements) {
            const found = profile.achievements.find(a => (a.slug || a.id) === params.slug);
            if (found) {
                // Smart Recovery: If this is a legacy achievement without stored steps, 
                // try to find the full roadmap data in roadmapHistory
                if (!found.steps && profile.roadmapHistory) {
                    const matchedHistory = profile.roadmapHistory.find(h =>
                        h.id === found.id || h.careerGoal === found.careerGoal
                    );
                    if (matchedHistory) {
                        found.steps = matchedHistory.steps;
                        found.courses = matchedHistory.courses;
                    }
                }
                setAchievement(found);
            }
        }
    }, [profile, loading, params.slug]);

    const handleDownloadCertificate = async () => {
        if (!certificateRef.current) return;
        setIsGeneratingCert(true);
        try {
            await new Promise(r => setTimeout(r, 1000));

            const canvas = await html2canvas(certificateRef.current, {
                scale: 3, // Even higher resolution for printing
                useCORS: true,
                backgroundColor: "#050505",
                logging: false,
                allowTaint: true
            });

            canvas.toBlob((blob) => {
                if (!blob) throw new Error("Canvas to Blob conversion failed");
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                const fileName = `Lernova_Mastery_Certificate_${achievement?.careerGoal?.replace(/[^a-z0-9]/gi, '_')}.png`;

                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Cleanup to free memory
                setTimeout(() => URL.revokeObjectURL(url), 100);
            }, "image/png", 1.0);

        } catch (error) {
            console.error("Certificate generation failed:", error);
            alert("Could not generate certificate. Please try again or check your browser permissions.");
        } finally {
            setIsGeneratingCert(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
    );

    if (!achievement && !loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
            <Trophy className="w-16 h-16 text-gray-800 mb-6" />
            <h1 className="text-2xl font-black mb-2 uppercase tracking-tighter">Achievement Not Found</h1>
            <p className="text-gray-500 max-w-sm mb-8">This milestone hasn't been added to your Hall of Fame yet, or the link is broken.</p>
            <Link href="/dashboard" className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all uppercase tracking-widest text-xs">
                Back to Dashboard
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-emerald-500/30 font-sans pb-32">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-10 pointer-events-none"></div>
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-emerald-500/5 blur-[120px] pointer-events-none rounded-full"></div>

            <div className="max-w-5xl mx-auto px-6 pt-12 relative z-10">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 mb-12 transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Hall of Fame
                </Link>

                {/* Hero Header */}
                <div className="mb-16">
                    <div className="flex flex-col md:flex-row md:items-center gap-8 mb-10">
                        <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.2)] shrink-0 animate-pulse">
                            <Award className="w-12 h-12 text-emerald-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">Mastery Achieved</span>
                                <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(achievement.achievedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none mb-4">{achievement.careerGoal}</h1>
                            <p className="text-lg text-gray-400 font-medium max-w-2xl leading-relaxed">
                                These are the comprehensive learnings and mastery milestones you successfully engineered throughout this advanced learning journey. You are now officially recognized for these capabilities.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Total Steps</span>
                            <span className="text-2xl font-black text-white">{achievement.steps?.length || 0}</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Status</span>
                            <span className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                                <Star className="w-5 h-5 fill-emerald-400" /> 100% Mastered
                            </span>
                        </div>
                    </div>

                    {/* Overall Mastery Skills */}
                    {achievement.skills && achievement.skills.length > 0 && (
                        <div className="mt-12 p-8 bg-blue-600/5 border border-blue-500/10 rounded-[32px] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none"></div>
                            <div className="relative z-10">
                                <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" /> Core Competencies Mastered
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {achievement.skills.map((skill, sIdx) => (
                                        <div key={sIdx} className="px-5 py-3 bg-blue-500/10 border border-blue-400/20 rounded-2xl flex items-center gap-3 hover:border-amber-400/50 hover:bg-amber-400/5 transition-all shadow-[0_4px_15px_rgba(59,130,246,0.05)] group/skill">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
                                            <span className="text-xs font-bold text-blue-100 uppercase tracking-tight">{skill}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Achieved Steps Section */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3 mb-8">
                        <div className="w-1.5 h-8 bg-emerald-500 rounded-full"></div>
                        Roadmap Followed
                    </h2>

                    <div className="space-y-8">
                        {achievement.steps && achievement.steps.length > 0 ? (
                            achievement.steps.map((step, idx) => (
                                <div key={idx} className="relative">
                                    {/* Connection Line */}
                                    {idx < achievement.steps.length - 1 && (
                                        <div className="absolute left-8 top-16 bottom-0 w-px bg-gradient-to-b from-emerald-500/50 via-emerald-500/20 to-transparent z-0"></div>
                                    )}

                                    <div className="glass-panel border border-emerald-500/20 bg-emerald-500/5 rounded-[32px] overflow-hidden p-6 md:p-10 relative z-10">
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="flex gap-6 items-center">
                                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                                    <span className="text-2xl font-black text-emerald-500">0{idx + 1}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest block mb-2">Milestone Step</span>
                                                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">{step.title}</h3>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-emerald-500/20 rounded-full">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                            </div>
                                        </div>

                                        {step.tasks && step.tasks.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/10">
                                                {step.tasks.map((task, tIdx) => (
                                                    <div key={tIdx} className="bg-black/40 border border-emerald-500/10 p-4 rounded-2xl flex items-start gap-4">
                                                        <div className="mt-1 shrink-0">
                                                            <CheckSquare className="w-5 h-5 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-sm font-bold text-gray-200 leading-snug mb-1">{task.title}</h4>
                                                            {task.resource && (
                                                                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400/70 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 inline-block">
                                                                    {task.type === 'video' ? <Youtube className="w-3 h-3" /> :
                                                                        task.type === 'project' ? <Code className="w-3 h-3" /> :
                                                                            task.type === 'audio' ? <Headphones className="w-3 h-3" /> :
                                                                                <FileText className="w-3 h-3" />}
                                                                    {task.resource}
                                                                </div>
                                                            )}
                                                            {task.description && (
                                                                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed italic">{task.description}</p>
                                                            )}
                                                            {/* Skills achieved tags from dashboard card style */}
                                                            <div className="mt-4 flex flex-wrap gap-2">
                                                                {(task.skills || [task.title.split(' ').slice(0, 3).join(' ')]).map((skl, sIdx) => (
                                                                    <span key={sIdx} className="text-[9px] font-black bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                                        {skl} Mastered
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center">
                                <X className="w-12 h-12 text-gray-600 mb-4" />
                                <h3 className="text-xl font-bold mb-2">Legacy Milestone</h3>
                                <p className="text-gray-400 max-w-sm">This achievement was earned before our detailed roadmap archiving was implemented. Key skills verified: {(achievement.skills || []).join(', ')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Courses Section if available */}
                {achievement.courses && Object.keys(achievement.courses).length > 0 && (
                    <div className="mt-24 space-y-10">
                        <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-indigo-500 rounded-full"></div>
                            Curated Masterclasses Mastered
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(achievement.courses).flatMap(([platform, list]) =>
                                (list || []).map((course, cIdx) => (
                                    <div key={`${platform}-${cIdx}`} className="bg-white/5 border border-white/10 p-6 rounded-[32px] hover:border-indigo-500/30 transition-all flex flex-col group/course">
                                        <div className="flex justify-between items-start mb-6">
                                            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-300 text-[10px] font-black rounded-lg border border-indigo-500/20 uppercase tracking-widest">{platform}</span>
                                            <Star className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                                        </div>
                                        <h4 className="font-black text-xl mb-3 leading-tight group-hover/course:text-indigo-300 transition-colors">{course.title}</h4>
                                        <p className="text-sm text-gray-400 mb-8 flex-1 leading-relaxed line-clamp-3">{course.description}</p>
                                        <Link href={course.link} target="_blank" className="mt-auto w-full py-4 bg-white/5 hover:bg-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px] items-center justify-center transition-all flex gap-2">
                                            View Certificate/Course <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Final Recognition Card */}
                <div className="mt-24 p-12 bg-gradient-to-br from-emerald-600/20 via-emerald-900/10 to-transparent border border-emerald-500/30 rounded-[40px] text-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                    <Trophy className="w-20 h-20 text-emerald-400 mx-auto mb-8 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform duration-700" />
                    <h2 className="text-4xl font-black tracking-tighter uppercase mb-4">Official End of Journey</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto mb-10 text-lg">
                        You've reached the absolute summit of this professional trajectory. Use the knowledge gained here to fuel your core projects or initiate a new career roadmap from your dashboard.
                    </p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <Link href="/dashboard" className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 shadow-2xl">
                            Return to Dashboard <ChevronRight className="w-5 h-5" />
                        </Link>
                        <button
                            onClick={handleDownloadCertificate}
                            disabled={isGeneratingCert}
                            className="inline-flex items-center gap-3 px-10 py-5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isGeneratingCert ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Engineering Certificate...</>
                            ) : (
                                <><Download className="w-5 h-5" /> Claim Verified Certificate</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Hidden Certificate Template for html2canvas */}
            <div className="fixed left-[-9999px] top-0">
                <div
                    ref={certificateRef}
                    className="w-[1200px] h-[860px] bg-[#0A0A0A] p-1 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl"
                    style={{ fontFamily: '"Inter", "Outfit", system-ui, -apple-system, sans-serif' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#080808] via-[#0D0D0D] to-[#080808]"></div>
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.06]"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-emerald-500/[0.04] blur-[160px] rounded-full pointer-events-none"></div>

                    <div className="absolute inset-10 border border-white/5 rounded-[60px]"></div>
                    <div className="absolute inset-0 border-[30px] border-[#0A0A0A] z-20 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col items-center w-full max-w-[1050px]">
                        <div className="flex flex-col items-center mb-6">
                            <img src="/LernovaLOGO.png" alt="Lernova" className="h-20 mb-3 object-contain brightness-125" />
                            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.6em] opacity-90">One of the first AI Learning Platforms</p>
                        </div>

                        <div className="w-full flex items-center justify-center gap-6 mb-4">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            <h4 className="text-white text-[18px] font-bold uppercase tracking-[0.8em] whitespace-nowrap">Certificate of Completion</h4>
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/10 to-transparent"></div>
                        </div>

                        <div className="mb-10 w-full flex flex-col items-center">
                            <h1 className="text-[12px] font-bold text-gray-400 mb-6 uppercase tracking-[0.3em]">This honor is proudly presented to</h1>
                            <h2 className="text-7xl font-black text-white uppercase tracking-tight mb-8">
                                {profile?.name || user?.displayName || "The Learner"}
                            </h2>
                            <div className="h-[2px] w-full max-w-3xl bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent"></div>
                        </div>

                        <div className="mb-4 px-10">
                            <p className="text-2xl text-white/90 mb-3 font-medium italic leading-snug">
                                for successfully completing this self-directed journey empowered by AI as a mentor for the
                            </p>
                            <h3 className="text-4xl font-black text-emerald-400 uppercase tracking-tight leading-none mb-4 drop-shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                "{achievement?.careerGoal}"
                            </h3>
                        </div>

                        <p className="text-[17px] text-gray-400 mb-6 leading-relaxed max-w-[850px] font-normal">
                            {profile?.name || user?.displayName || "The Learner"} has mastered these core competencies through rigorous self-learning, using AI as an expert guide and catalyst. This achievement verifies the completion of an advanced curriculum engineered and mentored by Lernova's Intelligence System.
                        </p>

                        <div className="grid grid-cols-3 w-full max-w-4xl gap-10 items-center pt-4 border-t border-white/5">
                            <div className="text-left">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Authenticated On</span>
                                <span className="text-xl font-bold text-white uppercase tracking-tight">
                                    {new Date(achievement?.achievedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="w-28 h-28 border border-emerald-500/20 rounded-full flex items-center justify-center relative mb-2 bg-white/[0.02]">
                                    <Trophy className="w-10 h-10 text-emerald-400" />
                                    <div className="absolute inset-1 border border-emerald-500/5 rounded-full"></div>
                                </div>
                                <span className="text-[9px] font-black text-emerald-500/50 uppercase tracking-[0.4em]">Official Seal</span>
                            </div>

                            <div className="text-right">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Verify Authenticity</span>
                                <span className="text-[12px] font-mono text-gray-400 block mb-3 uppercase">ID: LRN-{achievement?.id?.toString().toUpperCase()}</span>
                                <div className="flex justify-end gap-3 opacity-30 items-center">
                                    <div className="px-2 py-0.5 border border-white/10 rounded text-[7px] font-black tracking-widest">LIVS-MASTER</div>
                                    <Award className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
