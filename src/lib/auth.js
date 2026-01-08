import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "mock_client_id",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock_client_secret",
        }),
    ],
    pages: {
        signIn: '/auth/signin',
    },
    callbacks: {
        async session({ session, token }) {
            return session;
        },
    },
}

export default NextAuth(authOptions)
