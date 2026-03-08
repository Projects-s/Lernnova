"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, linkWithPopup } from "firebase/auth";
import { auth, googleProvider, githubProvider, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { fetchYouTubeData } from "@/lib/youtube";
import { fetchGitHubData } from "@/lib/github";
import { fetchRedditData } from "@/lib/reddit";
import { analyzeYouTubeData, analyzeGitHubData, analyzeRedditData, analyzeDocumentData, analyzeInstagramData } from "@/lib/gemini"; // Import Gemini Service
import { Loader2, Youtube, Github, CheckCircle, AlertCircle, Brain, MessageSquare, RefreshCw, Database, Video, X, FileText, UploadCloud, Instagram, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function AnalyzePage() {
    const { user, profile } = useAuth();
    const [connecting, setConnecting] = useState(false);
    const [uploadingRd, setUploadingRd] = useState(false);
    const [uploadingIg, setUploadingIg] = useState(false);
    const [analyzingYt, setAnalyzingYt] = useState(false); // New states for individual AI processing
    const [analyzingGh, setAnalyzingGh] = useState(false);
    const [analyzingRd, setAnalyzingRd] = useState(false);
    const [analyzingIg, setAnalyzingIg] = useState(false);
    const [analyzingDoc, setAnalyzingDoc] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    const [ytData, setYtData] = useState(null);
    const [ghData, setGhData] = useState(null);
    const [rdData, setRdData] = useState(null);
    const [igData, setIgData] = useState(null);
    const [docData, setDocData] = useState(null);
    const [error, setError] = useState(null);
    const [selectedDetail, setSelectedDetail] = useState(null); // To control detail modal

    const currentYtData = ytData || profile?.youtube?.data || profile?.youtubeData;
    const currentGhData = ghData || profile?.github?.data || profile?.githubData;
    const currentRdData = rdData || profile?.reddit?.data || profile?.redditData;
    const currentIgData = igData || profile?.instagram?.data || profile?.instagramData;
    const currentDocData = docData || profile?.document?.data || profile?.documentData;

    const ytAnalysis = profile?.youtube?.analysis || profile?.youtubeAnalysis;
    const ghAnalysis = profile?.github?.analysis || profile?.githubAnalysis;
    const rdAnalysis = profile?.reddit?.analysis || profile?.redditAnalysis;
    const igAnalysis = profile?.instagram?.analysis || profile?.instagramAnalysis;
    const docAnalysis = profile?.document?.analysis || profile?.documentAnalysis;

    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes("access_token")) {
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get("access_token");

            if (accessToken && user) {
                handleRedditCallback(accessToken);
            }
        }
    }, [user]);

    const handleRedditUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingRd(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload-reddit-zip", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to parse Reddit zip");

            setRdData(data);

            const currentUser = user || auth.currentUser;
            if (currentUser) {
                const cleanData = JSON.parse(JSON.stringify(data));
                await setDoc(doc(db, "users", currentUser.uid), {
                    reddit: {
                        data: cleanData,
                        lastSync: new Date().toISOString()
                    }
                }, { merge: true });
            }
        } catch (err) {
            console.error(err);
            setError("Reddit ZIP error: " + err.message);
        } finally {
            setUploadingRd(false);
            e.target.value = null;
        }
    };

    const handleInstagramUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingIg(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload-instagram-zip", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to parse Instagram zip");

            setIgData(data);

            const currentUser = user || auth.currentUser;
            if (currentUser) {
                const cleanData = JSON.parse(JSON.stringify(data));
                await setDoc(doc(db, "users", currentUser.uid), {
                    instagram: {
                        data: cleanData,
                        lastSync: new Date().toISOString()
                    }
                }, { merge: true });
            }
        } catch (err) {
            console.error(err);
            setError("Instagram ZIP error: " + err.message);
        } finally {
            setUploadingIg(false);
            e.target.value = null;
        }
    };

    const handleAnalyzeYouTube = async () => {
        if (!currentYtData) return;
        if (profile?.allowDbAnalysis === false || profile?.dbAnalysisConfigs?.youtube === false) {
            setError("Database Analysis for YouTube is disabled in your AI Settings.");
            return;
        }
        setAnalyzingYt(true);
        setError(null);
        try {
            await analyzeYouTubeData(user.uid, currentYtData);
        } catch (err) {
            console.error(err);
            setError("Analysis failed: " + err.message);
        } finally {
            setAnalyzingYt(false);
        }
    };

    const handleAnalyzeGitHub = async () => {
        if (!currentGhData) return;
        if (profile?.allowDbAnalysis === false || profile?.dbAnalysisConfigs?.github === false) {
            setError("Database Analysis for GitHub is disabled in your AI Settings.");
            return;
        }
        setAnalyzingGh(true);
        setError(null);
        try {
            await analyzeGitHubData(user.uid, currentGhData);
        } catch (err) {
            console.error(err);
            setError("Analysis failed: " + err.message);
        } finally {
            setAnalyzingGh(false);
        }
    };

    const handleAnalyzeReddit = async () => {
        if (!currentRdData) return;
        if (profile?.allowDbAnalysis === false || profile?.dbAnalysisConfigs?.reddit === false) {
            setError("Database Analysis for Reddit is disabled in your AI Settings.");
            return;
        }
        setAnalyzingRd(true);
        setError(null);
        try {
            await analyzeRedditData(user.uid, currentRdData);
        } catch (err) {
            console.error(err);
            setError("Analysis failed: " + err.message);
        } finally {
            setAnalyzingRd(false);
        }
    };

    const handleAnalyzeInstagram = async () => {
        if (!currentIgData) return;
        if (profile?.allowDbAnalysis === false || profile?.dbAnalysisConfigs?.instagram === false) {
            setError("Database Analysis for Instagram is disabled in your AI Settings.");
            return;
        }
        setAnalyzingIg(true);
        setError(null);
        try {
            await analyzeInstagramData(user.uid, currentIgData);
        } catch (err) {
            console.error(err);
            setError("Analysis failed: " + err.message);
        } finally {
            setAnalyzingIg(false);
        }
    };

    const handleAnalyzeDoc = async () => {
        if (!currentDocData) return;
        if (profile?.allowDbAnalysis === false || profile?.dbAnalysisConfigs?.document === false) {
            setError("Database Analysis for Documents is disabled in your AI Settings.");
            return;
        }
        setAnalyzingDoc(true);
        setError(null);
        try {
            await analyzeDocumentData(user.uid, currentDocData);
        } catch (err) {
            console.error(err);
            setError("Analysis failed: " + err.message);
        } finally {
            setAnalyzingDoc(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingDoc(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload-doc", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to parse document");

            setDocData(data);

            const currentUser = user || auth.currentUser;
            if (currentUser) {
                const cleanData = JSON.parse(JSON.stringify(data));
                await setDoc(doc(db, "users", currentUser.uid), {
                    document: {
                        data: cleanData,
                        lastSync: new Date().toISOString()
                    }
                }, { merge: true });
            }
        } catch (err) {
            console.error(err);
            setError("Document processing error: " + err.message);
        } finally {
            setUploadingDoc(false);
            e.target.value = null; // reset input
        }
    };

    const connectYouTube = async () => {
        setConnecting(true);
        setError(null);
        try {


            let result;
            const activeUser = user || auth.currentUser;

            try {
                if (activeUser) {
                    // Attempt to permanently link this new Google scope/account to the current active user
                    result = await linkWithPopup(activeUser, googleProvider);
                } else {
                    result = await signInWithPopup(auth, googleProvider);
                }
            } catch (err) {
                if (
                    err.code === 'auth/credential-already-in-use' ||
                    err.code === 'auth/provider-already-linked' ||
                    err.code === 'auth/argument-error'
                ) {
                    // Safe fallback: This exact Google account is already heavily tied to a profile
                    // By signing in with it, we successfully inherit its updated scopes (like YouTube)
                    result = await signInWithPopup(auth, googleProvider);
                } else {
                    throw err;
                }
            }

            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;

            if (!token) {
                throw new Error("Failed to get access token from Google");
            }

            // Fetch Data directly
            const data = await fetchYouTubeData(token);
            setYtData(data);
            console.log("YouTube Data Fetched:", data);

            // SAVE TO FIRESTORE
            const currentUser = user || result.user;
            if (currentUser) {
                const cleanData = JSON.parse(JSON.stringify(data));
                await setDoc(doc(db, "users", currentUser.uid), {
                    youtube: {
                        data: cleanData,
                        lastSync: new Date().toISOString()
                    }
                }, { merge: true });
                console.log(`Saved to Firestore for user: ${currentUser.uid}`);

                // TRIGGER GEMINI ANALYSIS
                // setAnalyzing(true);
                // await analyzeYouTubeData(currentUser.uid, data);
                // setAnalyzing(false);
                // console.log("Gemini Profile Generated!");
            }

        } catch (err) {
            console.error(err);
            setError("Failed to connect YouTube: " + err.message);
        } finally {
            setConnecting(false);
        }
    };

    const connectGitHub = async () => {
        setConnecting(true);
        setError(null);
        try {


            let result;
            const activeUser = user || auth.currentUser;

            try {
                if (activeUser) {
                    // Attempt to permanently link this new GitHub account to the current active user
                    result = await linkWithPopup(activeUser, githubProvider);
                } else {
                    result = await signInWithPopup(auth, githubProvider);
                }
            } catch (err) {
                if (
                    err.code === 'auth/credential-already-in-use' ||
                    err.code === 'auth/provider-already-linked' ||
                    err.code === 'auth/argument-error'
                ) {
                    // Safe fallback: This exact GitHub account is already tied to a profile
                    // By signing in with it, we successfully inherit its updated scopes
                    result = await signInWithPopup(auth, githubProvider);
                } else {
                    throw err;
                }
            }

            const credential = GithubAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;

            if (!token) {
                throw new Error("Failed to get access token from GitHub");
            }

            const data = await fetchGitHubData(token);
            setGhData(data);
            console.log("GitHub Data Fetched:", data);

            const currentUser = user || result.user;
            if (currentUser) {
                const cleanData = JSON.parse(JSON.stringify(data));
                await setDoc(doc(db, "users", currentUser.uid), {
                    github: {
                        data: cleanData,
                        lastSync: new Date().toISOString()
                    }
                }, { merge: true });
                console.log(`Saved to Firestore for user: ${currentUser.uid}`);

                // setAnalyzing(true);
                // await analyzeGitHubData(currentUser.uid, data);
                // setAnalyzing(false);
            }

        } catch (err) {
            console.error(err);
            setError("Failed to connect GitHub: " + err.message);
        } finally {
            setConnecting(false);
        }
    };

    // Reddit Connect Mock removed for Direct Upload Pipeline

    return (
        <main className="min-h-screen bg-[#030014] text-white pb-20">
            <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
            </div>

            <Navbar />

            <div className="container mx-auto px-4 pt-16 max-w-7xl">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-12">
                    <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors self-start md:self-auto shrink-0 mt-1 md:mt-0">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="text-left">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Analyze Your <span className="text-gradient">Digital Footprint</span>
                        </h1>
                        <p className="text-muted text-lg max-w-2xl">
                            Connect your social accounts to uncover your hidden interests and skills.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                <div className="flex flex-col gap-8">
                    {/* YouTube Connector */}
                    <div className="glass-panel p-8 flex flex-col lg:flex-row gap-8 items-stretch">
                        <div className="flex-[1.5] text-center lg:text-left w-full min-w-0 shrink-0">
                            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 mb-4">
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
                                    <Youtube className="w-8 h-8 text-red-500" />
                                </div>
                                <div className="pt-2">
                                    <h2 className="text-2xl font-bold">YouTube</h2>
                                    {currentYtData && (
                                        <div className="flex items-center justify-center lg:justify-start gap-2 font-semibold text-green-400 text-sm mt-1">
                                            <CheckCircle className="w-4 h-4" />
                                            {(profile?.youtube?.lastSync || profile?.lastAnalyzed) ? `Updated: ${new Date(profile?.youtube?.lastSync || profile?.lastAnalyzed).toLocaleDateString()}` : 'Connected'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-muted mb-6 text-sm">
                                We analyze your liked videos and subscriptions to identify your learning patterns and hobbies.
                            </p>

                            {!currentYtData ? (
                                <button
                                    onClick={connectYouTube}
                                    disabled={connecting}
                                    className="btn bg-red-600 hover:bg-red-700 text-white w-full py-3 flex items-center justify-center gap-2"
                                >
                                    {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
                                    {connecting ? "Connecting..." : "Connect YouTube"}
                                </button>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={handleAnalyzeYouTube}
                                            disabled={analyzingYt}
                                            className="btn bg-purple-600 hover:bg-purple-700 text-white flex flex-1 items-center justify-center gap-2 py-3"
                                        >
                                            <Brain className="w-4 h-4" />
                                            {ytAnalysis ? "Re-Analyze" : "Analyze"}
                                        </button>
                                        <button
                                            onClick={() => setSelectedDetail('youtube')}
                                            className="btn bg-indigo-600 hover:bg-indigo-700 text-white flex flex-1 items-center justify-center gap-2 py-3"
                                        >
                                            <Video className="w-4 h-4" />
                                            Detailed View
                                        </button>
                                    </div>
                                    <button
                                        onClick={connectYouTube}
                                        disabled={connecting}
                                        className="btn bg-white/5 hover:bg-white/10 text-white flex flex-1 items-center justify-center gap-2 py-2 border border-white/10 text-sm"
                                    >
                                        {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        {connecting ? "Syncing..." : "Re-Sync"}
                                    </button>
                                </div>
                            )}
                            {error && (
                                <div className="mt-4 text-red-400 text-sm flex items-center justify-center lg:justify-start gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            {currentYtData && ytAnalysis && !analyzingYt && (
                                <div className="mt-8 text-left bg-[#0A0A0A] rounded-xl border border-white/10 p-5 flex flex-col gap-4">
                                    <span className="text-[10px] font-bold text-purple-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider pb-2 border-b border-white/5">
                                        <Brain className="w-3 h-3 animate-pulse" /> AI Video Analysis
                                    </span>
                                    <div>
                                        <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Learning Persona</p>
                                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-md p-3 text-xs text-purple-200">
                                            <span className="text-purple-300 font-bold">{ytAnalysis.learningStyle?.format}</span> learner • <span className="text-purple-300 font-bold">{ytAnalysis.learningStyle?.depth}</span>
                                            <p className="mt-2 opacity-80 italic border-t border-purple-500/20 pt-2 text-[11px] leading-relaxed">&quot;{ytAnalysis.learningStyle?.reasoning}&quot;</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Core Interests</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {ytAnalysis.interests?.map((item, i) => <span key={i} className="text-xs px-2 py-1 bg-white/5 text-gray-300 border border-white/10 rounded-md">{item}</span>)}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Inferred Knowledge</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {ytAnalysis.skills?.map((item, i) => <span key={i} className="text-[11px] px-2 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md font-medium">{item}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Suggested Roles</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {ytAnalysis.suggestedCareers?.map((item, i) => <span key={i} className="text-[11px] px-2 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md font-medium">{item}</span>)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {currentYtData && (
                            <div className="flex-1 min-w-0 w-full bg-black/40 rounded-xl border border-white/10 p-6 flex flex-col gap-6 relative">
                                {analyzingYt ? (
                                    <div className="bg-purple-500/10 text-purple-400 w-full h-full rounded-lg flex flex-col items-center justify-center gap-3 animate-pulse absolute inset-0 m-6">
                                        <Brain className="w-8 h-8 animate-pulse" />
                                        <span>Sifting through your digital threads...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-4 pb-4 border-b border-white/10">
                                            <div className="flex-1">
                                                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Subscriptions</span>
                                                <span className="text-white font-medium text-xl">{currentYtData.subscriptions?.length || 0}</span>
                                            </div>
                                            <div className="flex-1">
                                                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Likes</span>
                                                <span className="text-white font-medium text-xl">{currentYtData.likedVideos?.length || 0}</span>
                                            </div>
                                        </div>

                                        {/* Raw DB Data View */}
                                        <div className="flex-1 min-w-0 bg-[#0A0A0A] rounded-lg border border-white/5 p-4 flex flex-col min-h-0">
                                            <span className="text-[10px] font-bold text-indigo-400 mb-2 border-b border-white/5 pb-2 flex items-center justify-between uppercase tracking-wider shrink-0">
                                                <span>Raw DB Export</span>
                                                <Database className="w-3 h-3" />
                                            </span>
                                            <div className="relative flex-1 min-h-0 h-full">
                                                <pre className="absolute inset-0 text-[10px] text-green-400/80 font-mono overflow-auto custom-scrollbar">
                                                    {JSON.stringify(currentYtData, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* GitHub Connector */}
                    <div className="glass-panel p-8 flex flex-col lg:flex-row gap-8 items-stretch">
                        <div className="flex-[1.5] text-center lg:text-left w-full min-w-0 shrink-0">
                            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 mb-4">
                                <div className="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center shrink-0">
                                    <Github className="w-8 h-8 text-gray-300" />
                                </div>
                                <div className="pt-2">
                                    <h2 className="text-2xl font-bold">GitHub</h2>
                                    {currentGhData && (
                                        <div className="flex items-center justify-center lg:justify-start gap-2 font-semibold text-green-400 text-sm mt-1">
                                            <CheckCircle className="w-4 h-4" />
                                            {(profile?.github?.lastSync || profile?.lastAnalyzed) ? `Updated: ${new Date(profile?.github?.lastSync || profile?.lastAnalyzed).toLocaleDateString()}` : 'Connected'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-muted mb-6 text-sm">
                                We analyze your repositories and tech stack to identify your development skills and coding patterns.
                            </p>

                            {!currentGhData ? (
                                <button
                                    onClick={connectGitHub}
                                    disabled={connecting}
                                    className="btn bg-gray-700 hover:bg-gray-600 text-white w-full py-3 flex items-center justify-center gap-2"
                                >
                                    {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                                    {connecting ? "Connecting..." : "Connect GitHub"}
                                </button>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleAnalyzeGitHub}
                                        disabled={analyzingGh}
                                        className="btn bg-purple-600 hover:bg-purple-700 text-white w-full flex flex-1 items-center justify-center gap-2 py-3"
                                    >
                                        <Brain className="w-4 h-4" />
                                        {ghAnalysis ? "Re-Analyze" : "Analyze"}
                                    </button>
                                    <button
                                        onClick={connectGitHub}
                                        disabled={connecting}
                                        className="btn bg-white/5 hover:bg-white/10 text-white flex flex-1 items-center justify-center gap-2 py-2 border border-white/10 text-sm"
                                    >
                                        {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        {connecting ? "Syncing..." : "Re-Sync"}
                                    </button>
                                </div>
                            )}

                            {currentGhData && ghAnalysis && !analyzingGh && (
                                <div className="mt-8 text-left bg-[#0A0A0A] rounded-xl border border-white/10 p-5 flex flex-col gap-4">
                                    <span className="text-[10px] font-bold text-teal-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider pb-2 border-b border-white/5">
                                        <Brain className="w-3 h-3 animate-pulse" /> Engineering Profile
                                    </span>
                                    <div>
                                        <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Development Style</p>
                                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-md p-3 text-xs text-teal-200">
                                            <span className="text-teal-300 font-bold">{ghAnalysis.learningStyle?.format}</span> focus • <span className="text-teal-300 font-bold">{ghAnalysis.learningStyle?.depth}</span>
                                            <p className="mt-2 opacity-80 italic border-t border-teal-500/20 pt-2 text-[11px] leading-relaxed">&quot;{ghAnalysis.learningStyle?.reasoning}&quot;</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Tech Stack & Frameworks</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {ghAnalysis.skills?.map((item, i) => <span key={i} className="text-[11px] px-2 py-1 bg-green-500/10 text-green-300 border border-green-500/20 rounded-md font-medium">{item}</span>)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Suggested Roles</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {ghAnalysis.suggestedCareers?.map((item, i) => <span key={i} className="text-xs px-2 py-1 bg-white/5 text-gray-300 border border-white/10 rounded-md">{item}</span>)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {currentGhData && (
                            <div className="flex-1 min-w-0 w-full bg-black/40 rounded-xl border border-white/10 p-6 flex flex-col gap-6 relative">
                                {analyzingGh ? (
                                    <div className="bg-purple-500/10 text-purple-400 w-full h-full rounded-lg flex flex-col items-center justify-center gap-3 animate-pulse absolute inset-0 m-6">
                                        <Brain className="w-8 h-8 animate-pulse" />
                                        <span>Analyzing your code...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-4 pb-4 border-b border-white/10">
                                            <div className="flex-1">
                                                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Public Repos</span>
                                                <span className="text-white font-medium text-xl">{currentGhData.ownRepos?.length || 0}</span>
                                            </div>
                                            <div className="flex-1">
                                                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Starred Repos</span>
                                                <span className="text-white font-medium text-xl">{currentGhData.starredRepos?.length || 0}</span>
                                            </div>
                                        </div>

                                        {/* Raw DB Data View */}
                                        <div className="flex-1 min-w-0 bg-[#0A0A0A] rounded-lg border border-white/5 p-4 flex flex-col min-h-0">
                                            <span className="text-[10px] font-bold text-indigo-400 mb-2 border-b border-white/5 pb-2 flex items-center justify-between uppercase tracking-wider shrink-0">
                                                <span>Raw DB Export</span>
                                                <Database className="w-3 h-3" />
                                            </span>
                                            <div className="relative flex-1 min-h-0 h-full">
                                                <pre className="absolute inset-0 text-[10px] text-green-400/80 font-mono overflow-auto custom-scrollbar">
                                                    {JSON.stringify(currentGhData, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Reddit Connector */}
                    <div className="glass-panel p-8 flex flex-col lg:flex-row gap-8 items-stretch">
                        <div className="flex-[1.5] text-center lg:text-left w-full min-w-0 shrink-0">
                            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 mb-4">
                                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center shrink-0">
                                    <MessageSquare className="w-8 h-8 text-orange-500" />
                                </div>
                                <div className="pt-2">
                                    <h2 className="text-2xl font-bold">Reddit</h2>
                                    {currentRdData && (
                                        <div className="flex items-center justify-center lg:justify-start gap-2 font-semibold text-green-400 text-sm mt-1">
                                            <CheckCircle className="w-4 h-4" />
                                            {(profile?.reddit?.lastSync || profile?.lastAnalyzed) ? `Updated: ${new Date(profile?.reddit?.lastSync || profile?.lastAnalyzed).toLocaleDateString()}` : 'Connected'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-muted mb-6 text-sm">
                                Upload your Reddit &quot;Download Your Data&quot; `zip` export to extract niche hobbies and community insights securely.
                            </p>

                            {!currentRdData ? (
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".zip"
                                        onChange={handleRedditUpload}
                                        disabled={uploadingRd}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                    />
                                    <button
                                        disabled={uploadingRd}
                                        className="btn bg-orange-600 hover:bg-orange-700 text-white w-full py-3 flex items-center justify-center gap-2 relative z-0"
                                    >
                                        {uploadingRd ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                        {uploadingRd ? "Uploading Data..." : "Upload Reddit Export"}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleAnalyzeReddit}
                                        disabled={analyzingRd}
                                        className="btn bg-purple-600 hover:bg-purple-700 text-white w-full flex flex-1 items-center justify-center gap-2 py-3"
                                    >
                                        <Brain className="w-4 h-4" />
                                        {rdAnalysis ? "Re-Analyze" : "Analyze"}
                                    </button>
                                    <div className="relative flex-1">
                                        <input
                                            type="file"
                                            accept=".zip"
                                            onChange={handleRedditUpload}
                                            disabled={uploadingRd}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                        />
                                        <button
                                            disabled={uploadingRd}
                                            className="btn bg-white/5 hover:bg-white/10 text-white flex flex-1 items-center justify-center w-full gap-2 py-2 border border-white/10 text-sm relative z-0"
                                        >
                                            {uploadingRd ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            {uploadingRd ? "Uploading..." : "Upload New Export"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentRdData && rdAnalysis && !analyzingRd && (
                                <div className="mt-8 text-left bg-[#0A0A0A] rounded-xl border border-white/10 p-5 flex flex-col gap-4">
                                    <span className="text-[10px] font-bold text-orange-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider pb-2 border-b border-white/5">
                                        <Brain className="w-3 h-3 animate-pulse" /> Community Profile
                                    </span>
                                    <div>
                                        <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Niche Hobbies</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {rdAnalysis.interests?.map((item, i) => <span key={i} className="text-xs px-2 py-1 bg-white/5 text-gray-300 border border-white/10 rounded-md">{item}</span>)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Personality Traits</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {rdAnalysis.personalityTraits?.map((item, i) => <span key={i} className="text-[10px] px-2 py-1 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-md font-medium uppercase tracking-wider">{item}</span>)}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Domain Knowledge</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {rdAnalysis.skills?.map((item, i) => <span key={i} className="text-[11px] px-2 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-md font-medium">{item}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Suggested Roles</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {rdAnalysis.suggestedCareers?.map((item, i) => <span key={i} className="text-[11px] px-2 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md font-medium">{item}</span>)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {currentRdData && (
                            <div className="flex-1 min-w-0 w-full bg-black/40 rounded-xl border border-white/10 p-6 flex flex-col gap-6 relative">
                                {analyzingRd ? (
                                    <div className="bg-purple-500/10 text-purple-400 w-full h-full rounded-lg flex flex-col items-center justify-center gap-3 animate-pulse absolute inset-0 m-6">
                                        <Brain className="w-8 h-8 animate-pulse" />
                                        <span>Reading your threads...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-4 pb-4 border-b border-white/10">
                                            <div className="flex-1">
                                                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Communities</span>
                                                <span className="text-white font-medium text-xl">{currentRdData.subreddits?.length || 0}</span>
                                            </div>
                                            <div className="flex-1">
                                                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Total Karma</span>
                                                <span className="text-white font-medium text-xl">{currentRdData.profile?.total_karma?.toLocaleString() || 0}</span>
                                            </div>
                                        </div>

                                        {/* Raw DB Data View */}
                                        <div className="flex-1 min-w-0 bg-[#0A0A0A] rounded-lg border border-white/5 p-4 flex flex-col min-h-0">
                                            <span className="text-[10px] font-bold text-indigo-400 mb-2 border-b border-white/5 pb-2 flex items-center justify-between uppercase tracking-wider shrink-0">
                                                <span>Raw DB Export</span>
                                                <Database className="w-3 h-3" />
                                            </span>
                                            <div className="relative flex-1 min-h-0 h-full">
                                                <pre className="absolute inset-0 text-[10px] text-green-400/80 font-mono overflow-auto custom-scrollbar">
                                                    {JSON.stringify(currentRdData, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Document Upload Connector */}
                    <div className="glass-panel p-8 flex flex-col lg:flex-row gap-8 items-stretch">
                        <div className="flex-[1.5] text-center lg:text-left w-full min-w-0 shrink-0">
                            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 mb-4">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
                                    <FileText className="w-8 h-8 text-blue-400" />
                                </div>
                                <div className="pt-2">
                                    <h2 className="text-2xl font-bold">Resume / Document</h2>
                                    {currentDocData && (
                                        <div className="flex items-center justify-center lg:justify-start gap-2 font-semibold text-green-400 text-sm mt-1">
                                            <CheckCircle className="w-4 h-4" />
                                            {(profile?.document?.lastSync || profile?.lastAnalyzed) ? `Updated: ${new Date(profile?.document?.lastSync || profile?.lastAnalyzed).toLocaleDateString()}` : 'Connected'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-muted mb-6 text-sm">
                                Upload your Resume, CV, or Portfolio (.pdf, .docx, .txt) to extract your professional timeline, core competencies, and career trajectory.
                            </p>

                            {!currentDocData ? (
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".pdf,.docx,.txt"
                                        onChange={handleFileUpload}
                                        disabled={uploadingDoc}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                    />
                                    <button
                                        disabled={uploadingDoc}
                                        className="btn bg-blue-600 hover:bg-blue-700 text-white w-full py-3 flex items-center justify-center gap-2 relative z-0"
                                    >
                                        {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                        {uploadingDoc ? "Parsing Document..." : "Upload Document"}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleAnalyzeDoc}
                                        disabled={analyzingDoc}
                                        className="btn bg-purple-600 hover:bg-purple-700 text-white w-full flex flex-1 items-center justify-center gap-2 py-3"
                                    >
                                        <Brain className="w-4 h-4" />
                                        {docAnalysis ? "Re-Analyze" : "Analyze"}
                                    </button>
                                    <div className="relative flex-1">
                                        <input
                                            type="file"
                                            accept=".pdf,.docx,.txt"
                                            onChange={handleFileUpload}
                                            disabled={uploadingDoc}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                        />
                                        <button
                                            disabled={uploadingDoc}
                                            className="btn bg-white/5 hover:bg-white/10 text-white w-full flex items-center justify-center gap-2 py-2 border border-white/10 text-sm relative z-0"
                                        >
                                            {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            {uploadingDoc ? "Uploading..." : "Upload New File"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentDocData && docAnalysis && !analyzingDoc && (
                                <div className="mt-8 text-left bg-[#0A0A0A] rounded-xl border border-white/10 p-5 flex flex-col gap-4">
                                    <span className="text-[10px] font-bold text-blue-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider pb-2 border-b border-white/5">
                                        <Brain className="w-3 h-3 animate-pulse" /> Career Profile
                                    </span>
                                    <div>
                                        <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Professional Domains</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {docAnalysis.interests?.map((item, i) => <span key={i} className="text-xs px-2 py-1 bg-white/5 text-gray-300 border border-white/10 rounded-md">{item}</span>)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Identified Skills</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {docAnalysis.skills?.map((item, i) => <span key={i} className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-md font-medium uppercase tracking-wider">{item}</span>)}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Career Paths</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {docAnalysis.suggestedCareers?.map((item, i) => <span key={i} className="text-[11px] px-2 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md font-medium">{item}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {currentDocData && (
                            <div className="flex-1 min-w-0 w-full bg-black/40 rounded-xl border border-white/10 p-6 flex flex-col gap-6 relative">
                                {analyzingDoc ? (
                                    <div className="bg-purple-500/10 text-purple-400 w-full h-full rounded-lg flex flex-col items-center justify-center gap-3 animate-pulse absolute inset-0 m-6">
                                        <Brain className="w-8 h-8 animate-pulse" />
                                        <span>Parsing document contents...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-4 pb-4 border-b border-white/10">
                                            <div className="flex-1">
                                                <span className="block text-xs uppercase tracking-wider text-muted mb-1">File Name</span>
                                                <span className="text-white font-medium text-sm truncate block max-w-[200px]" title={currentDocData.fileName}>{currentDocData.fileName || "unknown_file"}</span>
                                            </div>
                                            <div className="flex-1">
                                                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Size</span>
                                                <span className="text-white font-medium text-xl">{(currentDocData.fileSize / 1024).toFixed(1)} KB</span>
                                            </div>
                                        </div>

                                        {/* Raw DB Data View */}
                                        <div className="flex-1 min-w-0 bg-[#0A0A0A] rounded-lg border border-white/5 p-4 flex flex-col min-h-0">
                                            <span className="text-[10px] font-bold text-indigo-400 mb-2 border-b border-white/5 pb-2 flex items-center justify-between uppercase tracking-wider shrink-0">
                                                <span>Raw Extraction Export</span>
                                                <Database className="w-3 h-3" />
                                            </span>
                                            <div className="relative flex-1 min-h-0 h-full">
                                                <pre className="absolute inset-0 text-[10px] text-green-400/80 font-mono overflow-auto custom-scrollbar">
                                                    {JSON.stringify(currentDocData, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Instagram Connector */}
                    <div className="glass-panel p-8 flex flex-col lg:flex-row gap-8 items-stretch">
                        <div className="flex-[1.5] text-center lg:text-left w-full min-w-0 shrink-0">
                            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 mb-4">
                                <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center shrink-0">
                                    <Instagram className="w-8 h-8 text-pink-500" />
                                </div>
                                <div className="pt-2">
                                    <h2 className="text-2xl font-bold">Instagram (Archive)</h2>
                                    {currentIgData && (
                                        <div className="flex items-center justify-center lg:justify-start gap-2 font-semibold text-green-400 text-sm mt-1">
                                            <CheckCircle className="w-4 h-4" />
                                            {(profile?.instagram?.lastSync || profile?.lastAnalyzed) ? `Updated: ${new Date(profile?.instagram?.lastSync || profile?.lastAnalyzed).toLocaleDateString()}` : 'Connected'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-muted mb-6 text-sm">
                                Upload your Instagram &quot;Download Your Information&quot; `zip` export to decode your visual aesthetic, algorithmic ad interests, and curated lifestyle.
                            </p>

                            {!currentIgData ? (
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".zip"
                                        onChange={handleInstagramUpload}
                                        disabled={uploadingIg}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                    />
                                    <button
                                        disabled={uploadingIg}
                                        className="btn bg-pink-600 hover:bg-pink-700 text-white w-full py-3 flex items-center justify-center gap-2 relative z-0"
                                    >
                                        {uploadingIg ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                        {uploadingIg ? "Extrating Zip..." : "Upload Insta Zip"}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleAnalyzeInstagram}
                                        disabled={analyzingIg}
                                        className="btn bg-purple-600 hover:bg-purple-700 text-white w-full flex flex-1 items-center justify-center gap-2 py-3"
                                    >
                                        <Brain className="w-4 h-4" />
                                        {igAnalysis ? "Re-Analyze Profile" : "Analyze My Aesthetic"}
                                    </button>
                                    <div className="relative flex-1">
                                        <input
                                            type="file"
                                            accept=".zip"
                                            onChange={handleInstagramUpload}
                                            disabled={uploadingIg}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                        />
                                        <button
                                            disabled={uploadingIg}
                                            className="btn bg-white/5 hover:bg-white/10 text-white flex flex-1 items-center justify-center w-full gap-2 py-2 border border-white/10 text-sm relative z-0"
                                        >
                                            {uploadingIg ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            {uploadingIg ? "Uploading..." : "Upload Newer Export"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentIgData && igAnalysis && !analyzingIg && (
                                <div className="mt-8 text-left bg-[#0A0A0A] rounded-xl border border-white/10 p-5 flex flex-col gap-4">
                                    <span className="text-[10px] font-bold text-pink-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider pb-2 border-b border-white/5">
                                        <Brain className="w-3 h-3 animate-pulse" /> Aesthetic Profile
                                    </span>
                                    <div>
                                        <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Lifestyle / Hobbies</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {igAnalysis.interests?.map((item, i) => <span key={i} className="text-xs px-2 py-1 bg-white/5 text-gray-300 border border-white/10 rounded-md">{item}</span>)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Personality Traits</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {igAnalysis.personalityTraits?.map((item, i) => <span key={i} className="text-[10px] px-2 py-1 bg-pink-500/10 text-pink-300 border border-pink-500/20 rounded-md font-medium uppercase tracking-wider">{item}</span>)}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Suggested Focus</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {igAnalysis.skills?.map((item, i) => <span key={i} className="text-[11px] px-2 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md font-medium">{item}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-white mb-2 opacity-50 uppercase tracking-wider">Suggested Roles</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {igAnalysis.suggestedCareers?.map((item, i) => <span key={i} className="text-[11px] px-2 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md font-medium">{item}</span>)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {currentIgData && (
                            <div className="flex-1 min-w-0 w-full bg-black/40 rounded-xl border border-white/10 p-6 flex flex-col gap-6 relative">
                                {analyzingIg ? (
                                    <div className="bg-purple-500/10 text-purple-400 w-full h-full rounded-lg flex flex-col items-center justify-center gap-3 animate-pulse absolute inset-0 m-6">
                                        <Brain className="w-8 h-8 animate-pulse" />
                                        <span>Decoding your aesthetic & algos...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-4 border-b border-white/10">
                                            <div className="flex-1">
                                                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Accounts</span>
                                                <span className="text-white font-medium text-xl">{currentIgData.following?.length || 0}</span>
                                            </div>
                                            <div className="flex-1">
                                                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Likes</span>
                                                <span className="text-white font-medium text-xl">{currentIgData.profile?.likes_count?.toLocaleString() || 0}</span>
                                            </div>
                                            <div className="flex-1">
                                                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Advertisers</span>
                                                <span className="text-white font-medium text-xl">{currentIgData.advertisers?.length || 0}</span>
                                            </div>
                                        </div>

                                        {/* Raw DB Data View */}
                                        <div className="flex-1 min-w-0 bg-[#0A0A0A] rounded-lg border border-white/5 p-4 flex flex-col min-h-0">
                                            <span className="text-[10px] font-bold text-indigo-400 mb-2 border-b border-white/5 pb-2 flex items-center justify-between uppercase tracking-wider shrink-0">
                                                <span>Raw Extraction Export</span>
                                                <Database className="w-3 h-3" />
                                            </span>
                                            <div className="relative flex-1 min-h-0 h-full">
                                                <pre className="absolute inset-0 text-[10px] text-green-400/80 font-mono overflow-auto custom-scrollbar">
                                                    {JSON.stringify(currentIgData, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Detail Modal */}
            {
                selectedDetail === 'youtube' && currentYtData && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-fade-in-up">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-xl">
                                <h3 className="text-2xl font-bold flex items-center gap-3">
                                    <Youtube className="w-6 h-6 text-red-500" />
                                    YouTube Detailed View
                                </h3>
                                <button onClick={() => setSelectedDetail(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                                <div className="space-y-8">
                                    <div>
                                        <h4 className="text-xl font-semibold mb-4 text-indigo-400 border-b border-white/10 pb-2">Liked Videos</h4>
                                        {currentYtData.likedVideos?.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {currentYtData.likedVideos.map((video, idx) => (
                                                    <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-lg flex flex-col gap-2 hover:border-white/20 transition-colors">
                                                        <h5 className="font-medium text-sm line-clamp-2" title={video.title}>{video.title}</h5>
                                                        <div className="flex justify-between items-center text-xs text-muted mt-auto pt-2">
                                                            <span className="bg-black/30 px-2 py-1 rounded truncate max-w-[150px]">{video.channel}</span>
                                                            {video.duration && <span className="bg-black/30 px-2 py-1 rounded">{video.duration.replace('PT', '').toLowerCase()}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted text-sm px-2">No liked videos found.</p>
                                        )}
                                    </div>

                                    {currentYtData.playlists?.length > 0 && (
                                        <div>
                                            <h4 className="text-xl font-semibold mb-4 text-indigo-400 border-b border-white/10 pb-2">Playlists</h4>
                                            <div className="space-y-4">
                                                {currentYtData.playlists.map((pl, idx) => (
                                                    <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-lg">
                                                        <h5 className="font-bold text-lg mb-1">{pl.title}</h5>
                                                        {pl.description && <p className="text-xs text-muted mb-3 line-clamp-2">{pl.description}</p>}
                                                        <div className="flex flex-col gap-2">
                                                            {pl.videos?.map((vTitle, vIdx) => (
                                                                <div key={vIdx} className="text-sm bg-black/40 px-3 py-2 rounded border border-white/5">
                                                                    <span className="text-muted mr-2">{vIdx + 1}.</span> {vTitle}
                                                                </div>
                                                            ))}
                                                            {(!pl.videos || pl.videos.length === 0) && (
                                                                <span className="text-xs text-muted">No videos in this playlist or unable to fetch.</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </main >
    );
}
