"use client";

import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Youtube, Github, MessageCircle, Instagram, FileText, Save, Check, Loader2, Info, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
    const { user, profile, loading } = useAuth();
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const [sourceConfigs, setSourceConfigs] = useState({
        youtube: true,
        github: true,
        reddit: true,
        instagram: true,
        document: true
    });
    const [dbAnalysisConfigs, setDbAnalysisConfigs] = useState({
        youtube: true,
        github: true,
        reddit: true,
        instagram: true,
        document: true
    });
    const [allowDbAnalysis, setAllowDbAnalysis] = useState(true);

    useEffect(() => {
        if (profile) {
            if (profile.sourceConfigs) {
                setSourceConfigs({
                    youtube: profile.sourceConfigs.youtube !== false,
                    github: profile.sourceConfigs.github !== false,
                    reddit: profile.sourceConfigs.reddit !== false,
                    instagram: profile.sourceConfigs.instagram !== false,
                    document: profile.sourceConfigs.document !== false
                });
            }
            if (profile.dbAnalysisConfigs) {
                setDbAnalysisConfigs({
                    youtube: profile.dbAnalysisConfigs.youtube !== false,
                    github: profile.dbAnalysisConfigs.github !== false,
                    reddit: profile.dbAnalysisConfigs.reddit !== false,
                    instagram: profile.dbAnalysisConfigs.instagram !== false,
                    document: profile.dbAnalysisConfigs.document !== false
                });
            }
            // Default to true if not explicitly set to false
            setAllowDbAnalysis(profile.allowDbAnalysis !== false);
        }
    }, [profile]);

    const handleToggle = (source) => {
        setSourceConfigs(prev => ({
            ...prev,
            [source]: !prev[source]
        }));
        setSuccess(false);
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                sourceConfigs: sourceConfigs,
                dbAnalysisConfigs: dbAnalysisConfigs,
                allowDbAnalysis: allowDbAnalysis
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save settings:", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
    if (!user) return <div className="min-h-screen flex items-center justify-center text-white">Please log in to manage settings</div>;

    const sources = [
        { id: "youtube", name: "YouTube", icon: <Youtube />, color: "text-red-500", connected: !!profile?.youtube?.analysis },
        { id: "github", name: "GitHub", icon: <Github />, color: "text-gray-400", connected: !!profile?.github?.analysis },
        { id: "reddit", name: "Reddit", icon: <MessageCircle />, color: "text-orange-500", connected: !!profile?.reddit?.analysis },
        { id: "instagram", name: "Instagram", icon: <Instagram />, color: "text-pink-500", connected: !!profile?.instagram?.analysis },
        { id: "document", name: "Career Documents", icon: <FileText />, color: "text-blue-500", connected: !!profile?.document?.analysis },
    ];

    return (
        <div className="min-h-screen p-8 pt-32 flex justify-center bg-[#050505]">
            <div className="w-full max-w-3xl">
                <div className="flex items-center gap-4 mb-10">
                    <Link href="/" className="p-3 hover:bg-white/5 rounded-full transition-colors border border-transparent hover:border-white/10 shrink-0">
                        <ArrowLeft className="w-6 h-6 text-white" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tighter text-white mb-3 uppercase">AI Intelligence Settings</h1>
                        <p className="text-gray-400 font-medium">Configure which data sources the AI should consider when analyzing your profile and generating roadmaps.</p>
                    </div>
                </div>

                <div className="glass-panel p-8 border border-white/5 relative overflow-hidden mb-8">

                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center gap-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl mb-8">
                            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                            <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">
                                Turning off a source will exclude its derived interests, skills, and strengths from future AI analyzes. This helps you focus the AI on specific professional or personal goals.
                            </p>
                        </div>

                        {/* Global Data Setting */}
                        <div className="mb-10 p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-transparent">
                            <div className="flex items-center justify-between mb-2 gap-6">
                                <div>
                                    <h3 className="font-bold text-white text-xl">Allow AI Database Analysis</h3>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Grant the AI permission to analyze your stored data to provide insights and roadmaps.
                                        Turning this off restricts AI access to your profile data entirely.
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setAllowDbAnalysis(!allowDbAnalysis); setSuccess(false); }}
                                    className={`relative w-14 h-7 shrink-0 rounded-full transition-all duration-300 ${allowDbAnalysis ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all duration-300 transform ${allowDbAnalysis ? 'translate-x-7' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider border-b border-white/10 pb-2">Connected Sources</h2>

                        {sources.map(source => (
                            <div key={source.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${sourceConfigs[source.id] ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5 opacity-60'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl bg-white/5 ${source.color}`}>
                                        {source.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{source.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {source.connected ? (
                                                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Connected
                                                </span>
                                            ) : (
                                                <Link href="/analyze" className="text-[10px] uppercase font-black tracking-widest text-gray-500 hover:text-indigo-400 transition-colors">
                                                    Not Connected - Connect Now
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center">Dashboard<br />& Chat Visibility</span>
                                        <button
                                            onClick={() => handleToggle(source.id)}
                                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${sourceConfigs[source.id] ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-white/10'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 transform ${sourceConfigs[source.id] ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <div className="w-px h-10 bg-white/10 hidden sm:block"></div>
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center">Allow Data<br />Analysis</span>
                                        <button
                                            disabled={!allowDbAnalysis}
                                            onClick={() => { setDbAnalysisConfigs(prev => ({ ...prev, [source.id]: !prev[source.id] })); setSuccess(false); }}
                                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${allowDbAnalysis && dbAnalysisConfigs[source.id] ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-white/10'} ${!allowDbAnalysis ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 transform ${allowDbAnalysis && dbAnalysisConfigs[source.id] ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {success && (
                                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm animate-in fade-in slide-in-from-left-4 duration-500">
                                    <Check className="w-5 h-5" /> Settings Saved Automatically
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-500/50 rounded-xl font-black transition-all flex items-center gap-3 shadow-2xl shadow-indigo-600/20 active:scale-95 uppercase tracking-widest text-sm"
                        >
                            {saving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...</>
                            ) : (
                                <><Save className="w-4 h-4" /> Save Configuration</>
                            )}
                        </button>
                    </div>
                </div>

                <div className="text-center">
                    <Link href="/" className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
                        Return to Intelligence Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
