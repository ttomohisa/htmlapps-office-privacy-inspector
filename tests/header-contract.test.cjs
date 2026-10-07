const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { app } = require('./app-harness.cjs');
const config = require('../app.config.json');
const source = fs.readFileSync(process.env.OFFICE_TEST_HTML || path.join(__dirname, '../src/index.template.html'), 'utf8');

function assertHeader(a, language) {
  const document = a.w.document;
  const button = document.querySelector('#languageButton');
  const target = language === 'ja' ? 'EN' : 'JA';
  const label = language === 'ja' ? '英語に切り替え' : 'Switch to Japanese';
  assert.equal(document.documentElement.lang, language);
  assert.equal(button.textContent, target);
  assert.equal(button.getAttribute('aria-label'), label);
  assert.equal(button.title, label);
  assert.equal(document.querySelector('#versionBadge').textContent, `v${config.version}`);
  assert.match(document.querySelector('#versionBadge').textContent, /^v\d+\.\d+\.\d+$/);
  assert.equal(document.querySelector('[data-i18n="localBadge"]').textContent, language === 'ja' ? '完全ローカル処理' : 'Fully local processing');
}

for (const [locale, language] of [['ja-JP', 'ja'], ['en-US', 'en']]) {
  test(`fresh ${locale} header has target language, localized tooltip, local badge and canonical version`, t => {
    const a = app({ language: locale }); t.after(a.close);
    assertHeader(a, language);
    for (const expected of [language === 'ja' ? 'en' : 'ja', language, language === 'ja' ? 'en' : 'ja']) {
      a.w.document.querySelector('#languageButton').click();
      assertHeader(a, expected);
      assert.equal(a.w.localStorage.getItem(`${config.slug}:language`), expected);
    }
    const savedLanguage = a.w.localStorage.getItem(`${config.slug}:language`);
    const reloaded = app({ language: locale, savedLanguage }); t.after(reloaded.close);
    assertHeader(reloaded, savedLanguage);
  });
  test(`header switches normally when storage is unavailable for ${locale}`, t => {
    const a = app({ language: locale, storageUnavailable: true }); t.after(a.close);
    assertHeader(a, language);
    a.w.document.querySelector('#languageButton').click();
    assertHeader(a, language === 'ja' ? 'en' : 'ja');
  });
}

test('Japanese static header matches its action and configured release before startup', () => {
  const button = source.match(/<button\b[^>]*id="languageButton"[^>]*>EN<\/button>/)?.[0];
  assert.ok(button);
  assert.match(button, /aria-label="英語に切り替え"/);
  assert.match(button, /title="英語に切り替え"/);
  assert.ok(source.includes(`id="versionBadge">v${config.version}<`));
});
