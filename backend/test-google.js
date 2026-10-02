const axios = require('axios');
const fs = require('fs');

async function test() {
    const url = 'https://www.google.com/search?q=Travesseiro+NASA&tbm=isch';
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        fs.writeFileSync('google.html', response.data);
        console.log('Saved google.html');
    } catch (e) {
        console.error(e.message);
    }
}
test();
