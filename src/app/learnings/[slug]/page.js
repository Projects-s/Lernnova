"use client";

import { useState, useEffect, useRef, use } from "react";
import { Send, Bot, User, BookOpen, CheckSquare, Check, Plus, Menu, Loader2, Sparkles, MessageSquare, RefreshCw, Youtube, Code, FileText, ArrowLeft, Headphones, ExternalLink, Play, LayoutGrid, Compass, Trophy, Award, X } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { chatWithMentor, generateRoadmap, generateCareerSuggestions, recommendCourses, generatePodcast, checkPodcastStatus, generateVideo, checkVideoStatus, generateStepExplanation } from "@/lib/gemini";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function ChatPage({ params }) {
    const resolvedParams = use(params);
    const slug = resolvedParams?.slug;
    const router = useRouter();

    const { user, profile, loading: authLoading } = useAuth();
    const [messages, setMessages] = useState([
        {
            role: "bot",
            content: "Hello! I'm your Lernova Mentor. Let's conquer this specific roadmap together. If you get stuck on a specific micro-task, just ask me!"
        }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [activeTab, setActiveTab] = useState("text");
    const [showMentor, setShowMentor] = useState(false);
    const [coursePlatform, setCoursePlatform] = useState("Coursera");
    const [platformLoading, setPlatformLoading] = useState({}); // { 'Coursera': true, etc }
    const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [generatingStepText, setGeneratingStepText] = useState({}); // { 'stepIdx-taskIdx': true }
    const [showAchievementPopup, setShowAchievementPopup] = useState(false);
    const [checkStatusMsg, setCheckStatusMsg] = useState({ video: "", podcast: "" });
    const [focusedTaskKey, setFocusedTaskKey] = useState(null); // 'stepIdx-taskIdx' string for current viewing task

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

    const activeRoadmapRef = useRef(activeRoadmap);
    const profileRef = useRef(profile);

    useEffect(() => {
        activeRoadmapRef.current = activeRoadmap;
        profileRef.current = profile;
    }, [activeRoadmap, profile]);

    // Sync messages from roadmap history on load or roadmap change
    useEffect(() => {
        if (activeRoadmap?.mentorHistory && activeRoadmap.mentorHistory.length > 0) {
            setMessages(activeRoadmap.mentorHistory);
        } else {
            // Reset to default greeting if no history
            setMessages([
                {
                    role: "bot",
                    content: "Hello! I'm your Lernova Mentor. Let's conquer this specific roadmap together. If you get stuck on a specific micro-task, just ask me!"
                }
            ]);
        }
    }, [activeRoadmap?.id]);

    useEffect(() => {
        if (!user || (!activeRoadmap?.videoMeta && !activeRoadmap?.podcastMeta)) return;
        return () => { };
    }, []);

    // Set default tab based on user preferences
    useEffect(() => {
        if (activeRoadmap?.preferences?.format) {
            const format = activeRoadmap.preferences.format;
            if (format === "Visual & Interactive") setActiveTab("visual");
            else if (format === "Reading & Writing") setActiveTab("text");
            else if (format === "Auditory & Discussions") setActiveTab("podcast");
        }
    }, [activeRoadmap?.id]);

    const handleCheckVideoStatus = async () => {
        if (!activeRoadmap || !user) return;
        setIsGeneratingVideo(true);
        setCheckStatusMsg(prev => ({ ...prev, video: "Checking..." }));
        try {
            // First hit check to see if the file is already downloaded or metadata is failed
            let status = await checkVideoStatus(user.uid, activeRoadmap.id);

            // Re-trigger the generation if it's not started or died in processing.
            if (status.status === "processing" || status.status === "generating" || status.status === "not_started") {
                const compact = getCompactProfile();
                await generateVideo(user.uid, activeRoadmap, compact);

                // Wait briefly for server handover
                await new Promise(r => setTimeout(r, 1500));
                status = await checkVideoStatus(user.uid, activeRoadmap.id);
            }

            if (status.meta) await updateRoadmapWithVideo(status.videoUrl || null, status.meta);

            if (status.status === "ready") {
                setIsGeneratingVideo(false);
                setCheckStatusMsg(prev => ({ ...prev, video: "Video is ready!" }));
            } else if (status.status === "failed") {
                setIsGeneratingVideo(false);
                const msg = status.message || "";
                const isAuthError = msg.includes("AUTH_REQUIRED") || msg.includes("Authentication expired") || msg.includes("Redirected to");
                setCheckStatusMsg(prev => ({ ...prev, video: isAuthError ? "Authentication Expired." : "Failed: " + (msg || "Unknown error") }));
                if (!isAuthError) alert("Error generating video: " + msg);
            } else {
                setCheckStatusMsg(prev => ({ ...prev, video: status.message || "Still rendering..." }));
                setTimeout(() => setIsGeneratingVideo(false), 500);
            }
        } catch (err) {
            console.error("Manual check error:", err);
            const msg = err.message || "Check failed";
            const isAuthError = msg.includes("AUTH_REQUIRED") || msg.includes("Authentication expired") || msg.includes("Redirected to");
            await updateRoadmapWithVideo(null, { status: "failed", error: msg });
            setCheckStatusMsg(prev => ({ ...prev, video: isAuthError ? "Authentication Expired." : "Check failed." }));
            setIsGeneratingVideo(false);
        }
    };

    const handleCheckPodcastStatus = async () => {
        if (!activeRoadmap || !user) return;
        setIsGeneratingPodcast(true);
        setCheckStatusMsg(prev => ({ ...prev, podcast: "Checking..." }));
        try {
            // First hit check
            let status = await checkPodcastStatus(user.uid, activeRoadmap.id);

            // Re-trigger generation safely to ensure backend hasn't gone to sleep
            if (status.status === "processing" || status.status === "generating" || status.status === "not_started") {
                const compact = getCompactProfile();
                await generatePodcast(user.uid, activeRoadmap, compact);

                await new Promise(r => setTimeout(r, 1500));
                status = await checkPodcastStatus(user.uid, activeRoadmap.id);
            }

            if (status.meta) await updateRoadmapWithAudio(status.audioUrl || null, status.meta);

            if (status.status === "ready") {
                setIsGeneratingPodcast(false);
                setCheckStatusMsg(prev => ({ ...prev, podcast: "Podcast is ready!" }));
            } else if (status.status === "failed") {
                setIsGeneratingPodcast(false);
                const msg = status.message || "";
                const isAuthError = msg.includes("AUTH_REQUIRED") || msg.includes("Authentication expired") || msg.includes("Redirected to");
                setCheckStatusMsg(prev => ({ ...prev, podcast: isAuthError ? "Authentication Expired." : "Failed: " + (msg || "Unknown error") }));
                if (!isAuthError) alert("Error generating podcast: " + msg);
            } else {
                // Still processing on the backend
                setCheckStatusMsg(prev => ({ ...prev, podcast: status.message || "Still recording..." }));
                setTimeout(() => setIsGeneratingPodcast(false), 500);
            }
        } catch (err) {
            console.error("Manual check error:", err);
            const msg = err.message || "Check failed";
            const isAuthError = msg.includes("AUTH_REQUIRED") || msg.includes("Authentication expired") || msg.includes("Redirected to");
            await updateRoadmapWithAudio(null, { status: "failed", error: msg });
            setCheckStatusMsg(prev => ({ ...prev, podcast: isAuthError ? "Authentication Expired." : "Check failed." }));
            setIsGeneratingPodcast(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        const newUserMessages = [...messages, { role: "user", content: userMsg }];
        setInput("");
        setMessages(newUserMessages);
        setIsTyping(true);

        try {
            const compact = getCompactProfile();
            const response = await chatWithMentor({ ...compact, activeRoadmap }, messages, userMsg);

            const finalMessages = [...newUserMessages, { role: "bot", content: response.message }];
            setMessages(finalMessages);

            if (activeRoadmap) {
                const updatedRoadmap = {
                    ...activeRoadmap,
                    mentorHistory: finalMessages,
                    ...(response.suggestedRoadmapUpdate && { steps: response.suggestedRoadmapUpdate })
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
        const currentPlatform = coursePlatform;
        setPlatformLoading(prev => ({ ...prev, [currentPlatform]: true }));
        try {
            const compact = getCompactProfile();
            const recommended = await recommendCourses(compact, activeRoadmap.careerGoal, currentPlatform);

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
            alert("Failed to generate recommendations. Please ensure the backend is running and the API key is valid. Error: " + err.message);
        } finally {
            setPlatformLoading(prev => ({ ...prev, [currentPlatform]: false }));
        }
    };

    const handleGeneratePodcast = async () => {
        if (!activeRoadmap || !user) return;
        setIsGeneratingPodcast(true);
        try {
            const compact = getCompactProfile();
            const result = await generatePodcast(user.uid, activeRoadmap, compact);

            if (result.status === "ready") {
                await updateRoadmapWithAudio(result.audioUrl, result.meta);
                setIsGeneratingPodcast(false);
            } else {
                await updateRoadmapWithAudio(null, { status: "processing" });
                setTimeout(() => setIsGeneratingPodcast(false), 1000);
            }
        } catch (err) {
            console.error("Failed generating podcast", err);
            setIsGeneratingPodcast(false);
            const msg = err.message || "Unknown error";
            const isAuthError = msg.includes("AUTH_REQUIRED") || msg.includes("Authentication expired") || msg.includes("Redirected to");
            await updateRoadmapWithAudio(null, { status: "failed", error: msg });
            if (!isAuthError) alert("Error: " + msg);
        }
    };

    const handleGenerateVideo = async () => {
        if (!activeRoadmap || !user) return;
        setIsGeneratingVideo(true);
        try {
            const compact = getCompactProfile();
            const result = await generateVideo(user.uid, activeRoadmap, compact);

            if (result.status === "ready") {
                await updateRoadmapWithVideo(result.videoUrl, result.meta);
                setIsGeneratingVideo(false);
            } else {
                await updateRoadmapWithVideo(null, { status: "processing" });
                setTimeout(() => setIsGeneratingVideo(false), 1000);
            }
        } catch (err) {
            console.error("Failed generating video", err);
            setIsGeneratingVideo(false);
            const msg = err.message || "Unknown error";
            const isAuthError = msg.includes("AUTH_REQUIRED") || msg.includes("Authentication expired") || msg.includes("Redirected to");
            await updateRoadmapWithVideo(null, { status: "failed", error: msg });
            if (!isAuthError) alert("Error: " + msg);
        }
    };

    const updateRoadmapWithAudio = async (audioUrl, meta = null) => {
        const currentActive = activeRoadmapRef.current;
        const currentProfile = profileRef.current;
        if (!currentActive || !currentProfile) return;

        const updatedRoadmap = {
            ...currentActive,
            podcastUrl: audioUrl || null,
            podcastMeta: meta || currentActive.podcastMeta || null
        };

        const newHistory = [...(currentProfile.roadmapHistory || [])];
        const rIndex = newHistory.findIndex(r => r.id === currentActive.id);
        if (rIndex >= 0) newHistory[rIndex] = updatedRoadmap;
        else newHistory.push(updatedRoadmap);

        await setDoc(doc(db, "users", user.uid), {
            roadmapHistory: newHistory
        }, { merge: true });
    };

    const updateRoadmapWithVideo = async (videoUrl, meta = null) => {
        const currentActive = activeRoadmapRef.current;
        const currentProfile = profileRef.current;
        if (!currentActive || !currentProfile) return;

        const updatedRoadmap = {
            ...currentActive,
            videoUrl: videoUrl || null,
            videoMeta: meta || currentActive.videoMeta || null
        };

        const newHistory = [...(currentProfile.roadmapHistory || [])];
        const rIndex = newHistory.findIndex(r => r.id === currentActive.id);
        if (rIndex >= 0) newHistory[rIndex] = updatedRoadmap;
        else newHistory.push(updatedRoadmap);

        await setDoc(doc(db, "users", user.uid), {
            roadmapHistory: newHistory
        }, { merge: true });
    };

    const handleGenerateStepText = async (stepIdx, taskIdx) => {
        const step = activeRoadmap.steps[stepIdx];
        const task = step.tasks[taskIdx];
        const key = `${stepIdx}-${taskIdx}`;

        if (generatingStepText[key]) return;
        setGeneratingStepText(prev => ({ ...prev, [key]: true }));

        // Ensure it's the focused task
        setFocusedTaskKey(key);

        try {
            const compact = getCompactProfile();
            const explanation = await generateStepExplanation(compact, activeRoadmap.careerGoal, step.title, task.title);

            // Update roadmap with new explanation
            const updatedSteps = JSON.parse(JSON.stringify(activeRoadmap.steps));
            updatedSteps[stepIdx].tasks[taskIdx].deepExplanation = explanation;

            const updatedRoadmap = {
                ...activeRoadmap,
                steps: updatedSteps
            };

            const newHistory = [...(profile.roadmapHistory || [])];
            const rIndex = newHistory.findIndex(r => r.id === activeRoadmap.id);
            if (rIndex >= 0) newHistory[rIndex] = updatedRoadmap;

            await setDoc(doc(db, "users", user.uid), {
                roadmap: updatedRoadmap,
                roadmapHistory: newHistory
            }, { merge: true });

        } catch (err) {
            console.error("Failed to generate step explanation", err);
        } finally {
            setGeneratingStepText(prev => ({ ...prev, [key]: false }));
        }
    };

    const toggleSubHeadingRead = async (stepIdx, taskIdx, subIdx) => {
        const currentActive = activeRoadmapRef.current;
        if (!currentActive || !user) return;

        const updatedSteps = JSON.parse(JSON.stringify(currentActive.steps));
        const step = updatedSteps[stepIdx];
        const task = step.tasks[taskIdx];
        const sub = task.deepExplanation[subIdx];

        sub.read = !sub.read;

        // Mark task as completed if any section is read
        if (sub.read) {
            task.completed = true;
        } else {
            // Un-mark only if NO sections are read
            const anyRead = task.deepExplanation.some(s => s.read);
            if (!anyRead) task.completed = false;
        }

        // Handle Step advancement logic
        const allTasksCompleted = step.tasks.every(t => t.completed);
        if (allTasksCompleted) {
            step.status = 'completed';
            if (stepIdx + 1 < updatedSteps.length && updatedSteps[stepIdx + 1].status !== 'completed') {
                updatedSteps[stepIdx + 1].status = 'current';
            }
        } else {
            if (step.status === 'completed') {
                step.status = 'current';
                if (stepIdx + 1 < updatedSteps.length && updatedSteps[stepIdx + 1].status === 'current') {
                    updatedSteps[stepIdx + 1].status = 'pending';
                }
            }
        }

        const updatedRoadmap = {
            ...currentActive,
            steps: updatedSteps
        };

        const newHistory = [...(profileRef.current.roadmapHistory || [])];
        const rIndex = newHistory.findIndex(r => r.id === currentActive.id);
        if (rIndex >= 0) newHistory[rIndex] = updatedRoadmap;

        await setDoc(doc(db, "users", user.uid), {
            roadmap: updatedRoadmap,
            roadmapHistory: newHistory
        }, { merge: true });
    };

    const toggleTaskCompletion = async (stepIndex, taskIndex, isLocked) => {
        const currentActive = activeRoadmapRef.current;
        if (!currentActive || !user || isLocked) return;

        // Deep copy the roadmap steps
        const updatedSteps = JSON.parse(JSON.stringify(currentActive.steps));
        const step = updatedSteps[stepIndex];
        const task = step.tasks[taskIndex];

        // Toggle task
        task.completed = !task.completed;

        // If task is completed, ensure all sub-headings are marked as read
        if (task.completed && task.deepExplanation) {
            task.deepExplanation.forEach(s => s.read = true);
        } else if (!task.completed && task.deepExplanation) {
            // If they manually uncheck from sidebar, should we unread sections?
            task.deepExplanation.forEach(s => s.read = false);
        }

        // Check if all tasks in this step are completed
        const allTasksCompleted = step.tasks.every(t => t.completed);

        if (allTasksCompleted) {
            step.status = 'completed';
            if (stepIndex + 1 < updatedSteps.length && updatedSteps[stepIndex + 1].status !== 'completed') {
                updatedSteps[stepIndex + 1].status = 'current';
            }
        } else {
            if (step.status === 'completed') {
                step.status = 'current';
                if (stepIndex + 1 < updatedSteps.length && updatedSteps[stepIndex + 1].status === 'current') {
                    updatedSteps[stepIndex + 1].status = 'pending';
                }
            }
        }

        const updatedRoadmap = {
            ...currentActive,
            steps: updatedSteps
        };

        const newHistory = [...(profileRef.current.roadmapHistory || [])];
        const rIndex = newHistory.findIndex(r => r.id === currentActive.id);
        if (rIndex >= 0) newHistory[rIndex] = updatedRoadmap;

        // Check overall completion
        const isOverallComplete = updatedSteps.every(s => s.tasks && s.tasks.length > 0 && s.tasks.every(t => t.completed));
        if (isOverallComplete && !currentActive.achieved) {
            setShowAchievementPopup(true);
        }

        await setDoc(doc(db, "users", user.uid), {
            roadmap: updatedRoadmap || null,
            roadmapHistory: newHistory || [],
            lastRoadmapUpdate: new Date().toISOString()
        }, { merge: true });
    };

    const handleMarkAchieved = async () => {
        if (!activeRoadmap || !user) return;

        const updatedRoadmap = { ...activeRoadmap, achieved: true };

        const newHistory = [...(profile.roadmapHistory || [])];
        const rIndex = newHistory.findIndex(r => r.id === activeRoadmap.id);
        if (rIndex >= 0) newHistory[rIndex] = updatedRoadmap;

        const newAchievement = {
            id: activeRoadmap.id,
            slug: activeRoadmap.id, // Using ID as slug for unique routing
            careerGoal: activeRoadmap.careerGoal || "Unknown Goal",
            achievedAt: new Date().toISOString(),
            skills: (activeRoadmap.steps || []).map(s => s.title), // For the card tags
            steps: activeRoadmap.steps || [], // For the detail page
            courses: activeRoadmap.courses || {}
        };

        const newAchievements = [...(profile.achievements || []), newAchievement];

        await setDoc(doc(db, "users", user.uid), {
            roadmapHistory: newHistory || [],
            roadmap: (profile?.roadmap?.id === activeRoadmap.id ? null : profile.roadmap) || null,
            achievements: newAchievements || []
        }, { merge: true });

        setShowAchievementPopup(false);
        router.push(`/achievements/${newAchievement.slug || newAchievement.id}`);
    };

    const careerGoal = activeRoadmap?.careerGoal || "Loading your path...";

    // Dynamically compute statuses to enforce strict top-down linear progression 
    // overriding AI-generated string errors
    const currentRoadmap = (activeRoadmap?.steps || []).map((step, index, arr) => {
        let allPriorCompleted = true;
        for (let i = 0; i < index; i++) {
            if (!arr[i].tasks.every(t => t.completed)) {
                allPriorCompleted = false;
                break;
            }
        }

        const isCompleted = step.tasks && step.tasks.length > 0 && step.tasks.every(t => t.completed);

        let computedStatus = 'locked';
        if (isCompleted) {
            computedStatus = 'completed';
        } else if (allPriorCompleted) {
            computedStatus = 'current';
        }

        return { ...step, status: computedStatus };
    });

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
                                        {item.tasks.map((task, tIdx) => {
                                            const isLocked = item.status !== 'current' && item.status !== 'completed';
                                            return (
                                                <div key={task.id || tIdx} className={`bg-black/20 p-3 rounded-xl border transition-all flex items-start gap-3 ${task.completed ? 'border-emerald-500/20 bg-emerald-500/5' : isLocked ? 'border-white/5 opacity-50' : 'border-white/5 hover:border-indigo-500/30'}`}>
                                                    <button
                                                        onClick={(e) => {
                                                            toggleTaskCompletion(idx, tIdx, isLocked);
                                                        }}
                                                        disabled={isLocked}
                                                        className={`mt-0.5 shrink-0 transition-transform ${isLocked ? 'cursor-not-allowed opacity-50' : 'hover:scale-110 cursor-pointer'}`}
                                                    >
                                                        {task.completed ? (
                                                            <CheckSquare className="w-4 h-4 text-emerald-400 shadow-[0_0_100px_rgba(16,185,129,0.3)]" />
                                                        ) : (
                                                            <div className="w-4 h-4 rounded border border-white/20 hover:border-indigo-400 flex items-center justify-center bg-black/50 overflow-hidden">
                                                                {task.type === 'video' ? <Youtube className="w-2.5 h-2.5 text-red-400/50" /> :
                                                                    task.type === 'project' ? <Code className="w-2.5 h-2.5 text-purple-400/50" /> :
                                                                        task.type === 'audio' ? <Headphones className="w-2.5 h-2.5 text-yellow-400/50" /> :
                                                                            <FileText className="w-2.5 h-2.5 text-blue-400/50" />}
                                                            </div>
                                                        )}
                                                    </button>
                                                    <div
                                                        className="flex-1 cursor-pointer group/task"
                                                        onClick={() => {
                                                            if (isLocked) return;
                                                            const key = `${idx}-${tIdx}`;
                                                            setFocusedTaskKey(key);
                                                            setActiveTab('text');

                                                            // Trigger generation if not present
                                                            const taskData = item.tasks[tIdx];
                                                            if (!taskData.deepExplanation) {
                                                                handleGenerateStepText(idx, tIdx);
                                                            }

                                                            setTimeout(() => {
                                                                const el = document.getElementById(`focused-task-view`);
                                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                            }, 100);
                                                        }}
                                                    >
                                                        <h4 className={`text-xs font-medium leading-tight transition-all group-hover/task:text-indigo-400 ${task.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{task.title}</h4>
                                                        {task.resource && (
                                                            <p className={`text-[10px] font-mono mt-1 opacity-80 ${task.completed ? 'text-emerald-500/40' : 'text-indigo-300'}`}>{task.resource}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
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
                <div className="h-20 border-b border-white/10 flex items-center px-8 lg:px-10 bg-black/40 backdrop-blur-xl z-20">
                    <div className="flex-1 flex items-center">
                        <Link href={user ? "/dashboard" : "/"} className="lg:hidden p-2 mr-1 bg-white/5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center text-gray-300 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </div>

                    <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab("text")}
                            className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'text' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <FileText className="w-4 h-4" /> Text
                        </button>
                        <button
                            onClick={() => setActiveTab("visual")}
                            className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'visual' ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Play className="w-4 h-4" /> Visual
                        </button>
                        <button
                            onClick={() => setActiveTab("podcast")}
                            className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'podcast' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Headphones className="w-4 h-4" /> Podcast
                        </button>
                        <button
                            onClick={() => setActiveTab("courses")}
                            className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'courses' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Deep Diver
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-end gap-4">
                        <button
                            onClick={() => setShowMentor(!showMentor)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-bold ${showMentor ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                        >
                            <Bot className="w-4 h-4" /> {showMentor ? 'Hide Mentor' : 'Ask Mentor'}
                        </button>
                        <button className="lg:hidden p-2 text-white/50 hover:text-white"><Menu /></button>
                    </div>
                </div>

                {/* Main Shared Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Media Display Area */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth custom-scrollbar relative z-10">
                        <div className="max-w-6xl mx-auto">
                            {activeTab === 'text' ? (
                                <div className="py-6 max-w-4xl mx-auto space-y-16">
                                    <div className="mb-10">
                                        <h2 className="text-3xl font-black tracking-tighter mb-2 text-white uppercase italic flex items-center gap-3">
                                            <Sparkles className="w-6 h-6 text-indigo-400" />
                                            Strategic Learning Guide
                                        </h2>
                                        <p className="text-gray-400">Click any task in the sidebar to generate a live AI explanation. Complete sub-headings below to master each niche.</p>
                                    </div>

                                    <div className="max-w-4xl mx-auto">
                                        {!focusedTaskKey ? (
                                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/1">
                                                <div className="p-4 bg-indigo-500/10 rounded-full w-fit mx-auto mb-6">
                                                    <BookOpen className="w-8 h-8 text-indigo-400 opacity-50" />
                                                </div>
                                                <h3 className="text-white font-bold uppercase tracking-widest text-xs mb-2">Select a Task</h3>
                                                <p className="text-gray-500 text-sm max-w-xs mx-auto">Click any submodule from the sidebar to view its detailed technical guide here.</p>
                                            </div>
                                        ) : (() => {
                                            const [sIdx, tIdx] = focusedTaskKey.split('-').map(Number);
                                            const step = currentRoadmap[sIdx];
                                            const task = step?.tasks[tIdx];
                                            if (!task) return null;

                                            return (
                                                <div id="focused-task-view" className="animate-in fade-in slide-in-from-bottom-4 duration-500" key={focusedTaskKey}>
                                                    <div className="mb-10 text-center">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500/40 mb-4 block">{step.title}</span>
                                                        <h2 className="text-4xl font-black text-white mb-6 leading-tight">{task.title}</h2>
                                                        <div className="h-1 w-20 bg-indigo-600 mx-auto rounded-full"></div>
                                                    </div>

                                                    {!task.deepExplanation ? (
                                                        <div className="py-24 flex flex-col items-center justify-center text-center bg-white/[0.02] border border-white/5 rounded-[3rem]">
                                                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
                                                            <h4 className="text-white font-bold mb-2 uppercase tracking-widest text-xs">Synthesizing Guide</h4>
                                                            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">Our AI is drafting a deep technical breakdown for this module...</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-12">
                                                            <div className="space-y-12">
                                                                {task.deepExplanation.map((section, subIdx) => (
                                                                    <div key={subIdx} className="relative group/section border-l-2 border-white/5 pl-8 ml-3 py-2">
                                                                        <div className={`absolute -left-[1.1rem] top-2 w-5 h-5 rounded-full border-[3px] border-[#020202] flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 scale-110' : 'bg-white/10'}`}>
                                                                            {task.completed && <Check className="w-2.5 h-2.5 text-black font-black" />}
                                                                        </div>
                                                                        <div className="flex justify-between items-start mb-4">
                                                                            <h4 className="text-xl font-black text-white uppercase tracking-tight leading-tight max-w-2xl">
                                                                                {section.heading}
                                                                            </h4>
                                                                        </div>
                                                                        <div className="text-gray-400 text-base leading-relaxed space-y-4 mb-6 max-w-4xl">
                                                                            {section.content.split('\n\n').map((p, pIdx) => (
                                                                                <p key={pIdx}>{p}</p>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                <div className="mt-20 flex flex-col items-center justify-center border-t border-white/5 pt-12">
                                                                    <button
                                                                        onClick={() => toggleTaskCompletion(sIdx, tIdx, false)}
                                                                        className={`group flex items-center gap-3 px-10 py-5 rounded-full font-black uppercase tracking-[0.2em] text-[10px] transition-all ${task.completed ? 'bg-emerald-500 text-black shadow-[0_0_40px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
                                                                    >
                                                                        {task.completed ? <CheckSquare className="w-4 h-4" /> : <div className="w-4 h-4 rounded border border-white/20 group-hover:border-white/40 transition-colors"></div>}
                                                                        {task.completed ? 'Completed' : 'Mark as Read'}
                                                                    </button>
                                                                    {!task.completed && <p className="text-gray-600 text-[10px] mt-4 uppercase tracking-widest font-bold">Finish reading to update progress</p>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ) : activeTab === 'visual' ? (
                                <div className="text-center py-10">
                                    <div className="max-w-4xl w-full bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-12 text-center backdrop-blur-3xl shadow-[0_0_100px_rgba(236,72,153,0.1)] mx-auto">
                                        <div className="w-24 h-24 bg-pink-600/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(236,72,153,0.3)] animate-pulse">
                                            <Play className="w-12 h-12 text-pink-400" />
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">AI Visual Explainer</h2>
                                        {typeof activeRoadmap?.videoUrl === 'string' && activeRoadmap.videoUrl ? (
                                            <div className="space-y-10">
                                                <p className="text-gray-400 text-lg max-w-xl mx-auto italic">"Visualizing your journey to becoming a {careerGoal}."</p>
                                                <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black">
                                                    <video controls className="w-full h-full" src={activeRoadmap.videoUrl} autoPlay>Your browser does not support the video element.</video>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                <p className="text-gray-400 text-lg max-w-xl mx-auto">
                                                    {activeRoadmap?.videoMeta?.status === "processing" || activeRoadmap?.videoMeta?.status === "generating"
                                                        ? "Your personalized visual explainer is currently being generated on our servers."
                                                        : activeRoadmap?.videoMeta?.status === "failed"
                                                            ? (activeRoadmap?.videoMeta?.error?.includes("AUTH_REQUIRED")
                                                                ? "NotebookLM Session Expired. Please run 'notebooklm login' in your backend terminal."
                                                                : "Generation failed. Please retry or contact support.")
                                                            : "Unlock a cinematic visual overview of your journey."}
                                                </p>

                                                {activeRoadmap?.videoMeta?.status === "processing" || activeRoadmap?.videoMeta?.status === "generating" || activeRoadmap?.videoMeta?.status === "failed" ? (
                                                    <div className="space-y-4">
                                                        <button
                                                            onClick={activeRoadmap?.videoMeta?.status === 'failed' ? handleGenerateVideo : handleCheckVideoStatus}
                                                            disabled={isGeneratingVideo}
                                                            className={`px-10 py-5 bg-pink-600/20 text-pink-400 border border-pink-500/30 rounded-2xl font-black uppercase tracking-widest hover:bg-pink-600/30 transition-all flex items-center justify-center gap-4 mx-auto w-[300px] ${activeRoadmap?.videoMeta?.status === 'failed' ? 'border-red-500/50 text-red-400 hover:bg-red-500/10' : ''}`}
                                                        >
                                                            {isGeneratingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : activeRoadmap?.videoMeta?.status === 'failed' ? <RefreshCw className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                                                            {isGeneratingVideo ? (activeRoadmap?.videoMeta?.status === 'failed' ? "Retrying..." : "Checking...") : activeRoadmap?.videoMeta?.status === 'failed' ? "Retry Service" : "Check Status"}
                                                        </button>
                                                        {checkStatusMsg.video && (
                                                            <p className="text-pink-400/60 text-xs font-bold uppercase tracking-widest animate-pulse">{checkStatusMsg.video}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button onClick={handleGenerateVideo} disabled={isGeneratingVideo} className="px-10 py-5 bg-pink-600 hover:bg-pink-500 disabled:bg-pink-600/40 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-4 mx-auto shadow-xl shadow-pink-600/20">
                                                        {isGeneratingVideo ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                                                        {isGeneratingVideo ? "Starting..." : "Generate Visual Explainer"}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : activeTab === 'podcast' ? (
                                <div className="text-center py-10">
                                    <div className="max-w-4xl w-full bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-12 text-center backdrop-blur-3xl shadow-[0_0_100px_rgba(168,85,247,0.1)] mx-auto">
                                        <div className="w-24 h-24 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(168,85,247,0.3)] animate-pulse">
                                            <Headphones className="w-12 h-12 text-purple-400" />
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">AI Podcast Deep-Dive</h2>
                                        {typeof activeRoadmap?.podcastUrl === 'string' && activeRoadmap.podcastUrl ? (
                                            <div className="space-y-10">
                                                <p className="text-gray-400 text-lg max-w-xl mx-auto italic">"A deep-dive conversation exploring your strategic path."</p>
                                                <div className="relative p-8 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40 flex flex-col items-center gap-6">
                                                    <div className="flex gap-1 items-center h-12">
                                                        <div className="w-1 h-4 bg-purple-500 animate-pulse delay-75"></div>
                                                        <div className="w-1 h-8 bg-purple-400 animate-pulse delay-100"></div>
                                                        <div className="w-1 h-12 bg-purple-600 animate-pulse delay-150"></div>
                                                        <div className="w-1 h-6 bg-purple-500 animate-pulse delay-200"></div>
                                                        <div className="w-1 h-10 bg-purple-400 animate-pulse delay-300"></div>
                                                        <div className="w-1 h-5 bg-purple-600 animate-pulse delay-400"></div>
                                                        <div className="w-1 h-12 bg-purple-500 animate-pulse delay-500"></div>
                                                    </div>
                                                    <audio controls className="w-full h-12" src={activeRoadmap.podcastUrl} autoPlay>Your browser does not support the audio element.</audio>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                <p className="text-gray-400 text-lg max-w-xl mx-auto">
                                                    {activeRoadmap?.podcastMeta?.status === "processing" || activeRoadmap?.podcastMeta?.status === "generating"
                                                        ? "Your podcast deep-dive is currently being recorded on our servers."
                                                        : activeRoadmap?.podcastMeta?.status === "failed"
                                                            ? (activeRoadmap?.podcastMeta?.error?.includes("AUTH_REQUIRED")
                                                                ? "NotebookLM Session Expired. Please run 'notebooklm login' in your backend terminal."
                                                                : "Generation failed. Please retry or contact support.")
                                                            : "Unlock an AI-generated deep-dive podcast of your journey."}
                                                </p>

                                                {activeRoadmap?.podcastMeta?.status === "processing" || activeRoadmap?.podcastMeta?.status === "generating" || activeRoadmap?.podcastMeta?.status === "failed" ? (
                                                    <div className="space-y-4">
                                                        <button
                                                            onClick={activeRoadmap?.podcastMeta?.status === 'failed' ? handleGeneratePodcast : handleCheckPodcastStatus}
                                                            disabled={isGeneratingPodcast}
                                                            className={`px-10 py-5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-600/30 transition-all flex items-center justify-center gap-4 mx-auto w-[300px] ${activeRoadmap?.podcastMeta?.status === 'failed' ? 'border-red-500/50 text-red-400 hover:bg-red-500/10' : ''}`}
                                                        >
                                                            {isGeneratingPodcast ? <Loader2 className="w-5 h-5 animate-spin" /> : activeRoadmap?.podcastMeta?.status === 'failed' ? <RefreshCw className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                                                            {isGeneratingPodcast ? (activeRoadmap?.podcastMeta?.status === 'failed' ? "Retrying..." : "Checking...") : activeRoadmap?.podcastMeta?.status === 'failed' ? "Retry Service" : "Check Status"}
                                                        </button>
                                                        {checkStatusMsg.podcast && (
                                                            <p className="text-purple-400/60 text-xs font-bold uppercase tracking-widest animate-pulse">{checkStatusMsg.podcast}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button onClick={handleGeneratePodcast} disabled={isGeneratingPodcast} className="px-10 py-5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/40 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-4 mx-auto shadow-xl shadow-purple-600/20">
                                                        {isGeneratingPodcast ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                                                        {isGeneratingPodcast ? "Starting..." : "Generate Podcast Deep-Dive"}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            ) : (
                                <div className="py-6">
                                    <div className="mb-10">
                                        <h2 className="text-3xl font-black tracking-tighter mb-2 text-white uppercase">Curated Masterclasses</h2>
                                        <p className="text-gray-400 max-w-3xl">Choose a platform below and let Lernova AI find the highest-rated full-length courses specifically tailored for your goal.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 mb-8">
                                        {['YouTube Playlists', 'Coursera', 'Udemy'].map(platform => (
                                            <button key={platform} onClick={() => setCoursePlatform(platform)} className={`group relative px-6 py-3 rounded-xl font-bold transition-all border flex items-center gap-2 ${coursePlatform === platform ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}>
                                                {platform}
                                                {(platform === 'Coursera' || platform === 'Udemy') && (
                                                    <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-black uppercase tracking-tighter group-hover:bg-indigo-500/40 transition-colors">
                                                        BETA
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    {platformLoading[coursePlatform] ? (
                                        <div className="border border-white/10 bg-white/5 p-16 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
                                            <h3 className="text-xl font-bold text-white mb-2">Scanning {coursePlatform}...</h3>
                                            <p className="text-gray-500 text-sm max-w-sm">This can take up to 30 seconds as we search for verified, non-expired courses.</p>
                                        </div>
                                    ) : currentPlatformCourses.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {currentPlatformCourses.map((course, idx) => (
                                                <div key={idx} className="bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all rounded-[2rem] p-6 flex flex-col group">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="px-3 py-1 bg-indigo-500/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-300">{course.provider}</span>
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{course.modules} Modules</span>
                                                    </div>
                                                    <h3 className="text-xl font-black text-white leading-tight mb-2 group-hover:text-indigo-400">{course.title}</h3>
                                                    <p className="text-gray-400 text-sm mb-6 flex-1 line-clamp-3">{course.description}</p>
                                                    <a href={course.link} target="_blank" className="w-full py-3 bg-white/5 border border-white/10 hover:bg-indigo-600 hover:border-indigo-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2">Explore <ExternalLink className="w-3 h-3" /></a>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="border border-white/10 border-dashed bg-white/2 bg-black/40 p-16 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                                            <BookOpen className="w-16 h-16 text-indigo-400/20 mb-6" />
                                            <h3 className="text-xl font-bold text-white mb-6">No {coursePlatform} recommendations yet.</h3>
                                            <button onClick={handleGenerateCourses} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all">Generate Top 5</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Mentor Persistent Sidebar */}
                    {showMentor && (
                        <div className="w-[450px] border-l border-white/10 bg-[#020202] flex flex-col z-40 relative">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
                                <h3 className="font-bold uppercase tracking-[0.2em] text-xs flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                    AI Learning Mentor
                                </h3>
                                <button onClick={() => setShowMentor(false)} className="text-gray-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`p-5 rounded-2xl text-sm leading-relaxed max-w-[90%] shadow-xl transition-all ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'}`}>
                                            {msg.role === 'bot' ? (
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-3 space-y-1" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-3 space-y-1" {...props} />,
                                                        li: ({ node, ...props }) => <li className="mb-0" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="font-black text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.2)]" {...props} />,
                                                        code: ({ node, ...props }) => <code className="bg-white/10 px-1 rounded text-indigo-300 font-mono text-xs" {...props} />
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-2">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Mentor is Thinking...
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-6 border-t border-white/10 bg-black/20">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Type your question..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-600 group-hover:border-white/20"
                                    />
                                    <button
                                        onClick={handleSend}
                                        className="absolute right-2 top-2 p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-white"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Achievement Popup Overlay */}
            {
                showAchievementPopup && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-8 overflow-hidden">
                        <div className="bg-[#050505] border border-emerald-500/30 w-full max-w-lg max-h-full rounded-3xl p-6 md:p-8 relative shadow-[0_0_100px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col">
                            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 pointer-events-none"></div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>

                            <button onClick={() => setShowAchievementPopup(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-20">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="relative z-10 flex flex-col items-center text-center overflow-hidden flex-1">
                                <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                                    <Trophy className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
                                </div>

                                <h2 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tighter uppercase shrink-0">Journey Mastered!</h2>
                                <p className="text-gray-300 text-xs md:text-sm max-w-sm mb-6 leading-relaxed shrink-0">
                                    You have conquered all the steps required for "<span className="text-emerald-400 font-bold">{careerGoal}</span>". Are you ready to mark this skill set as achieved and add it to your hall of fame?
                                </p>

                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full mb-6 text-left flex-1 min-h-[100px] overflow-y-auto custom-scrollbar">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-md py-1 z-10">Skills & Milestones Gained</span>
                                    <div className="flex w-full flex-wrap gap-2">
                                        {activeRoadmap?.steps?.map((s, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold">{s.title}</span>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleMarkAchieved}
                                    className="w-full py-4 shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex justify-center items-center gap-2 active:scale-95"
                                >
                                    <Award className="w-5 h-5" /> Mark as Achieved
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
