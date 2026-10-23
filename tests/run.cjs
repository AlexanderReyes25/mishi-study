const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
let failed = false;
for (const folder of fs.readdirSync(__dirname, { withFileTypes: true }).filter(d => d.isDirectory())) {
  const script = path.join(__dirname, folder.name, 'run.cjs');
  if (!fs.existsSync(script)) continue;
  console.log(`\n${folder.name}`);
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
