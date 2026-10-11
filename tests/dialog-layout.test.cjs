const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { app } = require('./app-harness.cjs');
const source = fs.readFileSync(process.env.OFFICE_TEST_HTML || path.join(__dirname, '../src/index.template.html'), 'utf8');

// These contracts protect the layout rules. Native viewport, wheel, focus-trap,
// and hit-testing checks remain separate browser checks; jsdom has no layout.
function styles(t) {
  const dom = new JSDOM(source.replace(/<script>[\s\S]*?<\/script>/g, ''));
  t.after(() => dom.window.close());
  return { document: dom.window.document, rules: [...dom.window.document.styleSheets[0].cssRules] };
}
function rule(rules, selector) { return rules.find(item => item.selectorText === selector)?.style; }
function mobileRules(rules) { return [...rules.find(item => item.conditionText === '(max-width: 720px)').cssRules]; }

test('Help and confirmations lock both document scroll containers only while a dialog is open', t => {
  const { document, rules } = styles(t);
  const lock = rule(rules, 'html:has(dialog[open]), body:has(dialog[open])');
  assert.ok(lock, 'Missing dialog-scoped document-root and body scroll lock');
  assert.equal(lock.getPropertyValue('overflow'), 'hidden');
  assert.equal(lock.getPropertyValue('overscroll-behavior'), 'none');
  for (const id of ['helpDialog', 'appConfirmDialog']) {
    const dialog = document.getElementById(id);
    assert.equal(document.documentElement.matches('html:has(dialog[open])'), false);
    dialog.open = true;
    assert.equal(document.documentElement.matches('html:has(dialog[open])'), true);
    assert.equal(document.body.matches('body:has(dialog[open])'), true);
    dialog.open = false;
    assert.equal(document.documentElement.matches('html:has(dialog[open])'), false);
  }
});

test('confirmation body can scroll all existing actions below its non-shrinking header', t => {
  const { document, rules } = styles(t);
  const dialog = document.getElementById('appConfirmDialog');
  const header = dialog.querySelector('.app-confirm-header');
  const body = dialog.querySelector('.app-confirm-body');
  const actions = dialog.querySelector('.app-confirm-actions');
  assert.equal(header.parentElement, dialog);
  assert.equal(body.parentElement, dialog);
  assert.equal(actions.parentElement, body, 'Preserve the existing action placement and semantics');
  assert.equal(body.querySelectorAll('button').length, 2);
  assert.equal(rule(rules, '.app-confirm-header').getPropertyValue('flex'), '0 0 auto');
  const bodyStyle = rule(rules, '.app-confirm-body');
  assert.equal(bodyStyle.getPropertyValue('flex'), '1 1 auto');
  assert.equal(bodyStyle.getPropertyValue('min-height'), '0');
  assert.equal(bodyStyle.getPropertyValue('overflow-y'), 'auto');
  assert.equal(bodyStyle.getPropertyValue('overscroll-behavior'), 'contain');
  const actionStyle = rule(rules, '.app-confirm-actions');
  assert.equal(actionStyle.getPropertyValue('grid-template-columns'), '1fr 1fr');
  assert.equal(rule(mobileRules(rules), '.app-confirm-actions').getPropertyValue('grid-template-columns'), '1fr');
  assert.match(rule(mobileRules(rules), '.app-confirm-body').getPropertyValue('padding-bottom'), /env\(safe-area-inset-bottom\)/);
});

test('working Help header/body split and short-viewport bounds stay intact', t => {
  const { document, rules } = styles(t);
  assert.equal(rule(rules, 'dialog[open]').getPropertyValue('display'), 'flex');
  assert.equal(rule(rules, 'dialog[open]').getPropertyValue('flex-direction'), 'column');
  assert.equal(rule(rules, '.dialog-header').getPropertyValue('flex'), '0 0 auto');
  assert.equal(rule(rules, '.dialog-body').getPropertyValue('min-height'), '0');
  assert.equal(rule(rules, '.dialog-body').getPropertyValue('overflow-y'), 'auto');
  assert.equal(rule(rules, '.dialog-body').getPropertyValue('overscroll-behavior'), 'contain');
  assert.match(rule(rules, '.dialog-body').getPropertyValue('padding'), /env\(safe-area-inset-bottom\)/);
  assert.equal(rule(mobileRules(rules), 'dialog:not(.app-confirm-dialog)').getPropertyValue('height'), 'calc(100dvh - 16px)');
  assert.equal(rule(mobileRules(rules), 'dialog:not(.app-confirm-dialog)').getPropertyValue('margin'), '8px auto');
  assert.equal(rule(rules, '.app-confirm-dialog').getPropertyValue('max-height'), 'calc(100dvh - 28px)');
  assert.equal(rule(mobileRules(rules), '.app-confirm-dialog').getPropertyValue('max-height'), 'calc(100dvh - 16px)');
  assert.ok(document.querySelector('#helpDialog > .dialog-body [data-i18n="helpOffline"]'));
});

for (const language of ['ja-JP', 'en-US']) {
  test(`${language} Help explains dialog scrolling and cancellation`, t => {
    const a = app({ language }); t.after(a.close);
    const note = a.w.document.querySelector('[data-i18n="helpDialogs"]');
    assert.ok(note, 'Help must explain the bounded dialog body');
    assert.match(note.textContent, language === 'ja-JP' ? /画面が低いとき/ : /short screen/i);
    assert.match(note.textContent, language === 'ja-JP' ? /キャンセル/ : /cancel/i);
  });

  test(`${language} shared confirmation retains cancellation, approval, focus return and reopen behavior`, async t => {
    const a = app({ language }); t.after(a.close);
    const d = a.w.document, opener = d.getElementById('helpButton');
    const dialog = d.getElementById('appConfirmDialog');
    for (const exit of ['appConfirmClose', 'appConfirmCancel', 'escape', 'backdrop', 'appConfirmOk']) {
      opener.focus();
      const pending = a.w.AppConfirm.ask({ title: 'Synthetic title', message: 'Synthetic message', confirmLabel: 'Proceed', cancelLabel: 'Keep', tone: 'danger' });
      assert.equal(dialog.open, true);
      assert.equal(d.activeElement.id, 'appConfirmCancel');
      assert.equal(d.getElementById('appConfirmTitle').textContent, 'Synthetic title');
      assert.equal(d.getElementById('appConfirmMessage').textContent, 'Synthetic message');
      assert.equal(d.getElementById('appConfirmOk').textContent, 'Proceed');
      assert.equal(d.getElementById('appConfirmCancel').textContent, 'Keep');
      assert.equal(d.getElementById('appConfirmOk').classList.contains('danger'), true);
      if (exit === 'escape') {
        const event = new a.w.Event('cancel', { cancelable: true });
        dialog.dispatchEvent(event); assert.equal(event.defaultPrevented, true);
      } else if (exit === 'backdrop') {
        dialog.dispatchEvent(new a.w.MouseEvent('click', { clientX: -1, clientY: -1 }));
      } else d.getElementById(exit).click();
      assert.equal(await pending, exit === 'appConfirmOk');
      assert.equal(dialog.open, false);
      assert.equal(d.activeElement, opener);
    }
    opener.focus();
    const first = a.w.AppConfirm.ask({ message: 'First' });
    const second = a.w.AppConfirm.ask({ message: 'Second' });
    assert.equal(await first, false);
    assert.equal(dialog.open, true);
    assert.equal(d.getElementById('appConfirmMessage').textContent, 'Second');
    d.getElementById('appConfirmCancel').click();
    assert.equal(await second, false);
    assert.equal(d.activeElement, opener);
  });

  test(`${language} loaded reset cancellation preserves inspection; approved reset clears it`, async t => {
    const a = app({ language }); t.after(a.close);
    await a.api.inspectSelectedFile(a.file('core-properties.docx'));
    const original = a.api.result;
    const pending = a.api.resetApp();
    assert.equal(a.w.document.getElementById('appConfirmDialog').open, true);
    a.w.document.getElementById('appConfirmCancel').click(); await pending;
    assert.equal(a.api.result, original);
    assert.equal(a.w.document.getElementById('downloadReportButton').disabled, false);
    const confirmed = a.api.resetApp();
    a.w.document.getElementById('appConfirmOk').click(); await confirmed;
    assert.equal(a.api.result, null);
    assert.equal(a.w.document.getElementById('downloadReportButton').disabled, true);
  });
}

test('canonical repository check runs the dialog suite on source and both readable entry points', () => {
  const checker = fs.readFileSync(path.join(__dirname, '../scripts/check-repository.ps1'), 'utf8');
  assert.ok(checker.includes('dialog-layout.test.cjs'), 'Canonical checker must require the dialog regression file');
  assert.ok(checker.includes('tests/*.test.cjs'));
  assert.ok(checker.includes('tests/*.test.mjs'));
  assert.ok(checker.includes('src/index.template.html'));
  assert.ok(checker.includes('dist/index.html'));
  assert.ok(checker.includes('office-privacy-inspector.html'));
  assert.ok(checker.includes('$env:OFFICE_TEST_HTML = $htmlPath'));
  assert.ok(checker.includes('$env:OFFICE_TEST_HTML = $previousOfficeTestHtml'));
});
