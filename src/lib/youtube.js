"use strict";

export async function fetchYouTubeData(accessToken) {
    if (!accessToken) throw new Error("No access token provided");

    const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
    };

    // 1. Fetch Liked Videos
    // https://developers.google.com/youtube/v3/docs/playlistItems/list
    // "LL" is the ID for the "Liked Videos" playlist of the authenticated user (sometimes). 
    // Actually, standard way is to get channels first, then find "likes" playlist. 
    // BUT, 'LL' is a magic ID for liked videos. Let's try that first, often works.
    // UPDATE: 'LL' was deprecated/removed in some contexts. 
    // Better: Use `myRating=like` on `videos` endpoint.

    const likedVideosUrl = "https://www.googleapis.com/youtube/v3/videos?myRating=like&part=snippet&maxResults=50";

    // 2. Fetch Subscriptions
    const subscriptionsUrl = "https://www.googleapis.com/youtube/v3/subscriptions?mine=true&part=snippet&maxResults=50";

    // 3. Fetch User's Playlists
    const playlistsUrl = "https://www.googleapis.com/youtube/v3/playlists?mine=true&part=snippet&maxResults=20";

    try {
        const [likedResponse, subsResponse, playlistsResponse] = await Promise.all([
            fetch(likedVideosUrl, { headers }),
            fetch(subscriptionsUrl, { headers }),
            fetch(playlistsUrl, { headers })
        ]);

        if (!likedResponse.ok) console.error("YT Liked Fetch Error", await likedResponse.text());
        if (!subsResponse.ok) console.error("YT Subs Fetch Error", await subsResponse.text());
        if (!playlistsResponse.ok) console.error("YT Playlists Fetch Error", await playlistsResponse.text());

        const likedData = likedResponse.ok ? await likedResponse.json() : { items: [] };
        const subsData = subsResponse.ok ? await subsResponse.json() : { items: [] };
        const playlistsData = playlistsResponse.ok ? await playlistsResponse.json() : { items: [] };

        // Normalize data for analysis
        const liked = likedData.items.map(item => ({
            title: item.snippet.title,
            description: item.snippet.description,
            channel: item.snippet.channelTitle,
            tags: item.snippet.tags || [],
            categoryId: item.snippet.categoryId
        }));

        const subscribed = subsData.items.map(item => ({
            title: item.snippet.title,
            description: item.snippet.description
        }));

        // Fetch items for each playlist
        const playlists = await Promise.all(playlistsData.items.map(async (pl) => {
            const plItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${pl.id}&part=snippet&maxResults=10`;
            const plResponse = await fetch(plItemsUrl, { headers });
            const plItemsData = plResponse.ok ? await plResponse.json() : { items: [] };

            return {
                title: pl.snippet.title,
                description: pl.snippet.description,
                videos: plItemsData.items.map(i => i.snippet.title)
            };
        }));

        return {
            likedVideos: liked,
            subscriptions: subscribed,
            playlists: playlists
        };

    } catch (error) {
        console.error("Error fetching YouTube data", error);
        throw error;
    }
}
