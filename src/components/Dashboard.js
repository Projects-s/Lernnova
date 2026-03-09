"use client";
import { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateRoadmap, generateCareerSuggestions } from "@/lib/gemini";
import { BookOpen, Trophy, Target, Star, Database, Youtube, Github, MessageCircle, FileText, Instagram, ArrowRight, Zap, Briefcase, UserCircle, RefreshCw, Loader2, Check, Award } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Dashboard({ user, profile }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null);
    // Initialize from DB if they exist, otherwise empty
    const [aiSuggestions, setAiSuggestions] = useState(profile?.aiSuggestions || []);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const [customGoal, setCustomGoal] = useState("");
    const router = useRouter();

    // Update local state if profile.aiSuggestions changes (e.g., from DB sync)
    useEffect(() => {
        if (profile?.aiSuggestions) {
            setAiSuggestions(profile.aiSuggestions);
        }
    }, [profile?.aiSuggestions]);

    const hasData = (profile?.youtube?.analysis || profile?.youtubeData) ||
        (profile?.github?.analysis || profile?.githubData) ||
        (profile?.reddit?.analysis || profile?.redditData) ||
        (profile?.document?.analysis || profile?.documentData) ||
        (profile?.instagram?.analysis || profile?.instagramData);

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

    const fetchSuggestions = async () => {
        if (!user) return;
        setIsFetchingSuggestions(true);
        try {
            const detailed = getDetailedProfile();
            const data = await generateCareerSuggestions(detailed);

            // Save to database
            await setDoc(doc(db, "users", user.uid), {
                aiSuggestions: data.suggestions || [],
                lastSuggestionsUpdate: new Date().toISOString()
            }, { merge: true });

            setAiSuggestions(data.suggestions || []);
        } catch (err) {
            console.error("Failed to fetch suggestions:", err);
        } finally {
            setIsFetchingSuggestions(false);
        }
    };

    const handleContinueJourney = async (historicRoadmap) => {
        if (!user) return;
        try {
            await setDoc(doc(db, "users", user.uid), {
                roadmap: historicRoadmap,
                lastRoadmapUpdate: new Date().toISOString()
            }, { merge: true });

            const slug = (historicRoadmap.careerGoal || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            router.push(`/learnings/${slug}`);
        } catch (err) {
            console.error("Failed to continue journey:", err);
        }
    };

    const handleSelectGoal = async (goal) => {
        if (!user || !goal) return;

        // If they click on a suggestion that already exists in their history, intelligently route them to resume it!
        const historicMatch = profile?.roadmapHistory?.find(r => r.careerGoal === goal);
        if (historicMatch) {
            handleContinueJourney(historicMatch);
            return;
        }

        router.push(`/setup?goal=${encodeURIComponent(goal)}`);
    };

    const handleCustomGoalSubmit = (e) => {
        e.preventDefault();
        if (customGoal.trim()) {
            handleSelectGoal(customGoal.trim());
        }
    };

    const calculateProgress = (roadmap) => {
        if (!roadmap || !roadmap.steps) return 0;
        const total = roadmap.steps.length;
        if (total === 0) return 0;

        // Find the index of the first 'current' or 'locked' step
        // If all are done (not really handled yet by the logic but good to have)
        // For now, let's say: (idx of current step) / total * 100
        const currentIndex = roadmap.steps.findIndex(s => s.status === 'current');
        if (currentIndex === -1) return 100; // All done or none current

        return Math.round((currentIndex / total) * 100);
    };

    return (
        <div className="min-h-screen p-8 pt-32 flex justify-center selection:bg-indigo-500/30">
            <div className="w-full max-w-5xl">
                {/* Profile Header */}
                <div className="glass-panel p-8 mb-8 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                    <div className="relative">
                        {(profile?.photoURL || user?.photoURL) ? (
                            <img
                                src={profile?.photoURL || user?.photoURL}
                                alt={profile?.displayName || user?.displayName}
                                className="w-40 h-40 rounded-full border-4 border-indigo-500/30 shadow-2xl relative z-10"
                            />
                        ) : (
                            <div className="w-40 h-40 rounded-full bg-indigo-600 flex items-center justify-center relative z-10 border-4 border-indigo-500/30">
                                <UserCircle className="w-20 h-20 text-white/50" />
                            </div>
                        )}
                        <div className="absolute -inset-2 bg-indigo-500/20 blur-2xl rounded-full -z-10 animate-pulse"></div>
                    </div>

                    <div className="text-center md:text-left flex-1 relative z-10">
                        <div className="mb-2 flex items-center justify-center md:justify-start gap-3">
                            <h1 className="text-5xl font-extrabold tracking-tighter text-white">{profile?.displayName || user?.displayName || 'Adventurer'}</h1>
                            {profile?.roadmap?.careerGoal && (
                                <span className="px-3 py-1 bg-indigo-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-indigo-300 border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]">
                                    Going to be a {profile.roadmap.careerGoal}
                                </span>
                            )}
                        </div>
                        <p className="text-lg text-muted mb-6 font-medium tracking-wide">{user?.email || profile?.email || "No email provided"}</p>
                        <div className="flex gap-4 justify-center md:justify-start">
                            <div className="px-4 py-1.5 bg-white/5 rounded-full text-xs font-bold text-gray-400 border border-white/5 uppercase tracking-tighter">
                                Account Verified
                            </div>
                            <div className="px-4 py-1.5 bg-indigo-500/10 rounded-full text-xs font-bold text-indigo-300 border border-indigo-500/20 uppercase tracking-tighter">
                                Level 1 Mastery
                            </div>
                        </div>
                    </div>
                </div>

                {/* Aggregate Data Preparation */}
                {(() => {
                    const configs = profile?.sourceConfigs || {};

                    const allInterests = Array.from(new Set([
                        ...(profile?.interests || []),
                        ...(configs.youtube !== false ? (profile?.youtube?.analysis?.interests || []) : []),
                        ...(configs.github !== false ? (profile?.github?.analysis?.interests || []) : []),
                        ...(configs.reddit !== false ? (profile?.reddit?.analysis?.interests || []) : []),
                        ...(configs.instagram !== false ? (profile?.instagram?.analysis?.interests || []) : []),
                        ...(configs.document !== false ? (profile?.document?.analysis?.interests || []) : [])
                    ]));

                    const allSkills = Array.from(new Set([
                        ...(profile?.skills || []),
                        ...(configs.youtube !== false ? (profile?.youtube?.analysis?.skills || []) : []),
                        ...(configs.github !== false ? (profile?.github?.analysis?.skills || []) : []),
                        ...(configs.reddit !== false ? (profile?.reddit?.analysis?.skills || []) : []),
                        ...(configs.instagram !== false ? (profile?.instagram?.analysis?.skills || []) : []),
                        ...(configs.document !== false ? (profile?.document?.analysis?.skills || []) : [])
                    ]));

                    const allStrengths = Array.from(new Set([
                        ...(profile?.strengths || []),
                        ...(configs.youtube !== false ? (profile?.youtube?.analysis?.personalityTraits || []) : []),
                        ...(configs.reddit !== false ? (profile?.reddit?.analysis?.personalityTraits || []) : []),
                        ...(configs.instagram !== false ? (profile?.instagram?.analysis?.personalityTraits || []) : [])
                    ]));

                    const allCareers = Array.from(new Set([
                        ...(profile?.careers || []),
                        ...(configs.github !== false ? (profile?.github?.analysis?.suggestedCareers || []) : []),
                        ...(configs.reddit !== false ? (profile?.reddit?.analysis?.suggestedCareers || []) : []),
                        ...(configs.instagram !== false ? (profile?.instagram?.analysis?.suggestedCareers || []) : []),
                        ...(configs.document !== false ? (profile?.document?.analysis?.suggestedCareers || []) : [])
                    ]));

                    return (
                        <>
                            {/* Core Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <MetricCard icon={<Star className="text-yellow-400" />} label="Interests" value={allInterests.length} color="yellow" />
                                <MetricCard icon={<Trophy className="text-purple-400" />} label="Skills" value={allSkills.length} color="purple" />
                                <MetricCard icon={<Zap className="text-indigo-400" />} label="Strengths" value={allStrengths.length} color="indigo" />
                                <MetricCard icon={<Briefcase className="text-emerald-400" />} label="Careers" value={allCareers.length} color="emerald" />
                            </div>

                            {/* Sources Card */}
                            <div className="glass-panel p-8 mb-8 border border-white/5">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                    <Database className="w-6 h-6 text-indigo-400" />
                                    Connected Intelligence Sources
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                                    <SourceButton platform="YouTube" icon={<Youtube />} connected={profile?.youtube?.analysis} color="red" />
                                    <SourceButton platform="GitHub" icon={<Github />} connected={profile?.github?.analysis} color="gray" />
                                    <SourceButton platform="Reddit" icon={<MessageCircle />} connected={profile?.reddit?.analysis} color="orange" />
                                    <SourceButton platform="Instagram" icon={<Instagram />} connected={profile?.instagram?.analysis} color="pink" />
                                    <SourceButton platform="Docs" icon={<FileText />} connected={profile?.document?.analysis} color="blue" />
                                </div>
                            </div>

                            {/* Intelligence Feed Section */}
                            <div className="mb-16 pb-16 relative">
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100vw] h-[3px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>
                                <h2 className="text-2xl font-black tracking-tighter text-white mb-8 uppercase flex items-center gap-3">
                                    <Database className="w-6 h-6 text-indigo-400" />
                                    Intelligence Feed
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {(profile?.youtube?.analysis && configs.youtube !== false) && (
                                        <IntelligenceSummaryCard
                                            platform="YouTube"
                                            icon={<Youtube className="text-red-500" />}
                                            summary={profile.youtube.analysis.learningStyle?.reasoning}
                                            tags={profile.youtube.analysis.interests?.slice(0, 3)}
                                            color="red"
                                        />
                                    )}
                                    {(profile?.github?.analysis && configs.github !== false) && (
                                        <IntelligenceSummaryCard
                                            platform="GitHub"
                                            icon={<Github className="text-gray-400" />}
                                            summary={profile.github.analysis.learningStyle?.reasoning}
                                            tags={profile.github.analysis.skills?.slice(0, 3)}
                                            color="gray"
                                        />
                                    )}
                                    {(profile?.reddit?.analysis && configs.reddit !== false) && (
                                        <IntelligenceSummaryCard
                                            platform="Reddit"
                                            icon={<MessageCircle className="text-orange-500" />}
                                            summary={`${profile.reddit.analysis.personalityTraits?.slice(0, 2).join(", ")} personality detected through niche communities.`}
                                            tags={profile.reddit.analysis.interests?.slice(0, 3)}
                                            color="orange"
                                        />
                                    )}
                                    {(profile?.instagram?.analysis && configs.instagram !== false) && (
                                        <IntelligenceSummaryCard
                                            platform="Instagram"
                                            icon={<Instagram className="text-pink-500" />}
                                            summary="Visual persona and aesthetic preferences analyzed from social signals."
                                            tags={profile.instagram.analysis.interests?.slice(0, 3)}
                                            color="pink"
                                        />
                                    )}
                                    {(profile?.document?.analysis && configs.document !== false) && (
                                        <IntelligenceSummaryCard
                                            platform="Career Document"
                                            icon={<FileText className="text-blue-500" />}
                                            summary={profile.document.analysis.learningStyle?.reasoning}
                                            tags={profile.document.analysis.skills?.slice(0, 3)}
                                            color="blue"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Deep Profile Inventory */}
                            {hasData && (
                                <div className="mb-16 pb-16 relative">
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100vw] h-[3px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>
                                    <h2 className="text-3xl font-black tracking-tighter text-white mb-10 uppercase flex items-center gap-3">
                                        <Star className="w-8 h-8 text-indigo-500" />
                                        Your Profile Inventory
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {allInterests.length > 0 && (
                                            <SectionCard
                                                icon={<Star className="w-5 h-5 text-yellow-500" />}
                                                title="Aggregated Interests"
                                                items={allInterests}
                                                color="yellow"
                                            />
                                        )}
                                        {allSkills.length > 0 && (
                                            <SectionCard
                                                icon={<Trophy className="w-5 h-5 text-purple-500" />}
                                                title="Aggregated Skills"
                                                items={allSkills}
                                                color="purple"
                                            />
                                        )}
                                        {allStrengths.length > 0 && (
                                            <SectionCard
                                                icon={<Zap className="w-5 h-5 text-indigo-400" />}
                                                title="Aggregated Strengths"
                                                items={allStrengths}
                                                color="indigo"
                                            />
                                        )}
                                        {allCareers.length > 0 && (
                                            <SectionCard
                                                icon={<Briefcase className="w-5 h-5 text-emerald-400" />}
                                                title="Aggregated Careers"
                                                items={allCareers}
                                                color="emerald"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}




                            {/* Learning History Section */}
                            {(() => {
                                const historyData = (profile?.roadmapHistory || []).filter(r => !r.achieved);
                                // If no official history exists yet but they have an active roadmap, mock it as history of 1
                                const displayHistory = historyData.length > 0 ? historyData : (profile?.roadmap && !profile.roadmap.achieved ? [{ ...profile.roadmap, id: 'legacy-id', createdAt: profile.lastRoadmapUpdate }] : []);

                                return (
                                    <div className="mb-16 pb-16 relative" id="learning-history">
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100vw] h-[3px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>
                                        <h2 className="text-2xl font-black tracking-tighter text-white mb-8 uppercase flex items-center gap-3">
                                            <span className="text-emerald-500 font-mono text-3xl">#</span>
                                            Your Learning History
                                        </h2>

                                        {displayHistory.length === 0 ? (
                                            <div className="glass-panel p-10 text-center flex flex-col items-center justify-center bg-white/5 border border-white/5 rounded-2xl">
                                                <BookOpen className="w-12 h-12 text-emerald-500/50 mb-4" />
                                                <h3 className="text-xl font-bold text-white mb-2 tracking-wide">No Journeys Started Yet</h3>
                                                <p className="text-gray-400 text-sm max-w-md mx-auto">Once you generate a roadmap and begin your career trajectory, your active and completed paths will be securely logged here for you to return to at any time.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {displayHistory.map((historyItem, idx) => {
                                                    const isCurrent = profile?.roadmap?.id && historyItem.id === profile.roadmap.id;
                                                    const progress = calculateProgress(historyItem);

                                                    // Format the date if it exists
                                                    const dateString = historyItem.createdAt
                                                        ? new Date(historyItem.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                                        : "Past Journey";

                                                    return (
                                                        <div key={idx} className={`glass-panel p-6 border transition-all ${isCurrent ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 hover:border-emerald-500/20'}`}>
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">{dateString}</div>
                                                                    <h3 className="font-bold text-xl text-white">{historyItem.careerGoal}</h3>
                                                                </div>
                                                                <div className={`p-2 rounded-xl flex items-center justify-center ${isCurrent ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                                                                    {isCurrent ? <Check className="w-5 h-5 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]" /> : <Target className="w-5 h-5 text-gray-400" />}
                                                                </div>
                                                            </div>

                                                            <div className="mb-6">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Journey Progress</span>
                                                                    <span className="text-[10px] font-black text-gray-400">{progress}% Complete</span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full bg-gradient-to-r transition-all duration-1000 ${isCurrent ? 'from-emerald-600 to-emerald-400' : 'from-gray-600 to-gray-400'}`}
                                                                        style={{ width: `${progress}%` }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => handleContinueJourney(historyItem)}
                                                                className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex justify-center items-center gap-2 ${isCurrent
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer group'
                                                                    : 'bg-white/5 hover:bg-emerald-600 hover:text-white border border-white/5 text-gray-300 group'
                                                                    }`}
                                                            >
                                                                {isCurrent ? (
                                                                    <>Resume Active Journey <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                                                ) : (
                                                                    <>Continue Learning <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Achievements / Hall of Fame Section */}
                            {profile?.achievements && profile.achievements.length > 0 && (
                                <div className="mb-16 pb-16 relative" id="achievements">
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100vw] h-[3px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent pointer-events-none"></div>
                                    <h2 className="text-2xl font-black tracking-tighter text-white mb-8 uppercase flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                            <Trophy className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        Hall of Fame
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {profile.achievements.map((achievement, idx) => {
                                            const dateString = achievement.achievedAt
                                                ? new Date(achievement.achievedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                                : "Mastered Pathway";

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => router.push(`/achievements/${achievement.slug || achievement.id}`)}
                                                    className="glass-panel p-6 border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all flex flex-col relative overflow-hidden group cursor-pointer"
                                                >
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full translate-x-1/2 -translate-y-1/2 blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>

                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <div className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest block mb-1">{dateString}</div>
                                                            <h3 className="font-black text-xl text-white group-hover:text-emerald-300 transition-colors">{achievement.careerGoal}</h3>
                                                        </div>
                                                        <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                                            <Award className="w-6 h-6 text-emerald-400" />
                                                        </div>
                                                    </div>

                                                    <div className="mt-auto">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Skills Gained</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(achievement.skills || []).slice(0, 5).map((skill, sIdx) => (
                                                                <span key={sIdx} className="px-3 py-1 bg-white/5 border border-white/10 text-emerald-300/80 rounded-lg text-[10px] font-semibold hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-colors">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                            {(achievement.skills || []).length > 5 && (
                                                                <span className="px-3 py-1 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-[10px] font-semibold">
                                                                    +{(achievement.skills || []).length - 5} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Suggested Goals Module */}
                            <div className="mb-16">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                                    <div>
                                        <h2 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase">Your Career Trajectories</h2>
                                        <p className="text-muted text-lg font-medium">Select a goal to generate a personalized learning path and track your progress.</p>
                                    </div>
                                    {hasData && (
                                        <button
                                            onClick={fetchSuggestions}
                                            disabled={isFetchingSuggestions}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group text-sm font-bold"
                                        >
                                            <RefreshCw className={`w-4 h-4 text-indigo-400 ${isFetchingSuggestions ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                                            Refresh Suggestions
                                        </button>
                                    )}
                                </div>

                                {!hasData ? (
                                    <div className="glass-panel p-16 text-center flex flex-col items-center gap-8 bg-indigo-500/5 border-dashed border-indigo-500/20 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                        <div className="p-6 bg-indigo-500/20 rounded-3xl relative z-10">
                                            <Database className="w-12 h-12 text-indigo-400" />
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-3xl font-black mb-4 text-white">Unlock Your AI Career Pulse</h3>
                                            <p className="text-muted max-w-xl mx-auto mb-10 text-lg leading-relaxed">To suggest accurate goals, we need to see your digital footprint. Connect at least one source (like YouTube or GitHub) and our AI will engineer your future.</p>
                                            <a href="/analyze" className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black transition-all inline-flex items-center gap-3 shadow-2xl shadow-indigo-600/20 group-hover:scale-105 active:scale-95 uppercase tracking-widest text-sm">
                                                Add Your First Source <ArrowRight className="w-6 h-6" />
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {isFetchingSuggestions ? (
                                            Array(2).fill(0).map((_, i) => (
                                                <div key={i} className="glass-panel p-10 h-64 animate-pulse bg-white/5" />
                                            ))
                                        ) : aiSuggestions.length > 0 ? (
                                            aiSuggestions.slice(0, 4).map((suggestion, idx) => {
                                                const historicMatch = profile?.roadmapHistory?.find(r => r.careerGoal === suggestion.title);
                                                const activeRoadmap = profile?.roadmap;
                                                // It is active/tracked if it is either in the history vault OR it is the current overarching active path.
                                                const matchingRoadmapStatus = historicMatch || (activeRoadmap?.careerGoal === suggestion.title ? activeRoadmap : null);

                                                const isTracked = !!matchingRoadmapStatus;
                                                const isSelecting = selectedGoal === suggestion.title && isGenerating;
                                                const progress = isTracked ? calculateProgress(matchingRoadmapStatus) : 0;

                                                const renderBoldText = (text) => {
                                                    if (!text) return text;
                                                    const parts = text.split(/(\*\*.*?\*\*)/g);
                                                    return parts.map((part, index) => {
                                                        if (part.startsWith('**') && part.endsWith('**')) {
                                                            return <span key={index} className="font-bold text-indigo-300 not-italic">{part.slice(2, -2)}</span>;
                                                        }
                                                        return part;
                                                    });
                                                };

                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleSelectGoal(suggestion.title)}
                                                        disabled={isGenerating}
                                                        className={`glass-panel p-8 text-left transition-all relative overflow-hidden group min-h-[280px] flex flex-col ${isTracked
                                                            ? 'border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)] cursor-pointer'
                                                            : isSelecting
                                                                ? 'border-indigo-500/50 bg-indigo-500/20'
                                                                : 'hover:border-indigo-500/30 hover:bg-white/5'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className={`p-3 rounded-2xl ${isTracked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                                                {isTracked ? <Check className="w-6 h-6 shadow-[0_0_15px_rgba(16,185,129,0.4)]" /> : <Briefcase className="w-6 h-6" />}
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{suggestion.difficulty}</span>
                                                                {isTracked && (
                                                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Current Pursuit</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <h3 className="text-2xl font-black mb-3 leading-tight group-hover:text-indigo-300 transition-colors">{suggestion.title}</h3>

                                                        <div className="mb-8 flex-1">
                                                            <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest block mb-2">The AI Rationale:</span>
                                                            <p className="text-sm text-gray-400 leading-relaxed italic">"{renderBoldText(suggestion.reason)}"</p>
                                                        </div>

                                                        {isTracked && (
                                                            <div className="mt-auto pt-6 border-t border-white/5">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Progression</span>
                                                                    <span className="text-[10px] font-black text-white">{progress}% Complete</span>
                                                                </div>
                                                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all duration-1000"
                                                                        style={{ width: `${progress}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {!isTracked && (
                                                            <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-400 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                                                {isSelecting ? (
                                                                    <><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Constructing Roadmap...</>
                                                                ) : (
                                                                    <>Begin Journey <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                                                )}
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="col-span-full text-center glass-panel p-16 bg-white/5 border border-white/10 flex flex-col items-center justify-center">
                                                <Database className="w-12 h-12 text-indigo-400 mb-6 opacity-80" />
                                                <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide">Ready for AI Architecting</h3>
                                                <p className="text-gray-400 max-w-lg mx-auto text-sm leading-relaxed mb-6 block">We have your profile data ready. Whenever you're ready, click "Refresh Suggestions" above to let the AI build your potential career trajectories based on your unique profile.</p>
                                                <button
                                                    onClick={fetchSuggestions}
                                                    disabled={isFetchingSuggestions}
                                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black transition-all shadow-xl shadow-indigo-600/20 active:scale-95 uppercase tracking-widest text-sm flex items-center gap-3"
                                                >
                                                    <span className="flex items-center justify-center bg-white/20 p-1.5 rounded-full"><Zap className="w-4 h-4 text-white" /></span>
                                                    Architect My Future
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Direct Goal Entry Section */}
                            <div className="mb-24">
                                <div className="glass-panel p-12 border border-white/10 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-all"></div>
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 group-hover:bg-purple-500/20 transition-all"></div>

                                    <div className="relative z-10 text-center max-w-2xl mx-auto">
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300 border border-indigo-500/30 mb-8">
                                            <Target className="w-3 h-3" />
                                            Define Your Own Path
                                        </div>
                                        <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Have a specific goal in mind?</h2>
                                        <p className="text-gray-400 mb-10 text-lg">Type any career ambition—from "Senior Rust Engineer" to "Astro-Physicist"—and our AI will engineer a specialized roadmap just for you.</p>

                                        <form onSubmit={handleCustomGoalSubmit} className="relative group/form">
                                            <input
                                                type="text"
                                                value={customGoal}
                                                onChange={(e) => setCustomGoal(e.target.value)}
                                                placeholder="e.g. Master Prompt Engineering for LLMs"
                                                className="w-full bg-white/5 border-2 border-white/10 rounded-3xl py-6 px-8 text-xl text-white placeholder:text-gray-600 focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all outline-none shadow-2xl group-hover/form:border-white/20"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!customGoal.trim()}
                                                className="absolute right-3 top-3 bottom-3 px-8 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 active:scale-95 shadow-xl shadow-indigo-600/20"
                                            >
                                                Architect Path
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>


                        </>
                    );
                })()}

            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, color }) {
    const colorMap = {
        yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
        purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
        indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
        emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    };
    return (
        <div className={`glass-panel p-5 flex flex-col items-center justify-center text-center border-b-4 ${colorMap[color]}`}>
            <div className="mb-2">{icon}</div>
            <div className="text-3xl font-black leading-none mb-1">{value}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest opacity-60">{label}</div>
        </div>
    );
}

function SectionCard({ icon, title, items, color, id }) {
    const colorMap = {
        yellow: "bg-yellow-500/5 text-yellow-300 border-yellow-500/20",
        purple: "bg-purple-500/5 text-purple-300 border-purple-500/20",
        indigo: "bg-indigo-500/5 text-indigo-300 border-indigo-500/20",
        emerald: "bg-emerald-500/5 text-emerald-300 border-emerald-500/20",
    };
    return (
        <div className="glass-panel p-6 hover:bg-white/[0.02] transition-colors h-full" id={id}>
            <h3 className="text-lg font-bold mb-5 flex items-center gap-3">
                {icon} {title}
            </h3>
            <div className="flex flex-wrap gap-2">
                {items.slice(0, 15).map((item, i) => (
                    <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${colorMap[color]}`}>
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}

function SourceButton({ platform, icon, connected, color }) {
    const colorMap = {
        red: "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20",
        gray: "bg-gray-500/10 border-gray-500/20 text-gray-300 hover:bg-gray-500/20",
        orange: "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20",
        pink: "bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20",
        blue: "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20",
    };
    return (
        <a href="/analyze" className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all group scale-100 hover:scale-105 ${connected ? colorMap[color] : 'bg-white/5 border-white/5 opacity-40 hover:opacity-100'}`}>
            <div className="group-hover:scale-110 transition-transform">{icon}</div>
            <span className="text-[10px] font-black uppercase tracking-widest">{platform}</span>
        </a>
    );
}

function IntelligenceSummaryCard({ platform, icon, summary, tags, color }) {
    const colorMap = {
        red: "border-red-500/20 bg-red-500/5 text-red-400",
        gray: "border-gray-500/20 bg-gray-500/5 text-gray-400",
        orange: "border-orange-500/20 bg-orange-500/5 text-orange-400",
        pink: "border-pink-500/20 bg-pink-500/5 text-pink-400",
        blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
    };

    return (
        <div className={`glass-panel p-6 border-l-4 transition-all hover:scale-[1.02] ${colorMap[color]}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
                <h4 className="font-bold text-white text-sm uppercase tracking-wider">{platform} Insight</h4>
            </div>
            <p className="text-xs text-muted mb-4 leading-relaxed italic line-clamp-3">"{summary}"</p>
            <div className="flex flex-wrap gap-1.5">
                {tags?.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white/5 rounded-md text-[9px] font-bold text-gray-400 border border-white/10 uppercase tracking-tighter">
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value }) {
    return (
        <div className="glass-panel p-6 flex items-center gap-4">
            <div className="p-3 bg-white/5 rounded-xl">
                {icon}
            </div>
            <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
            </div>
        </div>
    )
}
