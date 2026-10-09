const { execFileSync } = require('node:child_process');
const inventory = require('./local-inventory.json');
const failures = [];
const path = require('node:path');
const fs = require('node:fs');
const marketplace = path.join(process.env.HOME, '.local/share/para-po-plugins');
fs.mkdirSync(path.join(marketplace, '.agents/plugins'), { recursive: true });
execFileSync('tar', ['-xzf', '.devcontainer/codex-plugins.tar.gz', '-C', marketplace]);
fs.copyFileSync('.devcontainer/codex-marketplace.json', path.join(marketplace, '.agents/plugins/marketplace.json'));
function run(command, args) {
  try { execFileSync(command, args, { stdio: 'inherit', timeout: 180000 }); }
  catch { failures.push([command, ...args].join(' ')); }
}
for (const source of inventory.claudeMarketplaces) run('claude', ['plugin', 'marketplace', 'add', source]);
for (const plugin of inventory.claudePlugins) run('claude', ['plugin', 'install', plugin]);
run('codex', ['plugin', 'marketplace', 'add', marketplace]);
for (const plugin of inventory.codexPlugins) run('codex', ['plugin', 'add', `${plugin}@para-po-local`]);
fs.writeFileSync('.devcontainer/plugin-install-results.json', JSON.stringify({ failures }, null, 2));
if (failures.length) {
  console.error('Plugins requiring authentication or manual retry:', failures);
  process.exitCode = 1;
}
