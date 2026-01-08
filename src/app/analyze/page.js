"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { fetchYouTubeData } from "@/lib/youtube";
import { generateUserProfile } from "@/lib/gemini"; // Import Gemini Service
import { Loader2, Youtube, CheckCircle, AlertCircle, Brain } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function AnalyzePage() {
    const { user } = useAuth();
    const [connecting, setConnecting] = useState(false);
    const [analyzing, setAnalyzing] = useState(false); // New state for AI processing
    const [ytData, setYtData] = useState(null);
    const [error, setError] = useState(null);

    const connectYouTube = async () => {
        setConnecting(true);
        setError(null);
        try {
            // We need to re-authenticate or get the token directly
            // Even if logged in, we trigger popup to ensure we get a fresh Access Token
            // with the `youtube.readonly` scope we added in firebase.js
            const result = await signInWithPopup(auth, googleProvider);
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
                await setDoc(doc(db, "users", currentUser.uid), {
                    youtubeData: data,
                    lastAnalyzed: new Date().toISOString()
                }, { merge: true });
                console.log(`Saved to Firestore for user: ${currentUser.uid}`);

                /* 
                // TRIGGER GEMINI ANALYSIS
                setAnalyzing(true);
                await generateUserProfile(currentUser.uid, data);
                setAnalyzing(false);
                console.log("Gemini Profile Generated!");
                */
            }

        } catch (err) {
            console.error(err);
            setError("Failed to connect YouTube: " + err.message);
        } finally {
            setConnecting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#030014] text-white">
            <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
            </div>

            <Navbar />

            <div className="container mx-auto px-4 pt-32 max-w-4xl">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Analyze Your <span className="text-gradient">Digital Footprint</span>
                    </h1>
                    <p className="text-muted text-lg max-w-2xl mx-auto">
                        Connect your social accounts to uncover your hidden interests and skills.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* YouTube Connector */}
                    <div className="glass-panel p-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                            <Youtube className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">YouTube Analysis</h2>
                        <p className="text-muted mb-6 text-sm">
                            We analyze your liked videos and subscriptions to identify your learning patterns and hobbies.
                        </p>

                        {!ytData ? (
                            <button
                                onClick={connectYouTube}
                                disabled={connecting}
                                className="btn bg-red-600 hover:bg-red-700 text-white w-full py-3 flex items-center justify-center gap-2"
                            >
                                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
                                {connecting ? "Connecting..." : "Connect YouTube"}
                            </button>
                        ) : (
                            <div className="w-full">
                                {analyzing ? (
                                    <div className="bg-purple-500/10 text-purple-400 p-4 rounded-lg flex items-center justify-center gap-3 mb-4 animate-pulse">
                                        <Brain className="w-5 h-5 animate-pulse" />
                                        <span>Sifting through your digital threads...</span>
                                    </div>
                                ) : (
                                    <div className="bg-green-500/10 text-green-400 p-3 rounded-lg flex items-center justify-center gap-2 mb-4">
                                        <CheckCircle className="w-4 h-4" />
                                        Analysis Complete & Profile Created
                                    </div>
                                )}

                                <div className="text-left text-sm text-gray-400 bg-black/40 p-4 rounded-lg overflow-hidden">
                                    <p>Found <strong>{ytData.likedVideos.length}</strong> liked videos</p>
                                    <p>Found <strong>{ytData.subscriptions.length}</strong> subscriptions</p>
                                    <p>Found <strong>{ytData.playlists.length}</strong> playlists</p>
                                    <p>Channel Bio: <strong>{ytData.channelProfile ? "Found" : "Not Found"}</strong></p>
                                    <details className="mt-2 cursor-pointer">
                                        <summary>View Debug Data</summary>
                                        <pre className="mt-2 text-xs overflow-auto max-h-32">
                                            {JSON.stringify(ytData, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                                <a href="/insights" className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2">
                                    <Brain className="w-4 h-4" />
                                    View Insights
                                </a>
                            </div>
                        )}
                        {error && (
                            <div className="mt-4 text-red-400 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Placeholder for LinkedIn/Resume */}
                    <div className="glass-panel p-8 flex flex-col items-center text-center opacity-50">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                            {/* FileText icon */}
                            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Resume / CV</h2>
                        <p className="text-muted mb-6 text-sm">
                            Upload your professional CV to map your existing hard skills and experience.
                        </p>
                        <button disabled className="btn btn-secondary w-full py-3 cursor-not-allowed">
                            Coming Soon
                        </button>
                    </div>
                </div>
            </div>
        </main>
    )
}
