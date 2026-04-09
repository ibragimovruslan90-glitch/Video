export default async function handler(req, res) {
    const API_KEY = process.env.YOUTUBE_API_KEY;

    const channels = [
        "UC6HKWohA11bBbyob7ieP-0g", // квинка
        "UCHVY_-jY-FayjszyX1nlGtQ", // холибам
        "UC6n4D1sE8p2qxGn8pYtBX9w", //кошка лана
    "UCkR0GY0ue02kzM0b1W3O0lw", //ffgtv
    "UCwzS3xJzj9p0n8C2Vq2mRbw", //robzi
    "UC5k3K0Yk4pR5r7E2Lk0wXkw", //over show
    "UC9v0l9D0v9l3Vx0F9Xl8XzA" //владус
    ];

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let allVideos = [];

    try {
        for (let channelId of channels) {

            // 🔥 ДВА запроса: medium + long
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

                    // 📅 только за 7 дней
                    if (published < weekAgo) return;

                    const title = v.snippet.title.toLowerCase();

                    // 🚫 убираем Shorts вручную
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
                        thumbnail: v.snippet.thumbnails?.medium?.url || "" // Добавляем превью
                    });
                });
            }
        }

        // ❗ убираем дубликаты (одно видео может попасть дважды)
        const unique = {};
        allVideos.forEach(v => {
            unique[v.id] = v;
        });

        const uniqueVideos = Object.values(unique);

        // 🔥 сортировка по скорости
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
