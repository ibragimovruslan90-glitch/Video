export default async function handler(req, res) {
const API_KEY = process.env.YOUTUBE_API_KEY;
const mode = req.query.mode || “roblox”;


if (mode === "youtube") {
    try {
        const apiUrl = "https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=RU&maxResults=20&key=" + API_KEY;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.items) {
            return res.status(500).json({ error: data.error ? data.error.message : "No items" });
        }

        const top = data.items.map(v => {
            const published = new Date(v.snippet.publishedAt);
            const views = parseInt(v.statistics.viewCount || 0);
            const hours = (Date.now() - published) / 3600000;
            const speed = views / Math.max(hours, 1);
            return {
                id: v.id,
                title: v.snippet.title,
                views: parseInt(views / 1000),
                hours,
                speed,
                url: "https://youtube.com/watch?v=" + v.id,
                thumbnail: v.snippet.thumbnails?.medium?.url || ""
            };
        }).sort((a, b) => b.speed - a.speed).slice(0, 10);

        return res.status(200).json({ success: true, top });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ======= ROBLOX (оригинальный код без изменений) =======

const channels = [
    "UC6HKWohA11bBbyob7ieP-0g", // квинка
    "UCHVY_-jY-FayjszyX1nlGtQ", // холибам
    "UClTYGNdQTwp2w3PhOpmVIkw", //кошка лана
    "UCUzkpCMREk2AGgZwT55JizA", //владус
    "UC2VQebBHZ0Jmh-AI2JrXkQg", // over show
    "UCNJwQAU08P3muRZkZUOvx5A" // family play tv
];

const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

let allVideos = [];

try {
    for (let channelId of channels) {

        const durations = ["medium", "long"];

        for (let duration of durations) {

            const search = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=15&type=video&order=date&videoDuration=${duration}&key=${API_KEY}`
            );

            const data = await search.json();
            if (!data.items) continue;

            const ids = data.items.map(i => i.id.videoId).join(",");
            if (!ids) continue;

            const statsRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${API_KEY}`
            );

            const statsData = await statsRes.json();

            statsData.items?.forEach(v => {
                const published = new Date(v.snippet.publishedAt);

                if (published < weekAgo) return;

                const title = v.snippet.title.toLowerCase();

                if (title.includes("#shorts") || title.includes("shorts")) return;

                const views = parseInt(v.statistics.viewCount / 1000 || 0);
                const hours = (Date.now() - published) / 3600000;
                const speed = views * 1000 / Math.max(hours, 1);

                allVideos.push({
                    id: v.id,
                    title: v.snippet.title,
                    views,
                    hours,
                    speed,
                    url: `https://youtube.com/watch?v=${v.id}`,
                    thumbnail: v.snippet.thumbnails?.medium?.url || ""
                });
            });
        }
    }

    const unique = {};
    allVideos.forEach(v => {
        unique[v.id] = v;
    });

    const uniqueVideos = Object.values(unique);

    const top = uniqueVideos
        .sort((a, b) => b.speed - a.speed)
        .slice(0, 10);

    res.status(200).json({
        success: true,
        count: uniqueVideos.length,
        top
    });

} catch (err) {
    res.status(500).json({ error: err.message });
}


}