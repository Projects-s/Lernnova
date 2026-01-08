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

    try {
        const [likedResponse, subsResponse] = await Promise.all([
            fetch(likedVideosUrl, { headers }),
            fetch(subscriptionsUrl, { headers })
        ]);

        if (!likedResponse.ok) console.error("YT Liked Fetch Error", await likedResponse.text());
        if (!subsResponse.ok) console.error("YT Subs Fetch Error", await subsResponse.text());

        const likedData = likedResponse.ok ? await likedResponse.json() : { items: [] };
        const subsData = subsResponse.ok ? await subsResponse.json() : { items: [] };

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

        return {
            likedVideos: liked,
            subscriptions: subscribed
        };

    } catch (error) {
        console.error("Error fetching YouTube data", error);
        throw error;
    }
}
