const axios = require('axios');

async function test() {
    const url = 'https://images.search.yahoo.com/search/images?p=Travesseiro+NASA';
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const html = response.data;
        // Yahoo image urls usually look like src='https://tse2.mm.bing.net/th?id=OIP....'
        const matches = [...html.matchAll(/src='(https:\/\/tse[0-9]\.mm\.bing\.net\/th\?id=[^']+)'/gi)].map(m => m[1]);
        console.log('Found:', matches.length);
        console.log('First:', matches[0]);
    } catch (e) {
        console.error(e.message);
    }
}
test();
