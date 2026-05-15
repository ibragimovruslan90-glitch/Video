const STOP_WORDS = new Set([
“в”,“на”,“с”,“по”,“за”,“из”,“от”,“до”,“к”,“и”,“а”,“но”,“не”,“это”,“как”,“что”,
“все”,“или”,“уже”,“был”,“так”,“его”,“её”,“их”,“мне”,“мы”,“вы”,“он”,“она”,“они”,
“то”,“же”,“еще”,“ещё”,“бы”,“для”,“при”,“без”,“под”,“над”,“через”,“про”,“который”,
“которые”,“которая”,“который”,“была”,“было”,“будет”,“можно”,“нужно”,“надо”,“сейчас”,
“очень”,“когда”,“если”,“после”,“перед”,“между”,“против”,“весь”,“вся”,“всё”,“всех”,
“этот”,“эта”,“эти”,“своё”,“своя”,“свои”,“свой”,“тоже”,“чтобы”,“потому”,“поэтому”,
“здесь”,“там”,“тут”,“вот”,“ли”,“да”,“нет”,“меня”,“тебя”,“себя”,“кто”,“где”,“чем”,
“один”,“два”,“три”,“четыре”,“пять”,“шесть”,“семь”,“восемь”,“девять”,“десять”,
“первый”,“второй”,“новый”,“новая”,“новые”,“самый”,“самая”,“самые”,“лучший”,“лучшая”,
“я”,“мой”,“моя”,“мои”,“твой”,“твоя”,“твои”,“наш”,“наша”,“наши”,“ваш”,“ваша”,“ваши”,
“об”,“обо”,“во”,“со”,“ко”,“ото”,“изо”,“надо”,“подо”,“передо”,“нибудь”,“либо”,“каждый”,
“каждая”,“любой”,“любая”,“целый”,“целая”,“всего”,“самого”,“большой”,“большая”,“много”,
“мало”,“более”,“менее”,“такой”,“такая”,“такие”,“другой”,“другая”,“другие”,“только”,
“просто”,“именно”,“видео”,”#shorts”,“shorts”,“youtube”,“ютуб”,“смотреть”,“этого”,“этой”
]);

function extractThemes(items) {
const wordCount = {};
const wordVideos = {};


items.forEach(v => {
    const title = v.snippet.title;
    const views = parseInt(v.statistics.viewCount || 0);

    // Убираем эмодзи и спецсимволы, приводим к нижнему регистру
    const words = title
        .toLowerCase()
        .replace(/[^\wа-яёa-z0-9\s]/gi, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

    const seen = new Set();
    words.forEach(w => {
        if (seen.has(w)) return;
        seen.add(w);
        wordCount[w] = (wordCount[w] || 0) + 1;
        if (!wordVideos[w]) wordVideos[w] = [];
        wordVideos[w].push({ title, views, id: v.id });
    });
});

// Берём слова которые встречаются хотя бы в 2 видео
const themes = Object.entries(wordCount)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => {
        const videos = wordVideos[word]
            .sort((a, b) => b.views - a.views)
            .slice(0, 3);
        const totalViews = wordVideos[word].reduce((s, v) => s + v.views, 0);
        return {
            keyword: word,
            count,
            totalViews: Math.round(totalViews / 1000000 * 10) / 10,
            topVideos: videos.map(v => ({
                title: v.title,
                views: Math.round(v.views / 1000),
                url: "https://youtube.com/watch?v=" + v.id
            }))
        };
    });

return themes;


}

export default async function handler(req, res) {
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;


try {
    const ytUrl = "https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=RU&relevanceLanguage=ru&maxResults=50&key=" + YOUTUBE_KEY;
    const ytRes = await fetch(ytUrl);
    const ytData = await ytRes.json();

    if (!ytData.items) {
        return res.status(500).json({ error: ytData.error ? ytData.error.message : "YouTube API error" });
    }

    const themes = extractThemes(ytData.items);

    return res.status(200).json({
        success: true,
        themes,
        videoCount: ytData.items.length
    });

} catch (err) {
    return res.status(500).json({ error: err.message });
}


}