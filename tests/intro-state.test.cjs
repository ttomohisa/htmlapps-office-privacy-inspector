const assert = require('node:assert/strict');
const test = require('node:test');
const { app } = require('./app-harness.cjs');

test('intro title, description and local-processing badge disappear during loading and results', async t => {
  const a = app({ savedLanguage: 'ja' }); t.after(a.close);
  const doc = a.w.document;
  const intro = doc.getElementById('pageIntro');
  assert.ok(intro, 'one wrapper owns hero, lead and badge');
  assert.equal(intro.hidden, false);
  assert.ok(intro.querySelector('#heroTitle'));
  assert.ok(intro.querySelector('[data-i18n="lead"]'));
  assert.ok(intro.querySelector('[data-i18n="localBadge"]'));

  const inspection = a.api.inspectSelectedFile(a.file('clean.xlsx'));
  assert.equal(doc.getElementById('loadingState').hidden, false);
  assert.equal(intro.hidden, true, 'nothing from the intro remains during loading');
  await inspection;
  assert.equal(doc.getElementById('resultState').hidden, false);
  assert.equal(intro.hidden, true, 'intro remains absent above inspected results');

  doc.getElementById('languageButton').click();
  assert.equal(intro.hidden, true, 'switching languages does not reveal the intro');
  assert.equal(doc.getElementById('resultState').hidden, false);
  await a.api.resetApp(false);
  assert.equal(doc.getElementById('emptyState').hidden, false);
  assert.equal(intro.hidden, false, 'reset brings back the intro and file picker');
});

test('replacing a file does not briefly show intro; errors keep focus on retry, reset restores intro', async t => {
  const a = app(); t.after(a.close);
  const doc = a.w.document;
  const intro = doc.getElementById('pageIntro');

  await a.api.inspectSelectedFile(a.file('clean.docx'));
  assert.equal(intro.hidden, true);
  const replacement = a.api.inspectSelectedFile(a.file('hidden-sheet.xlsx'));
  assert.equal(doc.getElementById('loadingState').hidden, false);
  assert.equal(intro.hidden, true);
  await replacement;
  assert.equal(doc.getElementById('resultState').hidden, false);
  assert.equal(intro.hidden, true);

  await a.api.inspectSelectedFile(a.file('broken.docx'));
  assert.equal(doc.getElementById('errorState').hidden, false);
  assert.equal(intro.hidden, true, 'failed import displays the retry screen without unrelated hero copy');
  assert.ok(doc.getElementById('retryButton'));
  await a.api.resetApp(false);
  assert.equal(intro.hidden, false);
});
