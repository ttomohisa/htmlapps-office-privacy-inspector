const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./app-harness.cjs');

const html = fs.readFileSync(process.env.OFFICE_TEST_HTML || path.join(__dirname, '../src/index.template.html'), 'utf8');

test('result summary retains one clear outer panel, with a grouped counter strip instead of nested cards', () => {
  assert.match(html, /<section class="panel" id="resultState" hidden aria-labelledby="resultHeading">/);
  assert.match(html, /\.stat-grid \{[^\n]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 175px\), 1fr\)\);[^\n]*gap: 1px;[^\n]*border: 1px solid var\(--line\);/);
  assert.match(html, /\.stat-card \{ min-width: 0; padding: 13px 15px; background: #fafbf9; \}/);
  assert.doesNotMatch(html, /\.stat-card \{[^\n]*border:/, 'individual numbers should not be individual bordered cards');
  assert.match(html, /\.stat-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/, 'two columns on narrow screens');
});

test('summary content is separated by whitespace and rules, not another card within the result card', () => {
  assert.match(html, /\.summary-preview \{[^\n]*border-top: 1px solid var\(--line\); \}/);
  assert.doesNotMatch(html, /\.summary-preview \{[^\n]*(?:border-radius|background):/, 'preview should not have a separate card surface');
  assert.match(html, /\.summary-preview-row \+ \.summary-preview-row \{ border-top: 1px solid/);
  assert.doesNotMatch(html, /\.summary-preview-row \{[^\n]*(?:border-radius|background):/, 'preview rows should not be nested cards');
});

test('result callouts keep meaningful soft backgrounds and a single left accent; notice is compact', () => {
  assert.match(html, /\.result-callout \{[^\n]*border-left: 3px solid/);
  assert.match(html, /\.result-callout\.review \{[^\n]*background:/);
  assert.match(html, /\.result-callout\.clean \{[^\n]*background:/);
  assert.match(html, /\.notice \{[^\n]*border-left: 2px solid/);
  assert.doesNotMatch(html, /\.result-callout \{[^\n]*border: 1px/, 'full borders reintroduce nested cards');
});

test('inspection result continues showing four stats and the appropriate clean/review states', async t => {
  const a = app({ savedLanguage: 'ja' }); t.after(a.close);
  for (const [filename, isReview] of [['clean.xlsx', false], ['hidden-sheet.xlsx', true]]) {
    await a.api.inspectSelectedFile(a.file(filename));
    const doc = a.w.document;
    assert.equal(doc.getElementById('resultState').hidden, false);
    assert.equal(doc.querySelectorAll('.stat-grid > .stat-card:not([hidden])').length, 4);
    assert.equal(doc.getElementById('reviewCallout').hidden, !isReview);
    assert.equal(doc.getElementById('cleanCallout').hidden, isReview);
    assert.ok(doc.getElementById('summaryPreviewList').textContent);
    assert.equal(doc.getElementById('jumpToFindingsButton').disabled, false);
  }
});
