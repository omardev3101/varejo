const axios = require('axios');

async function searchGoogleOnly(query) {
    try {
        const searchQuery = `${query} produto embalagem`;
        const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch&safe=active`;
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8'
            },
            timeout: 5000
        });

        const html = response.data || '';

        // Extract Google Mobile gstatic images
        const gstaticUrls = [...html.matchAll(/https:\/\/encrypted-tbn[0-9]\.gstatic\.com\/images\?q=[^"'\s\\&;]+/gi)].map(m => m[0]);
        const imgUrls = [...html.matchAll(/src="(https?:\/\/[^"]+)"/gi)].map(m => m[1]);

        const allGoogleImages = [...new Set([...gstaticUrls, ...imgUrls])].filter(u => 
            !u.includes('google.com/favicon') && 
            !u.includes('logo') && 
            !u.includes('avatar')
        );

        console.log(`[Google Mobile SafeSearch] [${query}] -> Found ${allGoogleImages.length} images:`);
        console.log(allGoogleImages.slice(0, 5));
        return allGoogleImages;
    } catch (error) {
        console.error('Google Search Error:', error.message);
        return [];
    }
}

async function run() {
    await searchGoogleOnly('Rexona Desodorante');
    await searchGoogleOnly('Neocopan Composto');
    await searchGoogleOnly('Acetilcisteina Xarope');
}

run();
