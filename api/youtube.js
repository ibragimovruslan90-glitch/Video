export default async function handler(req, res) {
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;


try {
    // Шаг 1: получаем топ трендов YouTube RU
    const ytUrl = "https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=RU&relevanceLanguage=ru&maxResults=50&key=" + YOUTUBE_KEY;
    const ytRes = await fetch(ytUrl);
    const ytData = await ytRes.json();

    if (!ytData.items) {
        return res.status(500).json({ error: ytData.error ? ytData.error.message : "YouTube API error" });
    }

    // Шаг 2: собираем заголовки видео
    const titles = ytData.items.map((v, i) => {
        const views = parseInt(v.statistics.viewCount || 0);
        return (i + 1) + ". " + v.snippet.title + " [" + Math.round(views / 1000) + "K просмотров]";
    }).join("\n");

    // Шаг 3: просим Claude вытащить темы и ключевые слова
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1000,
            messages: [{
                role: "user",
                content: "Вот топ трендовых видео на YouTube Russia прямо сейчас:\n\n" + titles + "\n\nВыдели 8 главных тем и трендов которые прослеживаются в этих видео. Для каждой темы дай: название темы, 3-5 ключевых слова, краткое объяснение почему это популярно.\n\nОтветь ТОЛЬКО валидным JSON без markdown:\n{\"themes\":[{\"topic\":\"Название темы\",\"keywords\":[\"слово1\",\"слово2\"],\"reason\":\"Почему популярно\"}]}"
            }]
        })
    });

    const claudeData = await claudeRes.json();

    if (!claudeData.content || !claudeData.content[0]) {
        return res.status(500).json({ error: "Claude API error", detail: JSON.stringify(claudeData) });
    }

    const rawText = claudeData.content[0].text;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        return res.status(500).json({ error: "JSON not found", raw: rawText });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return res.status(200).json({
        success: true,
        themes: parsed.themes,
        videoCount: ytData.items.length
    });

} catch (err) {
    return res.status(500).json({ error: err.message });
}


}