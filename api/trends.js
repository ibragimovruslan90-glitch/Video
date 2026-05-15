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
        if (!API_KEY) {
            return res.status(500).json({ error: "YOUTUBE_API_KEY не задан в переменных окружения Vercel", debug });
        }

        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=RU&relevanceLanguage=ru&maxResults=20&key=${API_KEY}`;

        debug.push("Запрос YouTube трендов RU...");

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.error) {
            debug.push("Ошибка YouTube API: " + JSON.stringify(data.error));
            return res.status(500).json({ error: data.error.message, debug });
        }

        debug.push(`Получено видео: ${data.items ? data.items.length : 0}`);

        if (!data.items || data.items.length === 0) {
            return res.status(200).json({ top: [], debug });
        }

        const videos = data.items.map(function(v) {
            const published = new Date(v.snippet.publishedAt);
            const views = parseInt(v.statistics.viewCount || 0);
            const hours = Math.max((Date.now() - published.getTime()) / 3600000, 0.5);
            const speed = Math.round(views / hours);

            // Парсим длину ISO 8601
            const dur = v.contentDetails ? v.contentDetails.duration : "";
            const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            const totalSec = m
                ? (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0)
                : 0;

            return {
                id: v.id,
                title: v.snippet.title,
                channel: v.snippet.channelTitle,
                views: Math.round(views / 1000),
                hours: parseFloat(hours.toFixed(1)),
                speed: speed,
                durationSec: totalSec,
                url: "https://youtube.com/watch?v=" + v.id,
                thumbnail: (v.snippet.thumbnails && v.snippet.thumbnails.medium)
                    ? v.snippet.thumbnails.medium.url : "",
            };
        });

        const top = videos.sort(function(a, b) { return b.speed - a.speed; }).slice(0, 10);

        return res.status(200).json({ success: true, top: top, debug: debug });

    } catch (err) {
        debug.push("Exception: " + err.message);
        return res.status(500).json({ error: err.message, debug: debug });
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
var allVideos = [];

try {
    for (var i = 0; i < channels.length; i++) {
        var channelId = channels[i];
        var durations = ["medium", "long"];

        for (var d = 0; d < durations.length; d++) {
            var duration = durations[d];

            var search = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=15&type=video&order=date&videoDuration=${duration}&key=${API_KEY}`
            );

            var searchData = await search.json();
            if (!searchData.items) continue;

            var ids = searchData.items.map(function(i) { return i.id.videoId; }).join(",");
            if (!ids) continue;

            var statsRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${API_KEY}`
            );

            var statsData = await statsRes.json();

            if (!statsData.items) continue;

            statsData.items.forEach(function(v) {
                var published = new Date(v.snippet.publishedAt);
                if (published < weekAgo) return;

                var title = v.snippet.title.toLowerCase();
                if (title.includes("#shorts") || title.includes("shorts")) return;

                var views = parseInt(v.statistics.viewCount / 1000 || 0);
                var hours = (Date.now() - published.getTime()) / 3600000;
                var speed = views * 1000 / Math.max(hours, 1);

                allVideos.push({
                    id: v.id,
                    title: v.snippet.title,
                    views: views,
                    hours: hours,
                    speed: speed,
                    url: "https://youtube.com/watch?v=" + v.id,
                    thumbnail: (v.snippet.thumbnails && v.snippet.thumbnails.medium)
                        ? v.snippet.thumbnails.medium.url : "",
                });
            });
        }
    }

    var unique = {};
    allVideos.forEach(function(v) { unique[v.id] = v; });
    var uniqueVideos = Object.values(unique);
    var top = uniqueVideos.sort(function(a, b) { return b.speed - a.speed; }).slice(0, 10);

    res.status(200).json({ success: true, count: uniqueVideos.length, top: top });

} catch (err) {
    res.status(500).json({ error: err.message });
}
```

}