"use client";

import { useAuth } from "@/lib/AuthContext";
import Navbar from "@/components/Navbar";
import { useState, useEffect, useRef } from "react";
import { Plus, MessageSquare, Send, Brain, Bot, User, Trash2, ArrowLeft } from "lucide-react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { chatWithMentor } from "@/lib/gemini";
import ReactMarkdown from 'react-markdown';
import Link from "next/link";

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function MentorPage() {
    const { user, profile, loading } = useAuth();
    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [input, setInput] = useState("");
    const [thinkingChatId, setThinkingChatId] = useState(null);

    const loadingTexts = [
        "Analyzing profile context...",
        "Evaluating technical skills...",
        "Structuring roadmap steps...",
        "Generating actionable advice...",
        "Synthesizing career insights..."
    ];
    const [loadingTextIndex, setLoadingTextIndex] = useState(0);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!thinkingChatId) return;
        setLoadingTextIndex(0);
        const interval = setInterval(() => {
            setLoadingTextIndex((prev) => (prev + 1) % loadingTexts.length);
        }, 1500);
        return () => clearInterval(interval);
    }, [thinkingChatId]);

    // Load chats from firestore on mount
    useEffect(() => {
        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().chats) {
                const loadedChats = docSnap.data().chats || [];
                setChats(loadedChats);
                // If there's no active chat but we have history, maybe don't auto-open one so the "New Chat" is explicit, or auto open latest
                if (!activeChatId && loadedChats.length > 0) {
                    // Do nothing, let them pick or start new
                }
            }
        });

        return () => unsubscribe();
    }, [user, activeChatId]);

    // Scroll to bottom of chat when new message arrives
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chats, activeChatId, thinkingChatId]);

    const activeChat = chats.find(c => c.id === activeChatId) || { id: "new", title: "New Conversation", messages: [] };

    const saveChatsToDb = async (updatedChats) => {
        if (!user) return;
        try {
            await setDoc(doc(db, "users", user.uid), { chats: updatedChats }, { merge: true });
        } catch (error) {
            console.error("Failed to save chats", error);
        }
    };

    const handleCreateNewChat = () => {
        setActiveChatId(null); // implies 'new'
    };

    const handleDeleteChat = async (e, chatId) => {
        e.stopPropagation();
        const updatedChats = chats.filter(c => c.id !== chatId);
        setChats(updatedChats);
        if (activeChatId === chatId) setActiveChatId(null);
        await saveChatsToDb(updatedChats);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || thinkingChatId || !profile) return;

        const userMsg = input.trim();
        setInput("");

        let currentChats = [...chats];
        let currentChatId = activeChatId;

        // If starting a completely new chat...
        if (!currentChatId) {
            currentChatId = generateId();
            setActiveChatId(currentChatId);

            // Try to make a short title based on their prompt
            const title = userMsg.length > 30 ? userMsg.substring(0, 30) + "..." : userMsg;
            currentChats.unshift({
                id: currentChatId,
                title: title,
                createdAt: Date.now(),
                messages: []
            });
        }

        const chatIndex = currentChats.findIndex(c => c.id === currentChatId);

        // Append user's message locally
        const newMessage = { role: "user", content: userMsg, timestamp: Date.now() };
        currentChats[chatIndex].messages.push(newMessage);

        setChats([...currentChats]);
        setThinkingChatId(currentChatId);

        // Save the user's message to the DB immediately so onSnapshot doesn't overwrite it
        await saveChatsToDb(currentChats);

        try {
            // Build simple string history for gemini using previous messages in this chat
            const historyForGemini = currentChats[chatIndex].messages.slice(0, -1).map(m => ({
                role: m.role,
                content: m.content
            }));

            // Add progress or active roadmap to full context for Gemini
            const specializedProfileContext = {
                ...profile,
                activeLearningPathway: profile?.roadmap || "No current pathway active"
            };

            const aiResponse = await chatWithMentor(specializedProfileContext, historyForGemini, userMsg);

            // Check if AI suggested a roadmap update
            if (aiResponse.suggestedRoadmapUpdate && profile.roadmap) {
                try {
                    const updatedRoadmap = { ...profile.roadmap, steps: aiResponse.suggestedRoadmapUpdate };
                    await setDoc(doc(db, "users", user.uid), { roadmap: updatedRoadmap }, { merge: true });
                } catch (ex) {
                    console.error("Failed to update roadmap automatically", ex);
                }
            }

            // Append AI's message
            const aiMsg = { role: "assistant", content: aiResponse.message || "I don't have an answer right now.", timestamp: Date.now() };
            currentChats[chatIndex].messages.push(aiMsg);

            setChats([...currentChats]);
            await saveChatsToDb(currentChats);

        } catch (error) {
            console.error("AI chat error:", error);
            // Append error message to UI
            currentChats[chatIndex].messages.push({ role: "assistant", content: "**Error**: Failed to retrieve AI response. Check the console or try again.", timestamp: Date.now() });
            setChats([...currentChats]);
        } finally {
            setThinkingChatId(null);
        }
    };

    if (loading) return <div className="min-h-screen bg-[#030014]"></div>;
    if (!user) {
        return (
            <main className="min-h-screen flex flex-col bg-[#050508] text-white pb-20">
                <Navbar />
                <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 mb-4 flex items-center shrink-0 pt-8">
                    <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 w-fit">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
                <div className="flex-1 flex justify-center items-center">
                    <div className="text-center bg-white/5 p-8 rounded-2xl border border-white/10 max-w-md">
                        <User className="w-12 h-12 text-indigo-400 mx-auto mb-4 opacity-50" />
                        <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
                        <p className="text-muted mb-6">Please log in securely to access the AI Mentor and continue your personalized journey.</p>
                        <Link href="/" className="btn bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl transition-all">Go to Home</Link>
                    </div>
                </div>
            </main>
        );
    }
    return (
        <main className="min-h-screen flex flex-col bg-[#050508] text-white pb-20">
            <Navbar />

            <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 mb-4 flex items-center shrink-0">
                <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 w-fit">
                    <ArrowLeft className="w-4 h-4" /> {user ? "Back to Dashboard" : "Back to Home"}
                </Link>
            </div>

            {/* Split UI: Sidebar (Chats) & Main Chat Window */}
            <div className="w-full max-w-7xl mx-auto flex rounded-3xl border border-white/10 h-[80vh] min-h-[600px] overflow-hidden shadow-2xl">

                {/* SIDEBAR: HISTORY */}
                <div className="w-80 border-r border-white/5 bg-[#0a0a0f] flex flex-col hidden md:flex shrink-0">
                    <div className="p-4 border-b border-white/5">
                        <button
                            onClick={handleCreateNewChat}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(79,70,229,0.2)]"
                        >
                            <Plus className="w-4 h-4" /> New Conversation
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 mt-2 mb-4 px-2">Your Chat History</p>

                        {chats.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-5 italic">No past conversations</p>
                        ) : (
                            chats.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => setActiveChatId(c.id)}
                                    className={`w-full group rounded-xl p-3 cursor-pointer flex justify-between items-center transition-all border ${activeChatId === c.id ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <MessageSquare className={`w-4 h-4 shrink-0 ${activeChatId === c.id ? 'text-indigo-400' : 'text-gray-500'}`} />
                                        <div className="text-sm truncate font-medium max-w-[150px]">{c.title}</div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteChat(e, c.id)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* MAIN CHAT WINDOW */}
                <div className="flex-1 flex flex-col bg-[#030014] relative min-h-0">

                    {/* Header */}
                    <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-4 shrink-0 shadow-md z-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-none">Lernova Mentor</h2>
                            <p className="text-xs text-indigo-300/80 font-medium">Aware of your profile, skills, & roadmap context</p>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar relative">
                        {(!activeChat?.messages || activeChat.messages.length === 0) && activeChat?.id !== thinkingChatId ? (
                            <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto w-full absolute inset-0 m-auto h-fit text-white/50 space-y-6 px-4">
                                <div className="p-6 bg-white/5 rounded-full border border-white/10 shadow-2xl">
                                    <Brain className="w-16 h-16 text-indigo-400 opacity-50" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white/90 mb-2 tracking-tight">How can I guide your career today?</h3>
                                    <p className="text-sm font-medium">I have fully analyzed your digital footprint, your implied technical/soft skills, and your current learning map. Ask me anything.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                                    <button onClick={() => setInput("Can you evaluate my current skills against my dream role?")} className="p-4 text-xs font-bold bg-white/5 rounded-xl border border-white/5 hover:border-indigo-400 hover:text-indigo-300 hover:bg-white/10 transition-colors text-left text-white/80">Evaluate my current skills against my dream role</button>
                                    <button onClick={() => setInput("I'm stuck on my current roadmap milestone. Any advice?")} className="p-4 text-xs font-bold bg-white/5 rounded-xl border border-white/5 hover:border-indigo-400 hover:text-indigo-300 hover:bg-white/10 transition-colors text-left text-white/80">I'm stuck on my current roadmap milestone.</button>
                                    <button onClick={() => setInput("What non-obvious career paths match my personality profile?")} className="p-4 text-xs font-bold bg-white/5 rounded-xl border border-white/5 hover:border-indigo-400 hover:text-indigo-300 hover:bg-white/10 transition-colors text-left text-white/80">What non-obvious careers match my personality profile?</button>
                                    <button onClick={() => setInput("Can you generate a micro-project for me based on my YouTube watch history?")} className="p-4 text-xs font-bold bg-white/5 rounded-xl border border-white/5 hover:border-indigo-400 hover:text-indigo-300 hover:bg-white/10 transition-colors text-left text-white/80">Generate a micro-project based on my YouTube history.</button>
                                </div>
                            </div>
                        ) : (
                            activeChat.messages.map((msg, idx) => (
                                <div key={idx} className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-4 max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>

                                        {/* Avatar */}
                                        <div className="shrink-0 mt-1">
                                            {msg.role === 'user' ? (
                                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                                                    {(profile?.photoURL || user.photoURL) ? (
                                                        <img
                                                            src={profile?.photoURL || user.photoURL}
                                                            alt="User"
                                                            className="w-full h-full rounded-full object-cover"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    ) : (
                                                        <User className="w-4 h-4 text-white" />
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                                    <Bot className="w-5 h-5 text-white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Message Bubble */}
                                        <div className={`p-5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-indigo-600 font-medium shadow-lg'
                                            : 'bg-white/5 border border-white/10 font-medium'
                                            }`}>
                                            {msg.role === 'user' ? (
                                                msg.content
                                            ) : (
                                                <div className="markdown-body space-y-4 prose prose-invert max-w-none">
                                                    <ReactMarkdown>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {thinkingChatId === activeChat?.id && (
                            <div className="w-full flex justify-start">
                                <div className="flex gap-4 max-w-[85%] auto">
                                    <div className="w-8 h-8 rounded-xl shrink-0 mt-1 bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 font-medium flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-gray-400 text-xs ml-2 min-w-[150px] transition-opacity duration-300">{loadingTexts[loadingTextIndex]}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-12 shrink-0" />
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 border-t border-white/5 bg-white/[0.01] shrink-0 mt-auto shadow-[-0_-10px_20px_rgba(0,0,0,0.2)]">
                        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask your mentor anything about your career or roadmap..."
                                className="w-full bg-[#111] border border-white/10 focus:border-indigo-500/50 rounded-2xl py-4 pl-6 pr-16 outline-none transition-all shadow-inner font-medium text-white placeholder-gray-500"
                                disabled={!!thinkingChatId}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || !!thinkingChatId}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 disabled:bg-indigo-600/30 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                            >
                                <Send className="w-4 h-4 text-white" />
                            </button>
                        </form>
                        <p className="text-center text-[10px] text-gray-600 mt-3 font-semibold tracking-wider">Lernova AI Mentor can dynamically update your active milestones automatically based on decisions you make here.</p>
                    </div>

                </div>
            </div>
            {/* Global style for markdown support */}
            <style jsx global>{`
                .markdown-body ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
                .markdown-body ol { list-style-type: decimal; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
                .markdown-body h3 { font-size: 1.1rem; font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem; color: #a5b4fc; }
                .markdown-body strong { color: #818cf8; }
                .markdown-body p { margin-bottom: 0.8rem; }
                .markdown-body p:last-child { margin-bottom: 0; }
            `}</style>
        </main >
    );
}
