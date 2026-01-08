"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, BookOpen, CheckSquare, Plus, Menu } from "lucide-react";

export default function ChatPage() {
    const [messages, setMessages] = useState([
        {
            role: "bot",
            content: "Hello! I saw you're interested in Creative Tech & UI Design. I've drafted a personalized learning roadmap for you. Shall we review it?"
        }
    ]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);

    const [roadmap, setRoadmap] = useState([
        { id: 1, title: "Fundamentals of UI/UX", status: "current" },
        { id: 2, title: "Mastering Figma", status: "locked" },
        { id: 3, title: "HTML/CSS & Animation", status: "locked" },
    ]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        // Add user message
        const newMessages = [...messages, { role: "user", content: input }];
        setMessages(newMessages);
        setInput("");

        // Mock bot response
        setTimeout(() => {
            setMessages(curr => [...curr, {
                role: "bot",
                content: "That's a great goal! I've updated your roadmap to include a module on that topic."
            }]);
            // Mock roadmap update
            setRoadmap(curr => [...curr, { id: Date.now(), title: input, status: "locked" }]);
        }, 1000);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-black text-white selection:bg-indigo-500/30">

            {/* Sidebar / Roadmap Panel */}
            <div className="w-96 border-r border-white/10 hidden lg:flex flex-col bg-black/60 backdrop-blur-3xl">
                <div className="p-8 border-b border-white/10">
                    <h2 className="font-bold text-xl flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <BookOpen className="text-indigo-400 w-5 h-5" />
                        </div>
                        Your Roadmap
                    </h2>
                    <p className="text-sm text-muted">Level 1: Beginner Designer</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {roadmap.map((item, idx) => (
                        <div key={item.id} className={`p-5 rounded-2xl border transition-all duration-300 ${item.status === 'current' ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-white/5 border-white/5 opacity-60 hover:opacity-100'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-mono text-muted uppercase tracking-wider">Module 0{idx + 1}</span>
                                {item.status === 'current' && <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>}
                            </div>
                            <h3 className="font-semibold text-lg">{item.title}</h3>
                        </div>
                    ))}
                    <button className="w-full py-4 border border-dashed border-white/20 rounded-2xl text-sm text-muted hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2 group">
                        <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" /> Add Custom Goal
                    </button>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]">

                {/* Mobile Header */}
                <div className="h-20 border-b border-white/10 flex items-center px-8 lg:px-10 bg-black/40 backdrop-blur-xl z-20 justify-between lg:justify-start">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Lernova Mentor</h3>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <p className="text-xs text-green-400 font-medium tracking-wide">ONLINE</p>
                            </div>
                        </div>
                    </div>
                    <button className="lg:hidden p-2 text-white/50 hover:text-white"><Menu /></button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scroll-smooth">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                            <div className={`max-w-[85%] md:max-w-[70%] p-6 rounded-3xl shadow-xl ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm'
                                    : 'bg-white/10 backdrop-blur-md border border-white/10 text-gray-100 rounded-tl-sm'
                                }`}>
                                <p className="leading-relaxed text-base md:text-lg">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 md:p-8 bg-gradient-to-t from-black via-black/90 to-transparent">
                    <div className="relative max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask for guidance, resources, or next steps..."
                            className="w-full bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl pl-6 pr-14 py-5 focus:outline-none focus:border-indigo-500/50 focus:bg-white/15 transition-all text-white placeholder:text-gray-500 shadow-2xl text-lg"
                        />
                        <button
                            onClick={handleSend}
                            className="absolute right-3 top-3 p-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-all shadow-lg shadow-indigo-600/20"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-center text-xs text-muted mt-4">AI can make mistakes. Please verify important career information.</p>
                </div>

            </div>
        </div>
    );
}
