export async function fetchRedditData(accessToken) {
    if (!accessToken) throw new Error("No access token provided");

    const headers = {
        Authorization: `Bearer ${accessToken}`,
    };

    try {
        if (accessToken === "BYPASS_REDDIT_MOCK_TOKEN_2024") {
            // MOCK RETURN FOR BLOCKED REDDIT API
            return {
                profile: {
                    name: "CuriousMind992",
                    totalKarma: 14502
                },
                subreddits: [
                    { name: "r/reactjs", title: "React", description: "A community for learning and developing with React, a JavaScript library for building user interfaces." },
                    { name: "r/MachineLearning", title: "Machine Learning", description: "The largest machine learning community on reddit. " },
                    { name: "r/cybersecurity", title: "Cyber Security", description: "A community for those interested in cyber security." },
                    { name: "r/homegym", title: "Home Gym", description: "A subreddit devoted to working out at home." },
                    { name: "r/fountainpens", title: "Fountain Pens", description: "A community of fountain pen enthusiasts." },
                    { name: "r/dataisbeautiful", title: "Data is Beautiful", description: "Data is beautiful is for visualizations that effectively convey information." },
                    { name: "r/CampingandHiking", title: "Camping and Hiking", description: "Hikers who bring everything they need to survive in their backpacks." },
                    { name: "r/photography", title: "Photography", description: "A place to discuss the tools, technique and culture of the craft." },
                    { name: "r/personalfinance", title: "Personal Finance", description: "Learn about budgeting, saving, getting out of debt, credit, investing, and retirement planning." },
                    { name: "r/woodworking", title: "Woodworking", description: "A subreddit of Woodworkers. From hobbyists to professionals." },
                ]
            };
        }

        const [profileRes, subsRes] = await Promise.all([
            fetch("https://oauth.reddit.com/api/v1/me", { headers }),
            fetch("https://oauth.reddit.com/subreddits/mine/subscriber?limit=50", { headers })
        ]);

        if (!profileRes.ok) throw new Error("Reddit profile fetch failed. Token may be invalid.");

        const profileData = await profileRes.json();
        const subsData = subsRes.ok ? await subsRes.json() : { data: { children: [] } };

        const subreddits = subsData.data?.children?.map(sub => ({
            name: sub.data.display_name,
            title: sub.data.title,
            description: sub.data.public_description
        })) || [];


        return {
            profile: {
                name: profileData.name,
                totalKarma: profileData.total_karma
            },
            subreddits: subreddits
        };
    } catch (error) {
        console.error("Error fetching Reddit data:", error);
        throw error;
    }
}
