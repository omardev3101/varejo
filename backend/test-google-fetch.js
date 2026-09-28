const axios = require('axios');

async function searchDuckDuckGoImages(query) {
    try {
        const searchQuery = `${query} produto`;
        // Step 1: Fetch vqd token
        const tokenRes = await axios.get(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&t=h_&iax=images&ia=images`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const vqdMatch = tokenRes.data.match(/vqd="([^"]+)"/) || tokenRes.data.match(/vqd=([\d-]+)/);
        if (!vqdMatch) {
            console.log('No VQD token found');
            return [];
        }

        const vqd = vqdMatch[1];
        console.log('Found VQD Token:', vqd);

        // Step 2: Fetch JSON images list
        const imgRes = await axios.get(`https://duckduckgo.com/i.js?q=${encodeURIComponent(searchQuery)}&o=json&vqd=${vqd}&f=,,,&p=1`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://duckduckgo.com/'
            }
        });

        const results = (imgRes.data.results || []).map(r => ({
            title: r.title,
            image: r.image,
            thumbnail: r.thumbnail
        }));

        console.log(`[DDG Web Images] [${query}] -> Found ${results.length} images:`);
        console.log(results.slice(0, 5));
        return results;
    } catch (err) {
        console.error('DDG Fetch Error:', err.message);
        return [];
    }
}

searchDuckDuckGoImages('Neocopan Composto');
