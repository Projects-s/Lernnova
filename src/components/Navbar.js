"use client";

import Link from "next/link";
import { Sparkles, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function Navbar() {
    const { user, login, logout, loading } = useAuth();

    return (
        <nav className="w-full max-w-7xl px-6 py-8 flex justify-between items-center z-50">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Sparkles className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white">Lernova</span>
            </div>
            <div className="hidden md:flex gap-8 items-center text-sm font-medium text-gray-300">
                <a href="#features" className="hover:text-white transition-colors">Features</a>
                <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
                <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            </div>
            <div className="flex gap-4 items-center">
                {loading ? (
                    <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse"></div>
                ) : user ? (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-sm text-gray-300 hidden sm:block">Hi, {user.displayName?.split(' ')[0]}</span>
                            {/* Show a mini badge if they have interests */}
                            {/* Accessing profile from context would need context update, assuming Navbar uses updated hook */}
                        </div>
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-full border border-white/20" />
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
                        <button
                            onClick={login}
                            className="text-sm font-semibold text-white px-4 py-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            Log In
                        </button>
                        <Link href="/analyze">
                            <button className="btn btn-primary text-sm py-2 px-6">Get Started</button>
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
