const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const preview = read('.github/workflows/preview.yml');
const standalone = read('.github/workflows/build-standalone.yml');
const installCommand = 'npm ci --prefix tests --ignore-scripts --no-audit --no-fund';

function steps(workflow) {
  return workflow.split(/(?=^[ ]+- name: )/m).slice(1).map(step => { const indent = step.match(/^ */)[0].length; return step.split('\n').map(line => line.slice(indent)).join('\n').trimEnd(); });
}

test('preview installs the pinned test package after Node setup and before repository verification', () => {
  const previewSteps = steps(preview);
  const expectedInstall = '- name: Install pinned test-only dependencies\n  run: ' + installCommand;
  assert.equal(previewSteps.filter(step => step === expectedInstall).length, 1,
    'Preview must install pinned test-only dependencies unconditionally before running jsdom regressions');
  assert.ok(steps(standalone).includes(expectedInstall), 'Preview and standalone use the same safe install step');

  const ordered = [
    'Setup Node.js',
    'Install pinned test-only dependencies',
    'Validate PowerShell syntax and encoding',
    'Build and verify standalone HTML',
    'Upload static preview site'
  ].map(name => previewSteps.findIndex(step => step.startsWith('- name: ' + name + '\n')));
  for (let index = 0; index < ordered.length; index++) {
    assert.ok(ordered[index] >= 0, 'Required preview step is present');
    if (index) assert.ok(ordered[index - 1] < ordered[index], 'Node, install, preflight, build, then static artifact');
  }
  assert.match(previewSteps[ordered[0]], /\n    node-version: 24(?:\n|$)/);
  assert.match(previewSteps[ordered[3]], /\n  run: \.\/scripts\/check-repository\.ps1$/);
});

test('preview keeps its same-repository PR gate and existing permission boundary', () => {
  assert.match(preview, /^[\'"]?on[\'"]?:\n  pull_request:\n    branches:\n\s+- main\n/m);
  assert.doesNotMatch(preview, /pull_request_target/);
  assert.equal(preview.match(/^permissions:\n(?:  [^\n]+\n)+/m)?.[0],
    'permissions:\n  contents: read\n');
  assert.match(preview, /^    if: github\.event\.pull_request\.head\.repo\.full_name == github\.repository$/m);
  const build = preview.indexOf('run: ./scripts/check-repository.ps1');
  assert.ok(build >= 0);
  assert.doesNotMatch(preview, /secrets\.|GH_TOKEN:|CLOUDFLARE_API_TOKEN:/,
    'Test installation and verification do not receive deployment credentials');
});

test('jsdom stays pinned in the test lock and outside runtime dependencies', () => {
  const manifest = JSON.parse(read('tests/package.json'));
  const lock = JSON.parse(read('tests/package-lock.json'));
  assert.equal(manifest.private, true);
  assert.deepEqual(manifest.devDependencies, { jsdom: '26.1.0' });
  assert.deepEqual(lock.packages[''].devDependencies, manifest.devDependencies);
  assert.equal(lock.packages['node_modules/jsdom'].version, '26.1.0');
  assert.equal(lock.packages['node_modules/jsdom'].dev, true);
  assert.equal(manifest.dependencies, undefined);
  assert.deepEqual(JSON.parse(read('dependencies.json')).dependencies, []);
  assert.deepEqual(JSON.parse(read('dependencies.lock.json')).dependencies, []);
});

test('the workflow regression triggers standalone validation with an exact-head artifact name', () => {
  assert.match(standalone, /^      - "tests\/\*\*"$/m);
  assert.match(standalone, /^          name: standalone-html-\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}$/m);
  assert.equal(JSON.parse(read('tests/package.json')).scripts.test, 'node --test *.test.cjs');
});
