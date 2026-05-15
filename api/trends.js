export default async function handler(req, res) {
const API_KEY = process.env.YOUTUBE_API_KEY;
const mode = req.query.mode || “roblox”;

```
// ─────────────────────────────────────────────
// РЕЖИМ: YouTube тренды RU
// ─────────────────────────────────────────────
if (mode === "youtube") {
    const debug = [];
    try {
        const url = new URL("https://www.googleapis.com/youtube/v3/videos");
        url.searchParams.set("part", "snippet,statistics,contentDetails");
        url.searchParams.set("chart", "mostPopular");
        url.searchParams.set("regionCode", "RU");
        url.searchParams.set("relevanceLanguage", "ru");
        url.searchParams.set("maxResults", "20");
        url.searchParams.set("key", API_KEY);

        debug.push("Запрос YouTube трендов RU...");
        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message, debug });
        }

        debug.push(`Получено: ${data.items?.length || 0} видео`);

        const videos = (data.items || []).map(v => {
            const published = new Date(v.snippet.publishedAt);
            const views = parseInt(v.statistics.viewCount || 0);
            const hours = Math.max((Date.now() - published) / 3600000, 0.5);
            const speed = Math.round(views / hours);

            // Парсим длину ISO 8601 → секунды
            const dur = v.contentDetails?.duration || "";
            const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            const totalSec = (parseInt(m?.[1] || 0) * 3600)
                + (parseInt(m?.[2] || 0) * 60)
                + parseInt(m?.[3] || 0);

            return {
                id: v.id,
                title: v.snippet.title,
                channel: v.snippet.channelTitle,
                views: Math.round(views / 1000),
                hours: parseFloat(hours.toFixed(1)),
                speed,
                durationSec: totalSec,
                url: `https://youtube.com/watch?v=${v.id}`,
                thumbnail: v.snippet.thumbnails?.medium?.url || "",
            };
        });

        const top = videos.sort((a, b) => b.speed - a.speed).slice(0, 10);

        return res.status(200).json({ success: true, top, debug });

    } catch (err) {
        return res.status(500).json({ error: err.message, debug });
    }
}

// ─────────────────────────────────────────────
// РЕЖИМ: Roblox каналы (оригинальный код)
// ─────────────────────────────────────────────
const channels = [
    "UC6HKWohA11bBbyob7ieP-0g", // квинка
    "UCHVY_-jY-FayjszyX1nlGtQ", // холибам
    "UClTYGNdQTwp2w3PhOpmVIkw", // кошка лана
    "UCUzkpCMREk2AGgZwT55JizA",  // владус
    "UC2VQebBHZ0Jmh-AI2JrXkQg",  // over show
    "UCNJwQAU08P3muRZkZUOvx5A",  // family play tv
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
                    thumbnail: v.snippet.thumbnails?.medium?.url || "",
                });
            });
        }
    }

    const unique = {};
    allVideos.forEach(v => { unique[v.id] = v; });
    const uniqueVideos = Object.values(unique);
    const top = uniqueVideos.sort((a, b) => b.speed - a.speed).slice(0, 10);

    res.status(200).json({ success: true, count: uniqueVideos.length, top });

} catch (err) {
    res.status(500).json({ error: err.message });
}
```

}