const fs = require('fs');
let content = fs.readFileSync('c:/nodejs/varejo/frontend/src/pages/TenantsPage.jsx', 'utf8');

// Remove initial state
content = content.replace(/\s*\/\/\s*PBM\s*pbm_active: false, pbm_provider: '', pbm_username: '', pbm_password: '',/g, '');

// Remove from edit form data
content = content.replace(/pbm_active: tenant\.pbm_active \|\| false,\s*pbm_provider: tenant\.pbm_provider \|\| '',\s*pbm_username: tenant\.pbm_username \|\| '',\s*pbm_password: tenant\.pbm_password \|\| '',/g, '');

// Remove from openModal default
content = content.replace(/pbm_active: false, pbm_provider: '', pbm_username: '', pbm_password: '',/g, '');

// Remove tab button
content = content.replace(/<button className=\{\`tab-btn \$\{activeTab === 'pbm' \? 'active' : ''\}\`\} type="button" onClick=\{\(\) => setActiveTab\('pbm'\)\}>PBM \/ Convênios<\/button>/g, '');

// Remove PBM panel block
content = content.replace(/\{activeTab === 'pbm' && \([\s\S]*?\}\)\}/g, '');

fs.writeFileSync('c:/nodejs/varejo/frontend/src/pages/TenantsPage.jsx', content, 'utf8');
console.log('TenantsPage updated.');
