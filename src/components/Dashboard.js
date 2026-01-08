"use client";

import { BookOpen, Trophy, Target, Star } from "lucide-react";

export default function Dashboard({ user, profile }) {
    return (
        <div className="min-h-screen p-8 pt-32 flex justify-center">
            <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="glass-panel p-8 mb-8 flex flex-col md:flex-row items-center gap-8">
                    {user?.photoURL && (
                        <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-32 h-32 rounded-full border-4 border-indigo-500/30 shadow-2xl"
                        />
                    )}
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl font-bold mb-2">{user?.displayName || 'Welcome Back'}</h1>
                        <p className="text-muted mb-4">{user?.email}</p>
                        <div className="flex gap-3 justify-center md:justify-start">
                            <div className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono text-indigo-300 border border-indigo-500/20">
                                Member since {profile?.createdAt ? new Date(profile.createdAt.seconds * 1000).getFullYear() : '2025'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard icon={<Star className="text-yellow-400" />} label="Interests" value={profile?.interests?.length || 0} />
                    <StatCard icon={<Trophy className="text-purple-400" />} label="Skills" value={profile?.skills?.length || 0} />
                    <StatCard icon={<Target className="text-green-400" />} label="Goals Completed" value="0" />
                </div>

                {/* Action Card: Highlighted if no data */}
                <div className={`glass-panel p-8 mb-8 transition-all duration-300 relative overflow-hidden group 
                    ${!profile?.youtubeData ? 'border-2 border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.3)]' : 'hover:bg-white/5'}`}>

                    {!profile?.youtubeData && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg animate-pulse">
                            ACTION REQUIRED
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                <BookOpen className={`w-6 h-6 ${!profile?.youtubeData ? 'text-red-400' : 'text-indigo-400'}`} />
                                {profile?.youtubeData ? "Analysis Complete" : "Start Your Analysis"}
                            </h2>
                            <p className="text-muted max-w-lg">
                                {profile?.youtubeData
                                    ? "Your digital footprint has been analyzed. View your insights or re-sync for updates."
                                    : "Connect your YouTube account to uncover your hidden interests and generate a personalized learning roadmap."}
                            </p>
                        </div>
                        <a href="/analyze" className={`btn ${!profile?.youtubeData ? 'bg-red-600 hover:bg-red-700' : 'btn-primary'} px-8 py-3 whitespace-nowrap`}>
                            {profile?.youtubeData ? "View Insights" : "Connect YouTube"}
                        </a>
                    </div>
                </div>
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
