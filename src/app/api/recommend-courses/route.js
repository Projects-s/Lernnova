import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const body = await req.json();

        const response = await fetch("http://127.0.0.1:8000/recommend-courses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || data.error || "Failed to recommend courses in Python Microservice");
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Recommend Courses Proxy Error:", error);
        return NextResponse.json({ error: error.message || "Failed to proxy request to Python server" }, { status: 500 });
    }
}
