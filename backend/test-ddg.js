const axios = require('axios');

async function test() {
    const url = 'https://html.duckduckgo.com/html/?q=Travesseiro+NASA+image';
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        const html = response.data;
        // DDG image src is usually inside a tag like <img class="zcm__images" src="..." /> or similar, or just <a class="image"... href="...">
        const matches = [...html.matchAll(/src="\/\/external-content\.duckduckgo\.com\/iu\/\?u=([^"&]+)/gi)].map(m => decodeURIComponent(m[1]));
        console.log('Found:', matches.length);
        if (matches.length > 0) console.log('First:', matches[0]);
    } catch (e) {
        console.error(e.message);
    }
}
test();
