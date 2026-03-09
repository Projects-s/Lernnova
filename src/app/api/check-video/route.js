import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const roadmapId = searchParams.get("roadmapId");

        if (!userId || !roadmapId) {
            return NextResponse.json({ error: "Missing userId or roadmapId" }, { status: 400 });
        }

        const response = await fetch(`http://127.0.0.1:8000/check-video?userId=${userId}&roadmapId=${roadmapId}`, {
            method: "GET",
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || data.error || "Failed to check video status");
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Check Video Proxy Error:", error);
        return NextResponse.json({ error: error.message || "Failed to proxy request to Python server" }, { status: 500 });
    }
}
