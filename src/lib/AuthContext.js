"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db, googleProvider } from "@/lib/firebase";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null); // Local state for user profile data
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let unsubscribeDoc = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    setUser(user);
                    // Fetch and listen to user profile from Firestore
                    const userRef = doc(db, "users", user.uid);

                    // Listen for realtime updates
                    unsubscribeDoc = onSnapshot(userRef, async (docSnap) => {
                        if (docSnap.exists()) {
                            setProfile(docSnap.data());
                        } else {
                            // Create new profile
                            const newProfile = {
                                uid: user.uid,
                                email: user.email || user.providerData?.[0]?.email || null,
                                displayName: user.displayName || user.providerData?.[0]?.displayName || "Adventurer",
                                photoURL: user.photoURL || user.providerData?.[0]?.photoURL || null,
                                interests: [],
                                skills: [],
                                progress: {},
                                onboardingComplete: false,
                                createdAt: serverTimestamp(),
                                lastLogin: serverTimestamp(),
                            };
                            await setDoc(userRef, newProfile);
                            setProfile(newProfile);
                        }
                    });
                } else {
                    setUser(null);
                    setProfile(null);
                    if (unsubscribeDoc) unsubscribeDoc();
                }
            } catch (error) {
                console.error("Auth state change error:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
    }, []);

    const login = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const userRef = doc(db, "users", user.uid);

            await setDoc(userRef, {
                lastLogin: serverTimestamp(),
                email: user.email || user.providerData?.[0]?.email || null,
                displayName: user.displayName || user.providerData?.[0]?.displayName || "Adventurer",
                photoURL: user.photoURL || user.providerData?.[0]?.photoURL || null
            }, { merge: true });

            // Redirect to dashboard after login
            router.push('/dashboard');

        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{ user, profile, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
