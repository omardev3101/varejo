const fs = require('fs');
let content = fs.readFileSync('c:/nodejs/varejo/frontend/src/pages/POSPage.jsx', 'utf8');

// Remove PBM summary
content = content.replace(/\{pbmAuth && \([\s\S]*?\}\)\s*<div className="summary-row">/g, '<div className="summary-row">');

// Remove PBM modal
content = content.replace(/\{isPbmModalOpen && \([\s\S]*?\}\)\s*\{lastSale && \(/g, '{lastSale && (');

fs.writeFileSync('c:/nodejs/varejo/frontend/src/pages/POSPage.jsx', content, 'utf8');
console.log('POSPage updated again.');
