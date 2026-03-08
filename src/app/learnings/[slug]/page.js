"use client";

import { useState, useEffect, useRef, use } from "react";
import { Send, Bot, User, BookOpen, CheckSquare, Check, Plus, Menu, Loader2, Sparkles, MessageSquare, RefreshCw, Youtube, Code, FileText, ArrowLeft, Headphones, ExternalLink, Play, LayoutGrid, Compass } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { chatWithMentor, generateRoadmap, generateCareerSuggestions, recommendCourses } from "@/lib/gemini";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function ChatPage({ params }) {
    const resolvedParams = use(params);
    const slug = resolvedParams?.slug;

    const { user, profile, loading: authLoading } = useAuth();
    const [messages, setMessages] = useState([
        {
            role: "bot",
            content: "Hello! I'm your Lernova Mentor. Let's conquer this specific roadmap together. If you get stuck on a specific micro-task, just ask me!"
        }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [activeTab, setActiveTab] = useState("mentor");
    const [coursePlatform, setCoursePlatform] = useState("Coursera");
    const [isGeneratingCourses, setIsGeneratingCourses] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Cleanup profile to only send relevant info to Gemini to save tokens & context
    const getCompactProfile = () => {
        if (!profile) return null;
        const configs = profile.sourceConfigs || {};

        return {
            youtube: configs.youtube !== false ? profile.youtube?.analysis : null,
            github: configs.github !== false ? profile.github?.analysis : null,
            reddit: configs.reddit !== false ? profile.reddit?.analysis : null,
            instagram: configs.instagram !== false ? profile.instagram?.analysis : null,
            document: configs.document !== false ? profile.document?.analysis : null,
            interests: profile.interests,
            skills: profile.skills
        };
    };

    // Find the specific roadmap matching the slug, fallback to profile.roadmap
    const activeRoadmap = profile?.roadmapHistory?.find(r =>
        (r.careerGoal || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === slug
    ) || profile?.roadmap;

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setIsTyping(true);

        try {
            const compact = getCompactProfile();
            const response = await chatWithMentor(compact, messages, userMsg);

            setMessages(prev => [...prev, { role: "bot", content: response.message }]);

            if (response.suggestedRoadmapUpdate && activeRoadmap) {
                const updatedRoadmap = {
                    ...activeRoadmap,
                    steps: response.suggestedRoadmapUpdate
                };

                // Create a new roadmapHistory array replacing the matched item
                const newHistory = [...(profile.roadmapHistory || [])];
                const rIndex = newHistory.findIndex(r => r.id === activeRoadmap.id);
                if (rIndex >= 0) {
                    newHistory[rIndex] = updatedRoadmap;
                } else {
                    newHistory.push(updatedRoadmap);
                }

                await setDoc(doc(db, "users", user.uid), {
                    roadmap: updatedRoadmap, // Update as current active
                    roadmapHistory: newHistory, // Save progress logic to history array
                    lastRoadmapUpdate: new Date().toISOString()
                }, { merge: true });
            }
        } catch (err) {
            console.error("Chat error:", err);
            setMessages(prev => [...prev, { role: "bot", content: "Sorry, I'm having trouble connecting to my brain right now. Please try again." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleGenerateCourses = async () => {
        if (!activeRoadmap || !user) return;
        setIsGeneratingCourses(true);
        try {
            const compact = getCompactProfile();
            const recommended = await recommendCourses(compact, activeRoadmap.careerGoal, coursePlatform);

            const updatedRoadmap = {
                ...activeRoadmap,
                courses: {
                    ...(activeRoadmap.courses || {}),
                    [coursePlatform]: recommended
                }
            };

            const newHistory = [...(profile.roadmapHistory || [])];
            const rIndex = newHistory.findIndex(r => r.id === activeRoadmap.id);
            if (rIndex >= 0) newHistory[rIndex] = updatedRoadmap;
            else newHistory.push(updatedRoadmap);

            await setDoc(doc(db, "users", user.uid), {
                roadmap: updatedRoadmap, // Optional: keep active roadmap in sync
                roadmapHistory: newHistory
            }, { merge: true });

        } catch (err) {
            console.error("Failed generating courses", err);
        } finally {
            setIsGeneratingCourses(false);
        }
    };

    const currentRoadmap = activeRoadmap?.steps || [];
    const careerGoal = activeRoadmap?.careerGoal || "Loading your path...";

    // Safely get the courses for the currently selected platform
    const currentPlatformCourses = activeRoadmap?.courses?.[coursePlatform] || [];

    if (authLoading) return (
        <div className="h-screen bg-black flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-black text-white selection:bg-indigo-500/30 font-sans">

            {/* Sidebar / Roadmap Panel */}
            <div className="w-96 border-r border-white/10 hidden lg:flex flex-col bg-[#050505] backdrop-blur-3xl relative z-30">
                <div className="p-8 border-b border-white/10 bg-gradient-to-b from-indigo-500/5 to-transparent">
                    <Link href={user ? "/dashboard" : "/"} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> {user ? "Back to Dashboard" : "Back to Home"}
                    </Link>
                    <h2 className="font-bold text-xl flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <BookOpen className="text-indigo-400 w-5 h-5" />
                        </div>
                        Learning Roadmap
                    </h2>
                    <div className="flex items-center gap-2 text-indigo-300/80">
                        <Sparkles className="w-3 h-3" />
                        <p className="text-xs font-semibold tracking-wide uppercase italic">{careerGoal}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {currentRoadmap.length > 0 ? (
                        currentRoadmap.map((item, idx) => (
                            <div key={item.id} className={`p-5 rounded-2xl border transition-all duration-300 group ${item.status === 'current' ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : item.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5 opacity-60 hover:opacity-100'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-mono uppercase tracking-widest leading-none ${item.status === 'completed' ? 'text-emerald-500/60' : 'text-muted'}`}>Step 0{idx + 1}</span>
                                    {item.status === 'current' ? (
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                        </span>
                                    ) : item.status === 'completed' ? (
                                        <Check className="w-4 h-4 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                    ) : (
                                        <CheckSquare className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40" />
                                    )}
                                </div>
                                <h3 className="font-semibold text-base leading-tight mb-1">{item.title}</h3>

                                {item.tasks && item.tasks.length > 0 && (
                                    <div className="space-y-2 mt-4 border-t border-white/10 pt-4">
                                        {item.tasks.map((task, tIdx) => (
                                            <div key={task.id || tIdx} className="bg-black/20 p-3 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all flex items-start gap-3">
                                                <div className="mt-0.5 shrink-0">
                                                    {task.type === 'video' ? <Youtube className="w-3.5 h-3.5 text-red-400" /> :
                                                        task.type === 'project' ? <Code className="w-3.5 h-3.5 text-purple-400" /> :
                                                            task.type === 'audio' ? <Headphones className="w-3.5 h-3.5 text-yellow-400" /> :
                                                                <FileText className="w-3.5 h-3.5 text-blue-400" />}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-medium text-gray-300 leading-tight">{task.title}</h4>
                                                    {task.resource && (
                                                        <p className="text-[10px] font-mono text-indigo-300 mt-1 opacity-80">{task.resource}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 gap-4 text-center px-4">
                            <p className="text-sm text-muted">Generate a brand new learning path from the Dashboard.</p>
                            <Link href={user ? "/dashboard" : "/"}>
                                <button className="text-xs px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30 transition-colors">
                                    {user ? "Return to Dashboard" : "Return to Home"}
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative bg-[#020202]">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

                {/* Header with Tabs */}
                <div className="h-20 border-b border-white/10 flex items-center px-8 lg:px-10 bg-black/40 backdrop-blur-xl z-20 justify-between">
                    <div className="flex items-center gap-6">
                        <Link href={user ? "/dashboard" : "/"} className="lg:hidden p-2 mr-1 bg-white/5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center text-gray-300 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>

                        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab("mentor")}
                                className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'mentor' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Bot className="w-4 h-4" /> AI Mentor
                            </button>
                            <button
                                onClick={() => setActiveTab("courses")}
                                className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'courses' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <LayoutGrid className="w-4 h-4" /> Deep Dive Courses
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {activeTab === 'mentor' && (
                            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-xs transition-all">
                                <MessageSquare className="w-3 h-3 text-muted" /> New Session
                            </button>
                        )}
                        <button className="lg:hidden p-2 text-white/50 hover:text-white"><Menu /></button>
                    </div>
                </div>

                {/* Content Area */}
                {activeTab === 'mentor' ? (
                    <>
                        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scroll-smooth custom-scrollbar relative z-10">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-4 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border ${msg.role === 'user' ? 'bg-indigo-600 border-indigo-400/30' : 'bg-white/5 border-white/10'}`}>
                                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                        </div>
                                        <div className={`p-5 rounded-2xl shadow-2xl relative ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                                            : 'bg-white/10 backdrop-blur-md border border-white/10 text-gray-100 rounded-tl-sm'
                                            }`}>
                                            <p className="leading-relaxed text-sm md:text-base whitespace-pre-wrap">{msg.content}</p>

                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="flex gap-4 max-w-[80%] items-center text-muted italic text-sm ml-12">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Thinking...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 md:p-8 bg-gradient-to-t from-black via-black/90 to-transparent relative z-20">
                            <div className="relative max-w-4xl mx-auto flex gap-3 items-center">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        disabled={isTyping}
                                        placeholder="Ask about your skills, next steps, or learning path..."
                                        className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl pl-6 pr-14 py-4 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-white placeholder:text-gray-500 shadow-2xl text-sm disabled:opacity-50"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={isTyping || !input.trim()}
                                        className="absolute right-2 top-2 p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-muted rounded-xl text-white transition-all shadow-lg shadow-indigo-600/20"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-center text-[10px] text-muted/60 mt-4 tracking-wider uppercase font-medium">Lernova Mentor AI can make mistakes. Built with Gemini 2.5 Flash.</p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth custom-scrollbar relative z-10">
                        <div className="max-w-5xl mx-auto">
                            <div className="mb-8">
                                <h2 className="text-3xl font-black tracking-tighter mb-2 text-white">Curated Deep Dives</h2>
                                <p className="text-gray-400">If the micro-roadmap isn't enough, choose a platform below and let Lernova AI hunt the internet to find the top 5 full-length, highest-rated masterclasses specifically tailored for '{careerGoal}'.</p>
                            </div>

                            <div className="flex flex-wrap gap-3 mb-8">
                                {['Coursera', 'Udemy', 'YouTube Playlists'].map(platform => (
                                    <button
                                        key={platform}
                                        onClick={() => setCoursePlatform(platform)}
                                        className={`px-6 py-3 rounded-xl font-bold transition-all border ${coursePlatform === platform ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] text-white' : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400'}`}
                                    >
                                        {platform}
                                    </button>
                                ))}
                            </div>

                            {isGeneratingCourses ? (
                                <div className="border border-white/10 bg-black/40 p-16 rounded-3xl flex flex-col items-center justify-center text-center">
                                    <div className="relative mb-6">
                                        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                        <Compass className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Deep Scanning {coursePlatform}...</h3>
                                    <p className="text-gray-400 max-w-sm">Our AI is analyzing thousands of syllabuses and reviews to find the definitive 5 {coursePlatform} masterclasses mapping perfectly into your profile.</p>
                                </div>
                            ) : currentPlatformCourses && currentPlatformCourses.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {currentPlatformCourses.map((course, idx) => (
                                        <div key={idx} className="bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all rounded-3xl p-6 group flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-300">
                                                    {course.provider}
                                                </div>
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                    ~{course.modules} Modules
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-black text-white leading-tight mb-2 group-hover:text-indigo-400 transition-colors">{course.title}</h3>
                                            <p className="text-xs text-indigo-400/80 font-bold mb-4 flex items-center gap-2"><User className="w-3 h-3" /> {course.instructor}</p>

                                            <p className="text-sm text-gray-400 leading-relaxed mb-8 flex-1">
                                                {course.description}
                                            </p>

                                            <a href={course.link} target="_blank" rel="noopener noreferrer" className="mt-auto w-full py-3 bg-white/5 hover:bg-indigo-600 border border-white/10 hover:border-indigo-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group/btn">
                                                Explore Course <ExternalLink className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="border border-white/10 bg-black/40 p-16 rounded-3xl flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                                        <BookOpen className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">No {coursePlatform} Sources Yet</h3>
                                    <p className="text-gray-400 text-sm max-w-lg mb-8">We haven't compiled a list of {coursePlatform} masterclasses tailored for your specific goal of '{careerGoal}' yet.</p>

                                    <button
                                        onClick={handleGenerateCourses}
                                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-3"
                                    >
                                        <Sparkles className="w-5 h-5" /> Let AI Generate Top 5
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
