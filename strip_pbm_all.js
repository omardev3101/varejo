const fs = require('fs');

// TenantsPage
let tenants = fs.readFileSync('c:/nodejs/varejo/frontend/src/pages/TenantsPage.jsx', 'utf8');
tenants = tenants.replace(/\{activeTab === 'pbm' && \([\s\S]*?\}\)\}/, '');
fs.writeFileSync('c:/nodejs/varejo/frontend/src/pages/TenantsPage.jsx', tenants, 'utf8');

// Sidebar
let sidebar = fs.readFileSync('c:/nodejs/varejo/frontend/src/components/Sidebar.jsx', 'utf8');
sidebar = sidebar.replace(/<button[\s\S]*?className=\{`sub-nav-item \$\{currentPage === 'pbm_config' \? 'active' : ''\}`\}[\s\S]*?onClick=\{\(\) => onNavigate\('pbm_config'\)\}[\s\S]*?>[\s\S]*?<ClipboardList size=\{16\} \/>[\s\S]*?<span>PBM \/ Convênios<\/span>[\s\S]*?<\/button>/, '');
fs.writeFileSync('c:/nodejs/varejo/frontend/src/components/Sidebar.jsx', sidebar, 'utf8');

// FiscalReceipt
let receipt = fs.readFileSync('c:/nodejs/varejo/frontend/src/components/FiscalReceipt.jsx', 'utf8');
receipt = receipt.replace(/,\s*'pbm': 'PBM \/ Convênio'/g, '');
receipt = receipt.replace(/\{data\.pbm_transaction_id && \([\s\S]*?\}\)/, '');
fs.writeFileSync('c:/nodejs/varejo/frontend/src/components/FiscalReceipt.jsx', receipt, 'utf8');

console.log('Done cleaning PBM references.');
