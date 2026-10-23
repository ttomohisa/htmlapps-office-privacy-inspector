const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(process.env.OFFICE_TEST_HTML || path.join(__dirname, '../src/index.template.html'), 'utf8');
const helpStart = html.lastIndexOf('<dialog', html.indexOf('id="helpDialog"'));
const help = html.slice(helpStart, html.indexOf('</dialog>', helpStart));
test('only the informational page footer hides at the existing phone breakpoint', () => {
  assert.ok(html.includes('@media (max-width: 720px) { body > footer { display: none; } }'));
});
test('all existing metadata stays unique and belongs to the quiet final Help disclosure', () => {
  for (const id of ['buildVersion', 'builtAt', 'dependencyCount']) {
    assert.equal(html.split('id="' + id + '"').length - 1, 1, id + ' unique');
    assert.ok(help.includes('id="' + id + '"'), id + ' in Help');
  }
  assert.match(help, /class="[^"]*help-build[^"]*"[\s\S]*<\/details>\s*(?:<\/section>\s*)?<\/div>\s*(?:<\/div>\s*)?$/);
});
test('keyboard activation inside Help cannot trigger backdrop dismissal', () => {
  assert.match(html, /helpDialog\.addEventListener\('click',\s*event\s*=>\s*\{\s*if\s*\(event\.target\s*!==\s*helpDialog\)\s*return;/);
});
test('the existing Japanese and English privacy badge remains canonical', () => {
  assert.match(html, /localBadge:\s*'完全ローカル処理'/);
  assert.match(html, /localBadge:\s*'Fully local processing'/);
});
