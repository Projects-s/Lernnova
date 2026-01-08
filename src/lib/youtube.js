"use strict";

export async function fetchYouTubeData(accessToken) {
    if (!accessToken) throw new Error("No access token provided");

    const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
    };

    // 1. Fetch Liked Videos
    // We use myRating=like to get videos the user actively liked.
    // part=snippet,contentDetails,topicDetails gives us title, duration, and official topics.
    const likedVideosUrl = "https://www.googleapis.com/youtube/v3/videos?myRating=like&part=snippet,contentDetails,topicDetails&maxResults=50";

    // 2. Fetch Subscriptions
    const subscriptionsUrl = "https://www.googleapis.com/youtube/v3/subscriptions?mine=true&part=snippet&maxResults=50";

    // 3. Fetch User's Playlists
    const playlistsUrl = "https://www.googleapis.com/youtube/v3/playlists?mine=true&part=snippet&maxResults=20";

    // 4. Fetch User's Channel Profile (Basic Details)
    const channelUrl = "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&mine=true";

    try {
        const [likedResponse, subsResponse, playlistsResponse, channelResponse] = await Promise.all([
            fetch(likedVideosUrl, { headers }),
            fetch(subscriptionsUrl, { headers }),
            fetch(playlistsUrl, { headers }),
            fetch(channelUrl, { headers })
        ]);

        if (!likedResponse.ok) console.error("YT Liked Fetch Error", await likedResponse.text());
        if (!subsResponse.ok) console.error("YT Subs Fetch Error", await subsResponse.text());
        if (!playlistsResponse.ok) console.error("YT Playlists Fetch Error", await playlistsResponse.text());
        if (!channelResponse.ok) console.error("YT Channel Fetch Error", await channelResponse.text());

        const likedData = likedResponse.ok ? await likedResponse.json() : { items: [] };
        const subsData = subsResponse.ok ? await subsResponse.json() : { items: [] };
        const playlistsData = playlistsResponse.ok ? await playlistsResponse.json() : { items: [] };
        const channelData = channelResponse.ok ? await channelResponse.json() : { items: [] };

        // Normalize Channel Data
        const myChannel = channelData.items?.[0] ? {
            title: channelData.items[0].snippet.title || "",
            description: channelData.items[0].snippet.description || "",
            customUrl: channelData.items[0].snippet.customUrl || null,
            country: channelData.items[0].snippet.country || null, // Fix: undefined throws generic Error in Firestore
            viewCount: channelData.items[0].statistics.viewCount || "0",
            subscriberCount: channelData.items[0].statistics.subscriberCount || "0",
            videoCount: channelData.items[0].statistics.videoCount || "0",
            keywords: channelData.items[0].brandingSettings?.channel?.keywords || ""
        } : null;

        // Normalize data for analysis
        const liked = likedData.items.map(item => ({
            title: item.snippet.title,
            description: item.snippet.description,
            channel: item.snippet.channelTitle,
            tags: item.snippet.tags || [],
            categoryId: item.snippet.categoryId,
            duration: item.contentDetails?.duration, // e.g. PT5M33S
            topicIds: item.topicDetails?.topicIds || [], // e.g. /m/01k8wb
            topicCategories: item.topicDetails?.topicCategories || [] // e.g. https://en.wikipedia.org/wiki/Lifestyle_(sociology)
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
            channelProfile: myChannel,
            likedVideos: liked,
            subscriptions: subscribed,
            playlists: playlists
        };

    } catch (error) {
        console.error("Error fetching YouTube data", error);
        throw error;
    }
}
