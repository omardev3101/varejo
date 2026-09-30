const fs = require('fs');

let content = fs.readFileSync('c:/nodejs/varejo/frontend/src/pages/POSPage.jsx', 'utf8');

// 1. Remove states
content = content.replace(/\s*\/\/\s*PBM States[\s\S]*?const \[isSearchingPbm, setIsSearchingPbm\] = useState\(false\);/, '');

// 2. Remove fetchPbmConfigs
content = content.replace(/const fetchPbmConfigs = async \(\) => \{[\s\S]*?\};\s*checkSession\(\);\s*fetchPbmConfigs\(\);/g, 'checkSession();');

// 3. Remove from selectCustomer
content = content.replace(/if \(customer\.cpf\) setPatientCpf\(customer\.cpf\);\s*if \(customer\.cns\) setPatientCns\(customer\.cns\);/g, '');

// 4. Remove calculations and pbm functions
content = content.replace(/const isFarmaciaPopularActive = true;\s*const isVidalinkActive = pbmConfigs\.some\(c => c\.pbm_type === 'vidalink' && c\.active\);\s*/, '');
content = content.replace(/const pbmDiscount = pbmAuth \? pbmAuth\.discountAmount : 0;\s*const total = subtotal - discount - pbmDiscount;/g, 'const total = subtotal - discount;');

content = content.replace(/const handlePbmAuthorize = async \(\) => \{[\s\S]*?setIsPbmAuthorizing\(false\);\s*\}\s*\};\s*/, '');
content = content.replace(/const handleSearchBestPbm = async \(\) => \{[\s\S]*?setIsSearchingPbm\(false\);\s*\}\s*\};\s*/, '');

// 5. Checkout saleData pbmTransactionId
content = content.replace(/discount_amount: discount \+ pbmDiscount,/g, 'discount_amount: discount,');
content = content.replace(/pbm_transaction_id: pbmAuth\?\.transactionId,\s*/g, '');

// 6. Reset states
content = content.replace(/setPbmAuth\(null\);\s*/g, '');

// 7. Sync POST
content = content.replace(/customer_id: sale\.customer_id,\s*pbm_transaction_id: sale\.pbm_transaction_id/g, 'customer_id: sale.customer_id');

// 8. Auto-Sync POST
content = content.replace(/customer_id: sale\.customer_id,\s*pbm_transaction_id: sale\.pbm_transaction_id/g, 'customer_id: sale.customer_id');

// 9. Remove JSX block for pbm-panel
content = content.replace(/<div className="pbm-panel glass"[\s\S]*?<\/div>(\s*)<div className="summary-section">/, '<div className="summary-section">');

// 10. Remove Summary Subsídio PBM
content = content.replace(/\{pbmAuth && \([\s\S]*?\}\)\s*(<div className="summary-row">)/, '$1');

// 11. Remove PBM Modal
content = content.replace(/\{isPbmModalOpen && \([\s\S]*?\}\)\s*(\{lastSale && \()/g, '$1');

fs.writeFileSync('c:/nodejs/varejo/frontend/src/pages/POSPage.jsx', content, 'utf8');
console.log('POSPage updated.');
