const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\nodejs\\varejo';

// More files to delete
const filesToDelete = [
    'backend/src/routes/pbm.routes.js',
    'backend/src/models/PBMTransaction.js',
    'backend/src/services/PortalDrogariaClient.js',
    'backend/src/controllers/SNGPCController.js',
    'backend/src/routes/sngpc.routes.js',
    'frontend/src/pages/SNGPCPage.jsx',
    'backend/src/controllers/PBMController.js'
];

filesToDelete.forEach(relPath => {
    const fullPath = path.join(projectRoot, relPath);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('Deleted', relPath);
    }
});

// Update index.js to remove PBM models
const indexJsPath = path.join(projectRoot, 'backend/src/models/index.js');
if (fs.existsSync(indexJsPath)) {
    let content = fs.readFileSync(indexJsPath, 'utf8');
    content = content.replace(/const PBMConfig = require\('\.\/PBMConfig'\);\n?/g, '');
    content = content.replace(/const PBMTransaction = require\('\.\/PBMTransaction'\);\n?/g, '');
    content = content.replace(/const Prescription = require\('\.\/Prescription'\);\n?/g, '');
    content = content.replace(/Tenant\.hasMany\(PBMConfig.*\n?/g, '');
    content = content.replace(/PBMConfig\.belongsTo\(Tenant.*\n?/g, '');
    content = content.replace(/Tenant\.hasMany\(PBMTransaction.*\n?/g, '');
    content = content.replace(/PBMTransaction\.belongsTo\(Tenant.*\n?/g, '');
    content = content.replace(/Sale\.hasMany\(PBMTransaction.*\n?/g, '');
    content = content.replace(/PBMTransaction\.belongsTo\(Sale.*\n?/g, '');
    content = content.replace(/Tenant\.hasMany\(Prescription.*\n?/g, '');
    content = content.replace(/Prescription\.belongsTo\(Tenant.*\n?/g, '');
    content = content.replace(/Sale\.hasMany\(Prescription.*\n?/g, '');
    content = content.replace(/Prescription\.belongsTo\(Sale.*\n?/g, '');
    content = content.replace(/PBMConfig,\n?/g, '');
    content = content.replace(/PBMTransaction,\n?/g, '');
    content = content.replace(/Prescription,\n?/g, '');
    fs.writeFileSync(indexJsPath, content, 'utf8');
    console.log('Updated', indexJsPath);
}

const appJsPath = path.join(projectRoot, 'backend/src/app.js');
if (fs.existsSync(appJsPath)) {
    let content = fs.readFileSync(appJsPath, 'utf8');
    content = content.replace(/app\.use\('\/api\/pbm', require\('\.\/routes\/pbm\.routes'\)\);\n?/g, '');
    content = content.replace(/app\.use\('\/api\/sngpc', require\('\.\/routes\/sngpc\.routes'\)\);\n?/g, '');
    content = content.replace(/app\.use\('\/api\/prescriptions', require\('\.\/routes\/prescriptionRoutes'\)\);\n?/g, '');
    fs.writeFileSync(appJsPath, content, 'utf8');
    console.log('Updated', appJsPath);
}

const inventoryCtrlPath = path.join(projectRoot, 'backend/src/controllers/InventoryController.js');
if (fs.existsSync(inventoryCtrlPath)) {
    let content = fs.readFileSync(inventoryCtrlPath, 'utf8');
    content = content.replace(/PBMTransaction, /g, '');
    content = content.replace(/await PBMTransaction\.destroy.*?\n/g, '');
    fs.writeFileSync(inventoryCtrlPath, content, 'utf8');
    console.log('Updated', inventoryCtrlPath);
}
