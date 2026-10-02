const axios = require('axios');

async function test() {
    const url = 'https://www.bing.com/images/search?q=Travesseiro+NASA';
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = response.data;
        const matches = [...html.matchAll(/murl&quot;:&quot;(https:\/\/[^&"]+)&quot;/gi)].map(m => m[1]);
        console.log('Found full images:', matches.length);
        if (matches.length > 0) console.log('First:', matches[0]);
    } catch (e) {
        console.error(e.message);
    }
}
test();
