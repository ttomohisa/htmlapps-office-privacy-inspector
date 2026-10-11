const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readWorkflow = name => fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8').replace(/\r\n/g, '\n');
const pages = readWorkflow('deploy-pages.yml');
const standalone = readWorkflow('build-standalone.yml');

function steps(workflow) {
  return workflow.split(/(?=^      - name: )/m).slice(1).map(step => step.trimEnd());
}

test('Pages provisions Node 24 and pinned test dependencies before standalone verification', () => {
  const buildSteps = steps(pages.split(/^  deploy:/m)[0]);
  const expectedNode = '      - name: Setup Node.js for regression tests\n        uses: actions/setup-node@v6\n        with:\n          node-version: 24';
  const expectedInstall = '      - name: Install pinned test-only dependencies\n        run: npm ci --prefix tests --ignore-scripts --no-audit --no-fund';
  for (const expected of [expectedNode, expectedInstall]) {
    assert.equal(buildSteps.filter(step => step === expected).length, 1,
      'Pages must provision Node 24 and locked test dependencies unconditionally before jsdom regressions');
    assert.ok(steps(standalone).includes(expected), 'Pages uses the same setup as standalone validation');
  }
  const ordered = [
    'Checkout repository',
    'Setup Node.js for regression tests',
    'Install pinned test-only dependencies',
    'Validate PowerShell syntax and encoding',
    'Build and verify standalone HTML',
    'Check whether GitHub Pages is enabled'
  ].map(name => buildSteps.findIndex(step => step.startsWith('      - name: ' + name + '\n')));
  for (let index = 0; index < ordered.length; index++) {
    assert.ok(ordered[index] >= 0, 'Required Pages build step is present');
    if (index) assert.ok(ordered[index - 1] < ordered[index], 'Checkout, Node, install, preflight, build, then Pages status');
  }
  assert.match(buildSteps[ordered[4]], /\n        run: \.\/scripts\/check-repository\.ps1$/);
  assert.doesNotMatch(buildSteps.slice(0, ordered[5]).join('\n'), /secrets\.|GH_TOKEN:/,
    'Setup and validation do not receive deployment credentials');
});

test('Pages retains its main-push/manual triggers and existing permission boundary', () => {
  assert.match(pages, /^on:\n  workflow_dispatch:\n  push:\n    branches:\n      - main\n/m);
  assert.doesNotMatch(pages, /^  pull_request(?:_target)?:/m);
  assert.equal(pages.match(/^permissions:\n(?:  [^\n]+\n)+/m)?.[0],
    'permissions:\n  contents: read\n  pages: write\n  id-token: write\n');
  assert.doesNotMatch(pages, /^    permissions:/m, 'Jobs do not override the existing permission boundary');
  assert.match(pages, /^concurrency:\n  group: github-pages\n  cancel-in-progress: true$/m);
});

test('Pages deployment remains gated on the existing Pages-ready build result', () => {
  assert.match(pages, /^      pages-ready: \$\{\{ steps\.pages-status\.outputs\.ready \}\}$/m);
  assert.match(pages, /      - name: Configure GitHub Pages\n        if: steps\.pages-status\.outputs\.ready == 'true'\n        uses: actions\/configure-pages@v6/);
  assert.match(pages, /      - name: Upload GitHub Pages artifact\n        if: steps\.pages-status\.outputs\.ready == 'true'\n        uses: actions\/upload-pages-artifact@v5\n        with:\n          path: dist/);
  assert.match(pages, /^  deploy:\n    if: needs\.build\.outputs\.pages-ready == 'true'\n    needs: build\n/m);
  assert.match(pages, /^    environment:\n      name: github-pages\n      url: \$\{\{ steps\.deployment\.outputs\.page_url \}\}$/m);
  assert.match(pages, /      - name: Deploy to GitHub Pages\n        id: deployment\n        uses: actions\/deploy-pages@v5/);
});
