export default async function handler(req, res) {
const API_KEY = process.env.YOUTUBE_API_KEY;


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