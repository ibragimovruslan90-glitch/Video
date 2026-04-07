export default async function handler(req, res) {
    const API_KEY = process.env.YOUTUBE_API_KEY;

    // Параметр для поиска видео за последние 2 дня
    const publishedAfter = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const queries = [
        "роблокс новые карты",
        "роблокс симулятор",
        "roblox trending maps",
        "роблокс хоррор"
    ];

    // Расширенный список стоп-слов (мусорные слова из заголовков)
    const stopWords = new Set([
        "я","в","на","и","с","это","как","все","меня",
        "roblox","роблокс","игра","карта","игры","стрим",
        "прохождение", "обнова", "обновление", "код", "коды",
        "чит", "читы", "взломал", "купил", "чек", "топ"
    ]);

    function extractCandidates(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\sа-яА-ЯЁё]/g, " ") // Заменяем символы на пробелы
            .split(/\s+/)
            .filter(w => 
                w.length > 3 && // Ищем слова длиннее 3 символов
                !stopWords.has(w) && 
                !/^\d+$/.test(w) // Игнорируем просто числа
            );
    }

    let allVideos = [];
    let debug = [];

    try {
        for (let q of queries) {
            // Используем relevance вместо date для поиска хайповых видео
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&maxResults=15&type=video&order=relevance&publishedAfter=${publishedAfter}&regionCode=RU&key=${API_KEY}`;
            
            const search = await fetch(url);
            const data = await search.json();

            if (data.error) {
                debug.push(`Ошибка API: ${data.error.message}`);
                continue;
            }

            const ids = data.items?.map(i => i.id.videoId).join(",");
            if (!ids) continue;

            const statsResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${API_KEY}`
            );
            const statsData = await statsResponse.json();

            statsData.items?.forEach(v => {
                allVideos.push({
                    id: v.id,
                    title: v.snippet.title,
                    views: parseInt(v.statistics.viewCount || 0),
                    publishedAt: v.snippet.publishedAt // ИСПРАВЛЕНО: v.snippet.publishedAt
                });
            });
        }

        const mapNames = {};
        allVideos.forEach(v => {
            const hours = (Date.now() - new Date(v.publishedAt)) / 3600000;
            const score = v.views / Math.max(hours, 1); // Оценка: просмотры в час

            const words = extractCandidates(v.title);
            words.forEach(word => {
                if (!mapNames[word]) mapNames[word] = { score: 0, count: 0, examples: [] };
                mapNames[word].score += score;
                mapNames[word].count += 1;
                if (mapNames[word].examples.length < 2) {
                    mapNames[word].examples.push(v.title);
                }
            });
        });

        // Сортируем по весу и берем топ-10
        const top = Object.entries(mapNames)
            .filter(([_, info]) => info.count > 1) // Слово должно встретиться минимум в 2 заголовках
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, 10)
            .map(([name, info]) => ({
                name,
                popularityScore: Math.round(info.score),
                mentions: info.count,
                titles: info.examples
            }));

        res.status(200).json({
            success: true,
            top
        });

    } catch (err) {
        res.status(500).json({ error: err.message, debug });
    }
}
