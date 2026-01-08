"use client";

import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/AuthContext";
import { Brain, Youtube, Play, Clock, BarChart } from "lucide-react";

export default function InsightsPage() {
    const { profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#030014]">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (!profile?.youtubeData) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen pt-32 flex flex-col items-center justify-center text-center px-4">
                    <h1 className="text-3xl font-bold mb-4">No Data Analyzed Yet</h1>
                    <p className="text-muted mb-8">Please connect your YouTube account first.</p>
                    <a href="/analyze" className="btn btn-primary">Go to Analysis</a>
                </div>
            </>
        )
    }

    const { youtubeData } = profile;
    const { likedVideos, channelProfile } = youtubeData;

    return (
        <main className="min-h-screen bg-[#030014] text-white">
            <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
            </div>

            <Navbar />

            <div className="container mx-auto px-4 pt-32 pb-20 max-w-6xl">
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-red-500/10 p-2 rounded-lg">
                            <Youtube className="w-6 h-6 text-red-500" />
                        </div>
                        <h1 className="text-3xl font-bold">YouTube Insights</h1>
                    </div>
                    <p className="text-muted">Raw data collected from your digital footprint.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* User Channel Stats */}
                    <div className="glass-panel p-6 col-span-1 md:col-span-3">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <BarChart className="w-5 h-5 text-indigo-400" />
                            Channel Statistics
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <StatBox label="Total Views" value={parseInt(channelProfile.viewCount).toLocaleString()} />
                            <StatBox label="Subscribers" value={parseInt(channelProfile.subscriberCount).toLocaleString()} />
                            <StatBox label="Videos" value={parseInt(channelProfile.videoCount).toLocaleString()} />
                            <StatBox label="Country" value={channelProfile.country || "Global"} />
                        </div>
                    </div>

                    {/* Liked Videos List */}
                    <div className="glass-panel p-6 col-span-1 md:col-span-3">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Play className="w-5 h-5 text-red-400" />
                            Recently Liked Content ({likedVideos.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {likedVideos.map((video, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <h3 className="font-medium line-clamp-2 text-sm">{video.title}</h3>
                                        <Youtube className="w-4 h-4 text-gray-500 shrink-0" />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted mb-2">
                                        <span>{video.channel}</span>
                                    </div>
                                    {video.topicCategories && video.topicCategories.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {video.topicCategories.slice(0, 2).map((topic, i) => (
                                                <span key={i} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-[10px] truncate max-w-[150px]">
                                                    {topic.split('/').pop().replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

function StatBox({ label, value }) {
    return (
        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="text-2xl font-bold mb-1">{value}</div>
            <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
        </div>
    )
}
