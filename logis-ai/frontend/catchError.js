import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
    fs.rmSync(path.join(process.cwd(), 'node_modules', '.vite'), { recursive: true, force: true });
} catch (e) { }

exec('npx vite build', (err, stdout, stderr) => {
    fs.writeFileSync('error_output.json', JSON.stringify({
        stdout: stdout,
        stderr: stderr,
        errMessage: err ? err.message : null
    }, null, 2));
});
