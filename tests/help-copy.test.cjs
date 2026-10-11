const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { gunzipSync } = require('node:zlib');

const rejected = [
  "ヘルプや確認画面を開いている間は背景のスクロールが止まります。画面が低いときは本文内をスクロールすると、説明の最後や確認ボタンまで進めます。閉じる、Esc、背景のクリックで閉じられます。確認画面のキャンセルでは処理を実行しません。",
  "While Help or a confirmation is open, background scrolling is paused. On a short screen, scroll inside the dialog body to reach the final notes or confirmation buttons. Close, Esc, or a backdrop click dismisses the dialog; Cancel leaves the pending action unapplied."
];

test('help contains user guidance rather than implementation or layout audit prose', () => {
  const root = path.join(__dirname, '..');
  const files = ['src/index.template.html', 'dist/index.html', 'dist/index.self-extract.html',
    ...fs.readdirSync(root).filter(name => name.endsWith('.html'))];
  for (const file of files) {
    const filename = path.join(root, file);
    if (!fs.existsSync(filename)) continue;
    let html = fs.readFileSync(filename, 'utf8');
    const payload = html.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
    if (payload) html = gunzipSync(Buffer.from(payload[1].replace(/\s/g, ''), 'base64')).toString('utf8');
    for (const copy of rejected) assert.ok(!html.includes(copy), `${file}: remove internal-facing help copy: ${copy}`);
  }
});
