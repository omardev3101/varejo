const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/StorefrontPage.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Remove GARAGES and CIRCULAR_CATEGORIES
content = content.replace(/const GARAGES = \[[\s\S]*?\];/g, '');
content = content.replace(/const CIRCULAR_CATEGORIES = \[[\s\S]*?\];/g, '');

// 2. State variables removal/change
content = content.replace(/const \[regGarage, setRegGarage\] = useState\(GARAGES\[0\]\);/g, "const [regGarage, setRegGarage] = useState('');");
content = content.replace(/const \[selectedCircleCat, setSelectedCircleCat\] = useState\('all'\);/g, "");
content = content.replace(/const \[filterFarmaciaPopular, setFilterFarmaciaPopular\] = useState\(false\);/g, "");
content = content.replace(/const \[selectedGarageHeader, setSelectedGarageHeader\] = useState\(GARAGES\[0\]\);/g, "");

content = content.replace(/buyerGarage \|\| selectedGarageHeader/g, "buyerGarage || 'Geral'");
content = content.replace(/const \[buyerGarage, setBuyerGarage\] = useState\(GARAGES\[0\]\);/g, "const [buyerGarage, setBuyerGarage] = useState('Geral');");

// 3. Remove Popular and Matches Filter Logic
content = content.replace(/const POPULAR_KEYWORDS = \[[\s\S]*?\];/g, '');
content = content.replace(/const isPopularProduct = \([\s\S]*?};/g, '');
content = content.replace(/const matchesFilterCategory = \([\s\S]*?};/g, '');

// 4. Update Filter logic
const newFilter = `    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                              (p.barcode && p.barcode.includes(search)) ||
                              (p.active_principle && p.active_principle.toLowerCase().includes(search.toLowerCase()));
        
        const matchesCategory = selectedCategory === 'all' || (p.category && (p.category.name === selectedCategory || p.category === selectedCategory));

        return matchesSearch && matchesCategory;
    });`;
content = content.replace(/    const filteredProducts = products\.filter\([\s\S]*?    \}\);/g, newFilter);

// 5. Header / Nav Bar text
content = content.replace(
    /<span>\{storeConfig\?\.announcement_text \|\| '⚡ Entrega Expressa para Garagens • Desconto Exclusivo em Folha para Sócios do Sindimotoristas • 100% Seguro'\}<\/span>/g,
    "<span>{storeConfig?.announcement_text || '⚡ Entrega Rápida • Segurança Garantida'}</span>"
);
content = content.replace(
    /<h2>\{storeConfig\?\.store_name \? storeConfig\.store_name\.split\('-'\)\[0\] : 'VarejoPro'\} <span className="highlight-tag">Drogaria<\/span><\/h2>/g,
    "<h2>{storeConfig?.store_name ? storeConfig.store_name.split('-')[0] : 'VarejoPro'}</h2>"
);

// 6. Remove Location Selector Box
content = content.replace(/\{\/\* Delivery Location Selector \*\/\}\s*<div className="location-selector-box">[\s\S]*?<\/div>\s*<\/div>/g, '');

// 7. Ribbon bar clean up (remove CIRCULAR_CATEGORIES render)
content = content.replace(/\{CIRCULAR_CATEGORIES\.filter[\s\S]*?\}\)\}/g, '');
content = content.replace(/setSelectedCircleCat\('all'\);/g, '');
content = content.replace(/setFilterFarmaciaPopular\(false\);/g, '');

// 8. Remove Hero Banners Fallback completely or make it generic
const genericBanners = `<>
                            <div className="hero-banner-card card-emerald">
                                <div className="card-badge"><Sparkles size={14} /> Ofertas Especiais</div>
                                <h3>Descontos Exclusivos</h3>
                                <p>Aproveite os melhores preços do mercado na nossa loja virtual.</p>
                                <button className="btn-banner" onClick={() => { setIsCartOpen(true); }}>
                                    Ver Produtos &rarr;
                                </button>
                            </div>

                            <div className="hero-banner-card card-blue">
                                <div className="card-badge"><Truck size={14} /> Entrega Rápida</div>
                                <h3>Receba no Conforto da sua Casa</h3>
                                <p>Logística eficiente para você não perder tempo.</p>
                                <button className="btn-banner" onClick={() => setIsCartOpen(true)}>
                                    Comprar Agora &rarr;
                                </button>
                            </div>
                        </>`;
content = content.replace(/<>\s*<div className="hero-banner-card card-emerald">[\s\S]*?<\/div>\s*<\/div>\s*<\/>/, genericBanners);

// 9. Remove Circular Categories section
content = content.replace(/\{\/\* Circular Category Bubbles \(Drogasil Style\) \*\/\}\s*<section className="circular-categories-section">[\s\S]*?<\/section>/g, '');

// 10. Update Catalog Header text
content = content.replace(/\{filterFarmaciaPopular \? 'Produtos Desconto Promocional' : 'Catálogo de Produtos & Saúde'\}/g, "'Catálogo de Produtos'");

// 11. Remove Badges logic in Product Card
content = content.replace(/\{isPopularProduct\(product\) \? \([\s\S]*? DESCONTO SÓCIO<\/span>\s*\)\}/g, '');

// 12. Checkout Form adjustments (remove Garage selects)
content = content.replace(/<div className="form-group mb-2">\s*<label>Garagem de Entrega<\/label>\s*<select value=\{buyerGarage\}[\s\S]*?<\/select>\s*<\/div>/g, '');
content = content.replace(/<p>🚚 <strong>Garagem de Destino:<\/strong> \{orderResult\.garage\}<\/p>/g, '');
content = content.replace(/<span className="socio-garage">Garagem: \{socio\.garage\}<\/span>/g, '');
content = content.replace(/<div className="form-group">\s*<label>Garagem de Pertencimento<\/label>\s*<select value=\{regGarage\}[\s\S]*?<\/select>\s*<\/div>/g, '');

// 13. Footer
content = content.replace(/<h4>VarejoPro Drogaria<\/h4>/g, '<h4>VarejoPro Online</h4>');
content = content.replace(/<p>A loja oficial dos sócios e colaboradores do transporte\. Produtos com descontos exclusivos e entrega direta nas garagens\.<\/p>/g, '<p>Sua loja oficial com descontos exclusivos e entrega rápida.</p>');
content = content.replace(/© 2026 VarejoPro Drogaria/g, '© 2026 VarejoPro');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('File patched successfully.');
