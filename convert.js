const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\nodejs\\varejo';

// Files to delete
const filesToDelete = [
    'backend/src/services/FarmaciaPopularClient.js',
    'backend/src/models/PBMConfig.js',
    'backend/src/services/PBMService.js',
    'backend/src/controllers/PBMController.js',
    'backend/src/routes/pbmRoutes.js',
    'frontend/src/pages/PBMConfigPage.jsx',
    'backend/seed-higiene.js',
    'backend/clean-sales.js',
    'backend/src/controllers/PrescriptionController.js',
    'backend/src/routes/prescriptionRoutes.js',
    'backend/src/models/Prescription.js'
];

filesToDelete.forEach(relPath => {
    const fullPath = path.join(projectRoot, relPath);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('Deleted', relPath);
    }
});

// Global string replacements
const replacements = [
    { from: /VarejoPro/g, to: 'VarejoPro' },
    { from: /varejo/g, to: 'varejo' },
    { from: /VAREJOPRO/g, to: 'VAREJOPRO' },
    { from: /Desconto Promocional/g, to: 'Desconto Promocional' },
    { from: /promocional/g, to: 'promocional' },
    { from: /produto/g, to: 'produto' },
    { from: /Produto/g, to: 'Produto' },
    { from: /loja/g, to: 'loja' },
    { from: /Loja/g, to: 'Loja' },
    { from: /LOJA/g, to: 'LOJA' },
    { from: /comercial/gi, to: 'comercial' },
    { from: /item/g, to: 'item' },
    { from: /Item/g, to: 'Item' },
    { from: /reference_code/g, to: 'reference_code' },
    { from: /referencia/gi, to: 'referencia' }
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'dist-electron' || file === 'build') continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (stat.isFile()) {
            const ext = path.extname(fullPath);
            if (['.js', '.jsx', '.json', '.html', '.css', '.md', '.txt', '.env.example'].includes(ext)) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let changed = false;
                for (const rep of replacements) {
                    if (content.match(rep.from)) {
                        content = content.replace(rep.from, rep.to);
                        changed = true;
                    }
                }
                if (changed) {
                    fs.writeFileSync(fullPath, content, 'utf8');
                    console.log('Updated', fullPath);
                }
            }
        }
    }
}

processDirectory(path.join(projectRoot, 'backend'));
processDirectory(path.join(projectRoot, 'frontend'));
processDirectory(projectRoot); // for deploy.ps1, etc.
