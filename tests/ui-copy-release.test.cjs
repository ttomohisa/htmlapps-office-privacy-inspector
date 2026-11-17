const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./app-harness.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(process.env.OFFICE_TEST_HTML || path.join(root, 'src/index.template.html'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8');

test('Japanese hero is concise, explanatory and not duplicated above the file picker', t => {
  const a = app({ savedLanguage: 'ja' }); t.after(a.close);
  const d = a.w.document;
  assert.equal(d.querySelector('#heroTitle').textContent, 'Officeファイルの作成者やコメントを確認');
  assert.equal(d.querySelector('.page-intro p[data-i18n="lead"]').textContent, '非表示シートや発表者ノート、外部参照なども調べます。');
  assert.equal(d.querySelector('#emptyState').getAttribute('aria-labelledby'), 'dropTitle');
  assert.equal(d.querySelector('.upload-copy'), null);
  assert.equal(d.querySelector('#uploadTitle'), null);
  assert.ok(d.querySelector('#dropTitle'));
  assert.ok(d.querySelector('#pickFileButton'));
});

test('English hero and upload area follow the same layout and remain accessible', t => {
  const a = app({ savedLanguage: 'en' }); t.after(a.close);
  const d = a.w.document;
  assert.equal(d.querySelector('#heroTitle').textContent, 'Check authors and comments in Office files');
  assert.equal(d.querySelector('.page-intro p[data-i18n="lead"]').textContent, 'Also inspect hidden sheets, speaker notes, and external references.');
  assert.equal(d.querySelector('#emptyState').getAttribute('aria-labelledby'), 'dropTitle');
  assert.equal(d.querySelector('#dropTitle').textContent, 'Drop an Office file here');
  assert.equal(d.querySelector('#pickFileButton span').textContent, 'Choose file');
});

test('drop-zone uses a downward arrow into a tray and does not break the file selector', t => {
  const a = app({ savedLanguage: 'ja' }); t.after(a.close);
  const d = a.w.document;
  const icon = d.querySelector('#dropZone .drop-icon svg');
  assert.ok(icon);
  const paths = [...icon.querySelectorAll('path')].map(p => p.getAttribute('d'));
  assert.ok(paths.includes('M12 3v11'), 'arrow points toward the tray');
  assert.ok(paths.includes('m8 10 4 4 4-4'), 'down-arrow tip');
  assert.ok(paths.includes('M4 16h5l2 3h2l2-3h5v5H4z'), 'drop tray');
  assert.ok(d.querySelector('#fileInput').getAttribute('accept').includes('.pptm'), 'inspection-only macro file formats still selectable');
});

test('the local-processing badge is shown on desktop and hidden at the mobile breakpoint', () => {
  assert.match(html, /    \.local-badge \{ display: inline-flex;/);
  const mobile = html.match(/    @media \(max-width: 720px\) \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(mobile, 'phone breakpoint exists');
  assert.match(mobile, /      \.local-badge \{ display: none; \}/);
  assert.doesNotMatch(html, /(?:#emptyState|#dropZone)[\s\S]{0,200}id="uploadTitle"/);
});

test('Help keeps removal limitations without obsolete v1.0.0 references in either language', t => {
  assert.doesNotMatch(html, /v1\.0\.0/, 'current UI must not describe itself with an outdated version');
  for (const language of ['ja', 'en']) {
    const a = app({ savedLanguage: language }); t.after(a.close);
    const help = a.w.document.querySelector('#helpDialog').textContent;
    assert.doesNotMatch(help, /v1\.0\.0/);
    if (language === 'ja') {
      assert.match(help, /変更履歴、非表示シート、外部参照などは削除しません/);
      assert.match(help, /コメントと発表者ノートは選択した場合だけ削除します/);
    } else {
      assert.match(help, /Tracked changes, hidden sheets, and external references are not removed/);
      assert.match(help, /Comments and speaker notes are removed only when selected/);
    }
  }
});

test('release workflow publishes only verified main versions with write access in its publish job', () => {
  assert.match(workflow, /^on:\n  push:\n    branches:\n      - main\n  workflow_dispatch:/m);
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(workflow, /^  publish:\n    needs: verify\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    permissions:\n      contents: write/m);
  assert.match(workflow, /      - name: Build and verify standalone HTML[\s\S]*?      - name: Run Office privacy regression tests[\s\S]*?      - name: Read validated app version/);
  assert.match(workflow, /      - name: Upload verified release files[\s\S]*?  publish:/);
  assert.match(workflow, /uses: actions\/download-artifact@v8/);
  assert.match(workflow, /gh release view "\$tag"/);
  assert.match(workflow, /Refuse to repoint a pre-existing version tag/);
  assert.match(workflow, /gh release create "\$tag"/);
  assert.match(workflow, /--target "\$RELEASE_SHA"/);
  assert.match(workflow, /--generate-notes/);
  assert.match(workflow, /dist\/index\.self-extract\.html/);
});

test('hero headline stays proportionate on desktop and phone widths', () => {
  assert.match(html, /\.page-intro h1 \{ margin: 0; font-size: clamp\(22px, 2\.5vw, 26px\); line-height: 1\.3; letter-spacing: -\.025em; \}/);
  const phone = html.match(/    @media \(max-width: 720px\) \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(phone, 'phone rules exist');
  assert.match(phone, /      \.page-intro h1 \{ font-size: 21px; \}/);
});
