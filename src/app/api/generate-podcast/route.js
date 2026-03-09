import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { userId, roadmap, userProfile } = await req.json();

        if (!userId || !roadmap) {
            return NextResponse.json({ error: "Missing userId or roadmap" }, { status: 400 });
        }

        const response = await fetch("http://127.0.0.1:8000/generate-podcast", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId, roadmap, userProfile }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || data.error || "Failed to generate podcast in Python Microservice");
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Generate Podcast Proxy Error:", error);
        return NextResponse.json({ error: error.message || "Failed to proxy request to Python server" }, { status: 500 });
    }
}
