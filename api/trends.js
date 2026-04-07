export default async function handler(req, res) {
    const API_KEY = process.env.YOUTUBE_API_KEY;

    const queries = [
        "роблокс",
        "роблокс челлендж",
        "роблокс прохождение",
        "роблокс карта",
        "роблокс хоррор",
        "роблокс приключение",
        "роблокс мини игра",
        "роблокс секрет"
    ];

    const stopWords = [
        "я","в","на","и","с","это","как",
        "roblox","роблокс","игра","карта"
    ];

    function extractCandidates(title) {
        return title
            .replace(/[^\w\s]/g, "")
            .split(/\s+/)
            .filter(w => w.length > 2 && /[а-яА-ЯЁё]/.test(w) && !stopWords.includes(w.toLowerCase()));
    }

    let allVideos = [];
    let debug = []; // массив для вывода на страницу

    debug.push("=== Начало дебага ===");

    for (let q of queries) {
        const search = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&maxResults=10&type=video&order=date&regionCode=RU&relevanceLanguage=ru&key=${API_KEY}`
        );
        const data = await search.json();

        debug.push(`Запрос: "${q}"`);
        debug.push(`Поиск вернул items: ${data.items?.length || 0}`);
        data.items?.forEach((item, i) => {
            debug.push(`${i+1}. ${item.snippet.title} (${item.id.videoId})`);
        });

        const ids = data.items?.map(i => i.id.videoId).join(",");
        if (!ids) continue;

        const stats = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${API_KEY}`
        );
        const statsData = await stats.json();

        debug.push(`Статистика видео items: ${statsData.items?.length || 0}`);
        statsData.items?.forEach((v, i) => {
            debug.push(`${i+1}. ${v.snippet.title} | views: ${v.statistics.viewCount}`);
            allVideos.push({
                id: v.id,
                title: v.snippet.title,
                views: parseInt(v.statistics.viewCount),
                publishedAt: v.snippet.publishedAt
            });
        });
    }

    debug.push(`Всего видео в allVideos: ${allVideos.length}`);

    const map = {};
    allVideos.forEach(v => {
        const hours = (Date.now() - new Date(v.publishedAt)) / 3600000;
        const score = v.views / Math.max(hours, 1);

        extractCandidates(v.title).forEach(name => {
            debug.push(`Слово для топа: ${name}`);
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

    const top = Object.entries(map)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5);

    debug.push("=== Топ 5 слов ===");
    top.forEach(([word, info]) => debug.push(`${word} — ${Math.round(info.score)}`));

    // Возвращаем и дебаг, и топ
    res.status(200).json({
        debug,
        top
    });
}
