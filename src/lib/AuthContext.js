"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    setUser(user);
                    // Fetch user profile from Firestore
                    const userRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(userRef);

                    if (docSnap.exists()) {
                        setProfile(docSnap.data());
                    } else {
                        // Create new profile
                        const newProfile = {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
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
                } else {
                    setUser(null);
                    setProfile(null);
                }
            } catch (error) {
                console.error("Auth state change error:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const login = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const userRef = doc(db, "users", user.uid);

            await setDoc(userRef, {
                lastLogin: serverTimestamp(),
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            }, { merge: true });

            // Redirect to dashboard (homepage) after login
            router.push('/');

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
