export async function fetchGitHubData(accessToken) {
    if (!accessToken) throw new Error("No access token provided");

    const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
    };

    try {
        const [profileRes, reposRes, starredRes] = await Promise.all([
            fetch("https://api.github.com/user", { headers }),
            fetch("https://api.github.com/user/repos?sort=updated&per_page=20", { headers }),
            fetch("https://api.github.com/user/starred?per_page=50", { headers })
        ]);

        if (!profileRes.ok) throw new Error("GitHub profile fetch failed");

        const profileData = await profileRes.json();
        const reposData = reposRes.ok ? await reposRes.json() : [];
        const starredData = starredRes.ok ? await starredRes.json() : [];

        // Language analysis on own repos
        const languages = new Set();
        const myRepos = reposData.map(repo => {
            if (repo.language) languages.add(repo.language);
            return {
                name: repo.name,
                description: repo.description,
                language: repo.language,
                topics: repo.topics || []
            };
        });

        const starred = starredData.map(repo => ({
            name: repo.name,
            description: repo.description,
            language: repo.language,
            topics: repo.topics || []
        }));

        return {
            profile: {
                login: profileData.login,
                bio: profileData.bio,
                company: profileData.company,
                public_repos: profileData.public_repos,
            },
            languages: Array.from(languages),
            ownRepos: myRepos,
            starredRepos: starred
        };
    } catch (error) {
        console.error("Error fetching GitHub data:", error);
        throw error;
    }
}
