"use client";

import { useAuth } from "@/lib/AuthContext";
import Navbar from "@/components/Navbar";
import { Youtube, Github, MessageSquare, Star, Trophy, AlertCircle, ArrowLeft, Play, BarChart, Instagram, FileText, Zap, Briefcase } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function InsightsPage() {
    const { profile, loading } = useAuth();
    const [highlightSource, setHighlightSource] = useState('all');

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030014] text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#030014] text-white flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
                <h1 className="text-3xl font-bold mb-4">No Profile Found</h1>
                <p className="text-muted mb-8 max-w-md">Please analyze your digital footprint to generate insights.</p>
                <Link href="/analyze" className="btn btn-primary px-8 py-3">Go to Analyze</Link>
            </div>
        );
    }

    const { youtubeData: ytData, githubData: ghData, redditData: rdData } = profile;

    // Helper functions to identify where an interest/skill might have come from (Simple heuristics for UI)
    const getYouTubeInferences = () => {
        if (!ytData) return { interests: [], skills: [] };
        return {
            interests: profile.interests?.filter(i => ytData.likedVideos?.some(v => v.title.toLowerCase().includes(i.toLowerCase())) || ytData.subscriptions?.some(s => s.title.toLowerCase().includes(i.toLowerCase()))) || [],
            skills: profile.skills?.filter(s => ytData.likedVideos?.some(v => v.title.toLowerCase().includes(s.toLowerCase()))) || []
        };
    };

    const getGitHubInferences = () => {
        if (!ghData) return { interests: [], skills: [] };
        return {
            interests: profile.interests?.filter(i => ghData.languages?.some(l => l.toLowerCase() === i.toLowerCase())) || [],
            skills: profile.skills?.filter(s => ghData.languages?.some(l => l.toLowerCase() === s.toLowerCase()) || ghData.ownRepos?.some(r => r.description?.toLowerCase().includes(s.toLowerCase()))) || []
        };
    };

    const getRedditInferences = () => {
        if (!rdData) return { interests: [], skills: [] };
        return {
            interests: profile.interests?.filter(i => rdData.subreddits?.some(s => s.name.toLowerCase().includes(i.toLowerCase()))) || [],
            skills: [] // Reddit mostly implies interests, rarely hard skills.
        };
    };

    const ytInferences = getYouTubeInferences();
    const ghInferences = getGitHubInferences();
    const rdInferences = getRedditInferences();

    return (
        <main className="min-h-screen bg-[#030014] text-white pb-20">
            <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
            </div>

            <Navbar />

            <div className="container mx-auto px-4 pt-16 max-w-6xl">
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-bold">Platform Insights</h1>
                        <p className="text-muted text-lg">Detailed breakdown of how Gemini interpreted your connected accounts.</p>
                    </div>
                </div>



                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* YOUTUBE SECTION */}
                    {ytData && profile.sourceConfigs?.youtube !== false && (
                        <div className="glass-panel p-6 border-t-4 border-t-red-500 flex flex-col h-full">
                            {/* ... (rest of youtube profile UI) */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-red-500/10 rounded-xl">
                                    <Youtube className="w-8 h-8 text-red-500" />
                                </div>
                                <h2 className="text-2xl font-bold">YouTube Profile</h2>
                            </div>

                            <div className="space-y-6 flex-grow">
                                <div>
                                    <h3 className="text-sm font-mono text-red-400 mb-2 uppercase tracking-wider">Inferred Interests</h3>
                                    {ytInferences.interests.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {ytInferences.interests.map((i, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm">{i}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted text-sm italic">Gemini merged general video topics into global interests.</p>
                                    )}
                                </div>

                                <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                                    <h3 className="text-sm font-bold text-white mb-3">Raw Analyzed Data (Sample)</h3>
                                    <ul className="space-y-2 text-sm text-gray-400">
                                        <li className="flex justify-between"><span>Subscriptions:</span> <span className="text-white">{ytData.subscriptions.length} channels</span></li>
                                        <li className="flex justify-between"><span>Liked Videos:</span> <span className="text-white">{ytData.likedVideos.length} videos</span></li>
                                        <li className="flex justify-between"><span>Playlists:</span> <span className="text-white">{ytData.playlists.length} curated</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-white mb-2">Recent Subscriptions</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {ytData.subscriptions.slice(0, 5).map((sub, i) => (
                                            <span key={i} className="text-xs px-2 py-1 bg-black/50 rounded text-gray-400" title={sub.description}>{sub.title}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GITHUB SECTION */}
                    {ghData && profile.sourceConfigs?.github !== false && (
                        <div className="glass-panel p-6 border-t-4 border-t-gray-400 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-gray-500/10 rounded-xl">
                                    <Github className="w-8 h-8 text-gray-300" />
                                </div>
                                <h2 className="text-2xl font-bold">GitHub Profile</h2>
                            </div>

                            <div className="space-y-6 flex-grow">
                                <div>
                                    <h3 className="text-sm font-mono text-gray-400 mb-2 uppercase tracking-wider">Inferred Hard Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {/* Show languages directly as skills for github */}
                                        {ghData.languages.map((l, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm">{l}</span>
                                        ))}
                                        {ghInferences.skills.filter(s => !ghData.languages.includes(s)).map((s, idx) => (
                                            <span key={`inf-${idx}`} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-full text-sm">{s}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                                    <h3 className="text-sm font-bold text-white mb-3">Raw Analyzed Data</h3>
                                    <ul className="space-y-2 text-sm text-gray-400">
                                        <li className="flex justify-between"><span>Public Repositories:</span> <span className="text-white">{ghData.ownRepos.length}</span></li>
                                        <li className="flex justify-between"><span>Starred Projects:</span> <span className="text-white">{ghData.starredRepos.length}</span></li>
                                        <li className="flex justify-between"><span>Followers:</span> <span className="text-white">{ghData.profile.followers}</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-white mb-2">Notable Starred Tech</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {ghData.starredRepos.slice(0, 5).map((repo, i) => (
                                            <span key={i} className="text-xs px-2 py-1 bg-black/50 rounded text-gray-400 flex items-center gap-1">
                                                {repo.name} <span className="opacity-50">({repo.language || 'Mixed'})</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* REDDIT SECTION */}
                    {rdData && profile.sourceConfigs?.reddit !== false && (
                        <div className="glass-panel p-6 border-t-4 border-t-orange-500 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-orange-500/10 rounded-xl">
                                    <MessageSquare className="w-8 h-8 text-orange-500" />
                                </div>
                                <h2 className="text-2xl font-bold">Reddit Profile</h2>
                            </div>

                            <div className="space-y-6 flex-grow">
                                <div>
                                    <h3 className="text-sm font-mono text-orange-400 mb-2 uppercase tracking-wider">Niche Communities / Interests</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {rdData.subreddits.slice(0, 10).map((r, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm flex items-center gap-1">
                                                <span className="text-orange-500 opacity-50">r/</span>{r.name}
                                            </span>
                                        ))}
                                    </div>
                                    {rdData.subreddits.length > 10 && (
                                        <p className="text-xs text-muted mt-2">+ {rdData.subreddits.length - 10} more communities</p>
                                    )}
                                </div>

                                <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                                    <h3 className="text-sm font-bold text-white mb-3">Raw Analyzed Data</h3>
                                    <ul className="space-y-2 text-sm text-gray-400">
                                        <li className="flex justify-between"><span>Subscribed Subreddits:</span> <span className="text-white">{rdData.subreddits.length}</span></li>
                                        <li className="flex justify-between"><span>Account Name:</span> <span className="text-white">{rdData.profile?.name || "Private"}</span></li>
                                        <li className="flex justify-between"><span>Total Karma:</span> <span className="text-white">{rdData.profile?.total_karma?.toLocaleString() || 0}</span></li>
                                    </ul>
                                </div>

                                {rdInferences.interests.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-white mb-2">Gemini Matched Interests:</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {rdInferences.interests.map((i, idx) => (
                                                <span key={idx} className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-300 rounded border border-yellow-500/20 shadow-sm">{i}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Final Gemini Output Synthesis */}
                <div className="mt-8 glass-panel p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <BarChart className="w-8 h-8 text-indigo-400" />
                            <h2 className="text-2xl font-bold">The Final AI Profile (Combined Output)</h2>
                        </div>

                        {/* Filter Logos */}
                        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/5">
                            <button onClick={() => setHighlightSource('all')} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${highlightSource === 'all' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                                All
                            </button>
                            {(profile?.youtube?.analysis && profile.sourceConfigs?.youtube !== false) && (
                                <button onClick={() => setHighlightSource('youtube')} className={`p-1.5 rounded-xl transition-all ${highlightSource === 'youtube' ? 'bg-red-500/20 shadow-lg ring-1 ring-red-500/50' : 'bg-transparent opacity-40 hover:opacity-100 hover:bg-white/5'}`} title="Highlight YouTube Inferences">
                                    <Youtube className="w-5 h-5 text-red-500" />
                                </button>
                            )}
                            {(profile?.github?.analysis && profile.sourceConfigs?.github !== false) && (
                                <button onClick={() => setHighlightSource('github')} className={`p-1.5 rounded-xl transition-all ${highlightSource === 'github' ? 'bg-gray-500/30 shadow-lg ring-1 ring-gray-400' : 'bg-transparent opacity-40 hover:opacity-100 hover:bg-white/5'}`} title="Highlight GitHub Inferences">
                                    <Github className="w-5 h-5 text-white" />
                                </button>
                            )}
                            {(profile?.reddit?.analysis && profile.sourceConfigs?.reddit !== false) && (
                                <button onClick={() => setHighlightSource('reddit')} className={`p-1.5 rounded-xl transition-all ${highlightSource === 'reddit' ? 'bg-orange-500/20 shadow-lg ring-1 ring-orange-500/50' : 'bg-transparent opacity-40 hover:opacity-100 hover:bg-white/5'}`} title="Highlight Reddit Inferences">
                                    <MessageSquare className="w-5 h-5 text-orange-500" />
                                </button>
                            )}
                            {(profile?.instagram?.analysis && profile.sourceConfigs?.instagram !== false) && (
                                <button onClick={() => setHighlightSource('instagram')} className={`p-1.5 rounded-xl transition-all ${highlightSource === 'instagram' ? 'bg-pink-500/20 shadow-lg ring-1 ring-pink-500/50' : 'bg-transparent opacity-40 hover:opacity-100 hover:bg-white/5'}`} title="Highlight Instagram Inferences">
                                    <Instagram className="w-5 h-5 text-pink-500" />
                                </button>
                            )}
                            {(profile?.document?.analysis && profile.sourceConfigs?.document !== false) && (
                                <button onClick={() => setHighlightSource('document')} className={`p-1.5 rounded-xl transition-all ${highlightSource === 'document' ? 'bg-blue-500/20 shadow-lg ring-1 ring-blue-500/50' : 'bg-transparent opacity-40 hover:opacity-100 hover:bg-white/5'}`} title="Highlight Document Inferences">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                </button>
                            )}
                        </div>
                    </div>
                    {(() => {
                        const configs = profile?.sourceConfigs || {};

                        const filteredInterests = Array.from(new Set([
                            ...(profile?.interests || []),
                            ...(configs.youtube !== false ? (profile?.youtube?.analysis?.interests || []) : []),
                            ...(configs.github !== false ? (profile?.github?.analysis?.interests || []) : []),
                            ...(configs.reddit !== false ? (profile?.reddit?.analysis?.interests || []) : []),
                            ...(profile?.instagram?.analysis?.interests || []), // Instagram/Docs not fully handled in insights yet but good for future
                            ...(profile?.document?.analysis?.interests || [])
                        ]));

                        const filteredSkills = Array.from(new Set([
                            ...(profile?.skills || []),
                            ...(configs.youtube !== false ? (profile?.youtube?.analysis?.skills || []) : []),
                            ...(configs.github !== false ? (profile?.github?.analysis?.skills || []) : []),
                            ...(configs.reddit !== false ? (profile?.reddit?.analysis?.skills || []) : []),
                            ...(profile?.instagram?.analysis?.skills || []),
                            ...(profile?.document?.analysis?.skills || [])
                        ]));

                        const filteredStrengths = Array.from(new Set([
                            ...(profile?.strengths || []),
                            ...(configs.youtube !== false ? (profile?.youtube?.analysis?.personalityTraits || []) : []),
                            ...(configs.reddit !== false ? (profile?.reddit?.analysis?.personalityTraits || []) : []),
                            ...(profile?.instagram?.analysis?.personalityTraits || [])
                        ]));

                        const filteredCareers = Array.from(new Set([
                            ...(profile?.careers || []),
                            ...(configs.github !== false ? (profile?.github?.analysis?.suggestedCareers || []) : []),
                            ...(configs.reddit !== false ? (profile?.reddit?.analysis?.suggestedCareers || []) : []),
                            ...(profile?.instagram?.analysis?.suggestedCareers || []),
                            ...(profile?.document?.analysis?.suggestedCareers || [])
                        ]));

                        const checkHighlight = (item, type) => {
                            if (highlightSource === 'all') return true;
                            const sourceData = profile?.[highlightSource]?.analysis;
                            if (!sourceData) return false;

                            if (type === 'interest') return sourceData.interests?.includes(item);
                            if (type === 'skill') return sourceData.skills?.includes(item);
                            if (type === 'strength') return sourceData.personalityTraits?.includes(item);
                            if (type === 'career') return sourceData.suggestedCareers?.includes(item);
                            return false;
                        };

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 border-t border-white/5 pt-8">
                                <div>
                                    <h3 className="font-bold flex items-center gap-2 mb-4 text-yellow-300"><Star className="w-5 h-5" /> Consolidated Interests</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredInterests.map((i, idx) => {
                                            const isHighlighted = checkHighlight(i, 'interest');
                                            return (
                                                <span
                                                    key={idx}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-500 ${isHighlighted ? 'bg-white/10 border border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] scale-100' : 'bg-white/5 border border-white/5 text-gray-500 opacity-30 scale-95 line-through decoration-white/20'}`}
                                                >
                                                    {i}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold flex items-center gap-2 mb-4 text-purple-300"><Trophy className="w-5 h-5" /> Hard & Soft Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredSkills.map((s, idx) => {
                                            const isHighlighted = checkHighlight(s, 'skill');
                                            return (
                                                <span
                                                    key={idx}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-500 ${isHighlighted ? 'bg-purple-500/20 border border-purple-500/30 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.1)] scale-100' : 'bg-white/5 border border-white/5 text-gray-500 opacity-30 scale-95 line-through decoration-white/20'}`}
                                                >
                                                    {s}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold flex items-center gap-2 mb-4 text-indigo-400"><Zap className="w-5 h-5" /> Inferred Strengths</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredStrengths.map((s, idx) => {
                                            const isHighlighted = checkHighlight(s, 'strength');
                                            return (
                                                <span
                                                    key={idx}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-500 ${isHighlighted ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)] scale-100' : 'bg-white/5 border border-white/5 text-gray-500 opacity-30 scale-95 line-through decoration-white/20'}`}
                                                >
                                                    {s}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold flex items-center gap-2 mb-4 text-emerald-400"><Briefcase className="w-5 h-5" /> Recommended Careers</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredCareers.map((c, idx) => {
                                            const isHighlighted = checkHighlight(c, 'career');
                                            return (
                                                <span
                                                    key={idx}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-500 ${isHighlighted ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)] scale-100' : 'bg-white/5 border border-white/5 text-gray-500 opacity-30 scale-95 line-through decoration-white/20'}`}
                                                >
                                                    {c}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </main>
    )
}

function StatBox({ label, value }) {
    return (
        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="text-2xl font-bold mb-1">{value}</div>
            <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
        </div>
    )
}
