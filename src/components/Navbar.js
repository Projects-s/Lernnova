"use client";

import Link from "next/link";
import { Sparkles, LogOut, User, Settings, Home } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function Navbar() {
    const { user, profile, login, logout, loading } = useAuth();

    return (
        <nav className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-50">
            <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Sparkles className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white">Lernova</span>
            </Link>
            <div className="hidden md:flex gap-8 items-center text-sm font-medium text-gray-300">
                {user && (
                    <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors p-2 hover:bg-white/10 rounded-full transition-all" title="Home">
                        <Home className="w-5 h-5" />
                    </Link>
                )}
                <a href="/#discovery" className="hover:text-white transition-colors">Profile Discovery</a>
                <a href="/#architect" className="hover:text-white transition-colors">Career Architect</a>
                <a href="/#mentor" className="hover:text-white transition-colors">AI Mentor</a>

                {user && (
                    <>
                        <Link href="/analyze" className="text-indigo-400 hover:text-indigo-300 transition-colors">Analyze</Link>
                        <Link href="/insights" className="text-indigo-400 hover:text-indigo-300 transition-colors">Insights</Link>
                        <Link href="/mentor" className="text-indigo-400 hover:text-indigo-300 transition-colors">Mentor</Link>
                        <Link href="/settings" className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white" title="Settings">
                            <Settings className="w-5 h-5" />
                        </Link>
                    </>
                )}
            </div>
            <div className="flex gap-4 items-center">
                {loading ? (
                    <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse"></div>
                ) : user ? (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-sm text-gray-300 hidden sm:block">Hi, {(profile?.displayName || user.displayName)?.split(' ')[0]}</span>
                        </div>
                        {(profile?.photoURL || user.photoURL) ? (
                            <img
                                src={profile?.photoURL || user.photoURL}
                                alt="Profile"
                                className="w-9 h-9 rounded-full border border-white/20 object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                                <User className="w-5 h-5" />
                            </div>
                        )}
                        <button
                            onClick={logout}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            title="Sign Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <>
                        <button onClick={login} className="btn btn-primary text-sm py-2 px-6">
                            Log In
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
