import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

export async function generateUserProfile(userId, youtubeData) {
    if (!youtubeData || !userId) {
        throw new Error("Missing required data for analysis");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        // 1. Prepare the Prompt
        const prompt = createAnalysisPrompt(youtubeData);

        // 2. Generate Content
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // 3. Parse JSON Result
        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(jsonStr);

        console.log("Gemini Analysis Result:", analysis);

        // 4. Save to Firestore
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            interests: analysis.interests || [],
            skills: analysis.skills || [],
            learningStyle: analysis.learningStyle || {},
            personalityTraits: analysis.personalityTraits || [],
            suggestedCareers: analysis.suggestedCareers || [],
            lastAnalyzed: new Date().toISOString()
        });

        return analysis;

    } catch (error) {
        console.error("Gemini Analysis Failed:", error);
        throw error;
    }
}

function createAnalysisPrompt(data) {
    // Extract relevant signals
    const likedVideos = data.likedVideos.map(v =>
        `- "${v.title}" (Category: ${v.categoryId}, Duration: ${v.duration})`
    ).slice(0, 50).join("\n");

    const subscriptions = data.subscriptions.map(s => s.title).join(", ");

    // Channel stats
    const channelStats = data.channelProfile ? `
    User is also a creator:
    - Channel Name: ${data.channelProfile.title}
    - Subscribers: ${data.channelProfile.subscriberCount}
    - Keywords: ${data.channelProfile.keywords}
    ` : "User is primarily a viewer.";

    return `
    You are an expert Career Counselor and Psychometric Analyst.
    Analyze the following YouTube digital footprint of a user to determine their implicit interests, hard/soft skills, and learning personality.

    ### USER DATA
    
    **Channel Profile:**
    ${channelStats}

    **Subscriptions:**
    ${subscriptions}

    **Recently Liked Videos:**
    ${likedVideos}

    ### INSTRUCTIONS
    Based on this content consumption, generate a profile JSON.
    1. **Interests**: High-level topics they are curious about (e.g., "AI", "History", "Cooking").
    2. **Skills**: inferred hard or soft skills (e.g., "Python", "Public Speaking", "Data Analysis").
    3. **Learning Style**: 
       - "format": "Visual" | "Auditory" | "Practical" (Infer from video types: lectures vs tutorials vs essays)
       - "depth": "Deep Diver" | "Broad Explorer" (Infer from video duration and topic variety)
    4. **Personality Traits**: 5 adjectives description (e.g., "Curious", "Analytical").
    5. **Suggested Careers**: 3 modern job titles that fit this mix.

    ### OUTPUT FORMAT (JSON ONLY)
    {
        "interests": ["Current Affairs", "Coding", ...],
        "skills": ["JavaScript", "Critical Thinking", ...],
        "learningStyle": {
            "format": "Visual",
            "depth": "Deep Diver",
            "reasoning": "User watches long-form video essays and coding tutorials."
        },
        "personalityTraits": ["Curious", ...],
        "suggestedCareers": ["Full Stack Developer", ...]
    }
    `;
}
