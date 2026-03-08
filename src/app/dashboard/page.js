"use client";

import { useAuth } from "@/lib/AuthContext";
import Dashboard from "@/components/Dashboard";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#030014]">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <main className="min-h-screen relative overflow-hidden flex flex-col items-center">
            {/* Background Ambience */}
            <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[70vw] h-[70vw] bg-purple-900/30 rounded-full blur-[120px] animate-blob"></div>
                <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-900/30 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
            </div>

            <Navbar />

            <Dashboard user={user} profile={profile} />
        </main>
    );
}
