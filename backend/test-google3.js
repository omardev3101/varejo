const axios = require('axios');

async function test() {
    const url = 'https://www.google.com/search?q=Travesseiro+NASA&tbm=isch';
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            }
        });
        const html = response.data;
        const matches = [...html.matchAll(/src="(https:\/\/[^"]+)"/gi)].map(m => m[1]);
        console.log('Found:', matches.length);
        if (matches.length > 0) console.log('First:', matches[0]);
    } catch (e) {
        console.error(e.message);
    }
}
test();
