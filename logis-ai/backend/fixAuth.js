const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    let modified = false;

    if (content.includes('../middleware/auth\'')) {
        content = content.replace(/\.\.\/middleware\/auth'/g, '../middleware/authMiddleware\'');
        modified = true;
    }

    if (content.includes('../middleware/auth\";')) {
        content = content.replace(/\.\.\/middleware\/auth\"/g, '../middleware/authMiddleware\"');
        modified = true;
    }

    if (content.includes('restrictTo')) {
        content = content.replace(/restrictTo/g, 'authorize');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed', file);
    }
});
