const axios = require('axios');

async function test() {
    const url = 'https://www.google.com.br/search?q=Travesseiro+NASA&tbm=isch';
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        const html = response.data;
        // Try to match thumbnail images
        const matches = [...html.matchAll(/(https:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=tbn:[^"'\s\\]+)/gi)].map(m => m[1]);
        console.log('Found:', matches.length);
        if (matches.length > 0) console.log('First:', matches[0]);
    } catch (e) {
        console.error(e.message);
    }
}
test();
