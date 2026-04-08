export default async function handler(req, res) {
    const API_KEY = process.env.YOUTUBE_API_KEY;

    // 🔥 ВСТАВЬ СЮДА ID КАНАЛОВ
    const channels = [
        "UC6HKWohA11bBbyob7ieP-0g"
    ];

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let allVideos = [];
    let debug = [];

    try {
        for (let channelId of channels) {

            // Получаем последние видео канала
            const search = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=15&order=date&type=video&key=${API_KEY}`
            );

            const data = await search.json();

            if (!data.items) continue;

            const ids = data.items.map(i => i.id.videoId).join(",");

            const statsRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${API_KEY}`
            );

            const statsData = await statsRes.json();

            statsData.items?.forEach(v => {
                const published = new Date(v.snippet.publishedAt);

                // фильтр по 7 дням
                if (published < weekAgo) return;

                const title = v.snippet.title.toLowerCase();

                // фильтр по Roblox
                if (!title.includes("roblox") && !title.includes("роблокс")) return;

                const views = parseInt(v.statistics.viewCount || 0);
                const hours = (Date.now() - published) / 3600000;

                const speed = views / Math.max(hours, 1);

                allVideos.push({
                    title: v.snippet.title,
                    views,
                    hours,
                    speed,
                    url: `https://youtube.com/watch?v=${v.id}`
                });
            });
        }

        // сортировка по скорости
        const top = allVideos
            .sort((a, b) => b.speed - a.speed)
            .slice(0, 10);

        res.status(200).json({
            success: true,
            count: allVideos.length,
            top
        });

    } catch (err) {
        res.status(500).json({ error: err.message, debug });
    }
}
