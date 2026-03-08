import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const backendFormData = new FormData();
        backendFormData.append("file", file);

        const response = await fetch("http://127.0.0.1:8000/upload-doc", {
            method: "POST",
            body: backendFormData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || data.error || "Failed to process document in Python Microservice");
        }

        // Return the raw extracted text along with some metadata back to the client
        return NextResponse.json(data);

    } catch (error) {
        console.error("Document Upload Microservice proxy Error:", error);
        return NextResponse.json({ error: error.message || "Failed to proxy document to Python server" }, { status: 500 });
    }
}
