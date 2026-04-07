export default async function handler(req, res) {
    const API_KEY = process.env.YOUTUBE_API_KEY;

    const queries = [
        "roblox",
        "roblox челлендж",
        "roblox хоррор"
    ];

    const stopWords = [
        "я","в","на","и","с","это","как",
        "roblox","роблокс","игра","карта"
    ];

    function extractCandidates(title) {
        return title
            .replace(/[^\w\s]/g, "")
            .split(/\s+/)
            .filter(w => {
                const lower = w.toLowerCase();
                return w.length > 2 &&
                       !stopWords.includes(lower) &&
                       (w === w.toUpperCase() || w[0] === w[0].toUpperCase());
            });
    }

    let allVideos = [];

    for (let q of queries) {
        const search = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&maxResults=10&type=video&order=date&key=${API_KEY}`
        );

        const data = await search.json();
        const ids = data.items.map(i => i.id.videoId).join(",");

        const stats = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${API_KEY}`
        );

        const statsData = await stats.json();

        statsData.items.forEach(v => {
            allVideos.push({
                id: v.id,
                title: v.snippet.title,
                views: parseInt(v.statistics.viewCount),
                publishedAt: v.snippet.publishedAt
            });
        });
    }

    const map = {};

    allVideos.forEach(v => {
        const hours = (Date.now() - new Date(v.publishedAt)) / 3600000;
        const score = v.views / Math.max(hours, 1);

        extractCandidates(v.title).forEach(name => {
            if (!map[name]) map[name] = { score: 0, videos: [] };

            map[name].score += score;
            map[name].videos.push({
                title: v.title,
                views: v.views,
                hours,
                url: `https://youtube.com/watch?v=${v.id}`
            });
        });
    });

    const result = Object.entries(map)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5);

    res.status(200).json(result);
}
