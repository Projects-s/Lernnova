"use client";

import { useAuth } from "@/lib/AuthContext";
import Dashboard from "@/components/Dashboard";

export default function ProfilePage() {
    const { user, profile, loading } = useAuth();

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
    if (!user) return <div className="min-h-screen flex items-center justify-center text-white">Please log in to view profile</div>;

    return <Dashboard user={user} profile={profile} />;
}
