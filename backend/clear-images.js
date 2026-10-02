const { Product } = require('./src/models');
const { Op } = require('sequelize');

async function clearOldImages() {
    try {
        const result = await Product.update(
            { image_url: null },
            { 
                where: { 
                    image_url: { [Op.like]: '%consultaremedios%' }
                } 
            }
        );
        console.log(`Cleared image_url for ${result[0]} products.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
clearOldImages();
