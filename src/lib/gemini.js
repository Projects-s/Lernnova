import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Helper to call internal Python unified AI endpoints safely
async function callPythonBackend(endpoint, body) {
    try {
        const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || data.error || `Failed to analyze via Backend at ${endpoint}`);
        }
        return data;
    } catch (error) {
        console.error(`Backend call failed for ${endpoint}:`, error);
        throw new Error(`Failed to communicate with the Python backend AI model. ` + error.message);
    }
}

export async function analyzeYouTubeData(userId, ytData) {
    if (!ytData || !userId) throw new Error("Missing required YouTube data");

    const analysis = await callPythonBackend("/analyze/youtube", { data: ytData });

    // Fetch current profile to merge top-level skills/interests
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    const currentData = docSnap.exists() ? docSnap.data() : {};

    const mergedInterests = Array.from(new Set([...(currentData.interests || []), ...(analysis.interests || [])]));
    const mergedSkills = Array.from(new Set([...(currentData.skills || []), ...(analysis.skills || [])]));
    const mergedStrengths = Array.from(new Set([...(currentData.strengths || []), ...(analysis.personalityTraits || [])]));
    const mergedCareers = Array.from(new Set([...(currentData.careers || []), ...(analysis.suggestedCareers || [])]));

    await setDoc(userRef, {
        interests: mergedInterests,
        skills: mergedSkills,
        strengths: mergedStrengths,
        careers: mergedCareers,
        youtube: {
            analysis: analysis,
            lastAnalyzed: new Date().toISOString()
        }
    }, { merge: true });
    return analysis;
}

export async function analyzeGitHubData(userId, ghData) {
    if (!ghData || !userId) throw new Error("Missing required GitHub data");

    const analysis = await callPythonBackend("/analyze/github", { data: ghData });

    // Fetch current profile to merge top-level skills/interests
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    const currentData = docSnap.exists() ? docSnap.data() : {};

    const mergedInterests = Array.from(new Set([...(currentData.interests || []), ...(analysis.interests || [])]));
    const mergedSkills = Array.from(new Set([...(currentData.skills || []), ...(analysis.skills || [])]));
    const mergedCareers = Array.from(new Set([...(currentData.careers || []), ...(analysis.suggestedCareers || [])]));

    await setDoc(userRef, {
        interests: mergedInterests,
        skills: mergedSkills,
        careers: mergedCareers,
        github: {
            analysis: analysis,
            lastAnalyzed: new Date().toISOString()
        }
    }, { merge: true });
    return analysis;
}

export async function analyzeRedditData(userId, rdData) {
    if (!rdData || !userId) throw new Error("Missing required Reddit data");

    const analysis = await callPythonBackend("/analyze/reddit", { data: rdData });

    // Fetch current profile to merge top-level skills/interests
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    const currentData = docSnap.exists() ? docSnap.data() : {};

    const mergedInterests = Array.from(new Set([...(currentData.interests || []), ...(analysis.interests || [])]));
    const mergedSkills = Array.from(new Set([...(currentData.skills || []), ...(analysis.skills || [])]));
    const mergedStrengths = Array.from(new Set([...(currentData.strengths || []), ...(analysis.personalityTraits || [])]));
    const mergedCareers = Array.from(new Set([...(currentData.careers || []), ...(analysis.suggestedCareers || [])]));

    await setDoc(userRef, {
        interests: mergedInterests,
        skills: mergedSkills,
        strengths: mergedStrengths,
        careers: mergedCareers,
        reddit: {
            analysis: analysis,
            lastAnalyzed: new Date().toISOString()
        }
    }, { merge: true });
    return analysis;
}

export async function analyzeDocumentData(userId, docData) {
    if (!docData || !userId) throw new Error("Missing required Document data");

    const analysis = await callPythonBackend("/analyze/document", { data: docData });

    // Fetch current profile to merge top-level skills/interests
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    const currentData = docSnap.exists() ? docSnap.data() : {};

    const mergedInterests = Array.from(new Set([...(currentData.interests || []), ...(analysis.interests || [])]));
    const mergedSkills = Array.from(new Set([...(currentData.skills || []), ...(analysis.skills || [])]));
    const mergedCareers = Array.from(new Set([...(currentData.careers || []), ...(analysis.suggestedCareers || [])]));

    await setDoc(userRef, {
        interests: mergedInterests,
        skills: mergedSkills,
        careers: mergedCareers,
        document: {
            analysis: analysis,
            lastAnalyzed: new Date().toISOString()
        }
    }, { merge: true });

    return analysis;
}

export async function analyzeInstagramData(userId, igData) {
    if (!igData || !userId) throw new Error("Missing required Instagram data");

    const analysis = await callPythonBackend("/analyze/instagram", { data: igData });

    // Fetch current profile to merge top-level skills/interests
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    const currentData = docSnap.exists() ? docSnap.data() : {};

    const mergedInterests = Array.from(new Set([...(currentData.interests || []), ...(analysis.interests || [])]));
    const mergedSkills = Array.from(new Set([...(currentData.skills || []), ...(analysis.skills || [])]));
    const mergedStrengths = Array.from(new Set([...(currentData.strengths || []), ...(analysis.personalityTraits || [])]));
    const mergedCareers = Array.from(new Set([...(currentData.careers || []), ...(analysis.suggestedCareers || [])]));

    await setDoc(userRef, {
        interests: mergedInterests,
        skills: mergedSkills,
        strengths: mergedStrengths,
        careers: mergedCareers,
        instagram: {
            analysis: analysis,
            lastAnalyzed: new Date().toISOString()
        }
    }, { merge: true });

    return analysis;
}
export async function chatWithMentor(userProfile, history, message) {
    return await callPythonBackend("/chat-mentor", { profile: userProfile, history: history, message: message });
}

export async function generateRoadmap(userProfile, selectedGoal = null, preferences = null, additionalContext = null) {
    try {
        const response = await fetch("/api/generate-roadmap", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                profile: userProfile,
                selectedGoal: selectedGoal,
                preferences: preferences,
                additionalContext: additionalContext
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to generate roadmap");
        return data;
    } catch (error) {
        console.error("Error in generateRoadmap:", error);
        throw error;
    }
}

export async function generateCareerSuggestions(userProfile) {
    try {
        const response = await fetch("/api/generate-suggestions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(userProfile),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to generate suggestions");
        return data;
    } catch (error) {
        console.error("Error in generateCareerSuggestions:", error);
        throw error;
    }
}

export async function recommendCourses(userProfile, goal, platform) {
    try {
        const response = await fetch("/api/recommend-courses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                profile: userProfile,
                goal: goal,
                platform: platform
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to recommend courses");
        return data; // Array of courses
    } catch (error) {
        console.error("Error in recommendCourses:", error);
        throw error;
    }
}

export async function generatePodcast(userId, roadmap, userProfile) {
    try {
        const response = await fetch("/api/generate-podcast", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId, roadmap, userProfile }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to generate podcast");
        return data; // Returns { status, audioUrl?, message? }
    } catch (error) {
        console.error("Error in generatePodcast:", error);
        throw error;
    }
}

export async function checkPodcastStatus(userId, roadmapId) {
    try {
        const response = await fetch(`/api/check-podcast?userId=${userId}&roadmapId=${roadmapId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to check podcast status");
        return data; // Returns { status, audioUrl?, message? }
    } catch (error) {
        console.error("Error in checkPodcastStatus:", error);
        throw error;
    }
}

export async function generateVideo(userId, roadmap, userProfile) {
    try {
        const response = await fetch("/api/generate-video", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId, roadmap, userProfile }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to generate video");
        return data; // Returns { status, videoUrl?, message? }
    } catch (error) {
        console.error("Error in generateVideo:", error);
        throw error;
    }
}

export async function checkVideoStatus(userId, roadmapId) {
    try {
        const response = await fetch(`/api/check-video?userId=${userId}&roadmapId=${roadmapId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to check video status");
        return data; // Returns { status, videoUrl?, message? }
    } catch (error) {
        console.error("Error in checkVideoStatus:", error);
        throw error;
    }
}

export async function generateStepExplanation(userProfile, careerGoal, stepTitle, taskTitle) {
    return await callPythonBackend("/generate-step-explanation", {
        profile: userProfile,
        careerGoal: careerGoal,
        stepTitle: stepTitle,
        taskTitle: taskTitle
    });
}
