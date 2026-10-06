const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const release = fs.readFileSync(path.join(root, 'office-privacy-inspector.html'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));

function normalizeBuildValues(html) {
  const icon = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'assets/favicon.svg')).toString('base64');
  return html.replaceAll(icon, '__APP_ICON_DATA_URI__')
    .replace(/^      const (APP_CONFIG|BUILD_MANIFEST|assetBundle) = .*;$/gm, '      const $1 = __BUILD_VALUE__;');
}

test('tracked public root release contains the exact editable application HTML', () => {
  const source = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
  const hash = html => crypto.createHash('sha256').update(normalizeBuildValues(html)).digest('hex');
  assert.equal(hash(release), hash(source), 'Run the default standalone build to refresh the public root release');
});

test('tracked public root release embeds the current app configuration', () => {
  const embedded = release.match(/^      const APP_CONFIG = (.*);$/m);
  assert.ok(embedded, 'Missing root app config');
  assert.deepEqual(JSON.parse(embedded[1]), config);
});
