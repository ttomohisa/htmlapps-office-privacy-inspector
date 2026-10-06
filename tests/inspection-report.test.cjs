const assert = require('node:assert/strict');
const test = require('node:test');
const { app } = require('./app-harness.cjs');
const secret = 'UNIQUE_PRIVATE_7f1939';
function fixture(format = 'docx') {
  const result = { file: { name: secret + '.' + format, format, extension: format }, core: { creator: secret }, extended: { company: secret }, custom: [{ name: secret, value: secret }], package: { entryCount: 8, signed: false, macroEnabled: false, macroParts: [], partialFailures: [], duplicateRelationships: [], cleanupBlockedReasons: [] } };
  const item = { name: secret, author: secret, text: secret, path: 'C:\\' + secret, target: 'https://' + secret + '.invalid', count: 2 };
  result.docx = { comments: [item], revisions: [item], hiddenText: [item], rsidCount: 2, externalRelationships: [item], embeddedObjects: [item], customXml: [item] };
  result.xlsx = { hiddenSheets: [item], hiddenRows: [item], hiddenColumns: [item], externalRelationships: [item], externalFormulas: [item], definedNames: [item], connections: [item], pivotCaches: [item], slicerCaches: [item], embeddedObjects: [item] };
  result.pptx = { comments: [item], notes: [item], hiddenSlides: [item], offSlideObjects: [item], externalRelationships: [item], embeddedObjects: [item], customXml: [item] };
  return result;
}
for (const format of ['docx', 'xlsx', 'pptx']) test(`${format} report is counts-only and cannot copy distinctive private content`, t => {
  const a = app(); t.after(a.close); assert.equal(typeof a.api.report, 'function');
  const report = a.api.report(fixture(format));
  assert.deepEqual(Object.keys(report).sort(), ['appVersion', 'caveat', 'cleanup', 'format', 'inspection', 'schemaVersion']);
  assert.equal(report.schemaVersion, 1); assert.equal(report.format, format); assert.equal(report.inspection.completeness, 'complete');
  assert.equal(report.inspection.categoryCounts.metadata, 2); assert.equal(report.inspection.categoryCounts.customProperties, 1);
  assert.equal(report.inspection.categoryCounts.comments, format === 'xlsx' ? null : 1);
  assert.equal(report.cleanup.status, 'not_performed'); assert.equal(report.cleanup.after, null);
  const json = JSON.stringify(report); assert.ok(!json.includes(secret)); assert.ok(!/author|path|target|fileName|filename|https:|C:\\\\|errorMessage/.test(json));
  assert.match(report.caveat, /zero findings/i); assert.match(report.caveat, /safe|safety/i); assert.match(report.caveat, /anonym/i);
});
test('partial and missing inspections preserve unknown counts instead of zero', t => {
  const a = app(); t.after(a.close); assert.equal(typeof a.api.report, 'function'); const r = fixture();
  r.package.partialFailures.push({ part: secret, message: secret }); r.package.cleanupBlockedReasons = ['partial', secret];
  const report = a.api.report(r);
  assert.equal(report.inspection.completeness, 'partial'); assert.ok(Object.values(report.inspection.categoryCounts).every(value => value === null));
  assert.ok(report.inspection.cleanupRestrictions.includes('partial')); assert.ok(!JSON.stringify(report).includes(secret));
  assert.equal(a.api.report(null), null);
});
test('before and after counts exist only for a successful reinspection', t => {
  const a = app(); t.after(a.close); assert.equal(typeof a.api.report, 'function'); const before = fixture(); const after = fixture(); after.core = {}; after.extended = {}; after.docx.comments = [];
  const report = a.api.report(before, after, 'verified'); assert.equal(report.inspection.categoryCounts.metadata, 2); assert.equal(report.cleanup.after.categoryCounts.metadata, 0); assert.equal(report.cleanup.after.categoryCounts.comments, 0);
  const failed = a.api.report(before, after, 'reinspection_failed'); assert.equal(failed.cleanup.after, null); assert.equal(failed.cleanup.status, 'reinspection_failed');
});
test('download uses edited sanitized generic JSON filename, with current result only', async t => {
  const a = app(); t.after(a.close); const button = a.w.document.querySelector('#downloadReportButton'); assert.ok(button); assert.equal(button.disabled, true);
  await a.api.inspectSelectedFile(a.file('clean.docx')); assert.equal(button.disabled, false);
  const input = a.w.document.querySelector('#reportFilenameInput'); assert.equal(input.value, 'inspection-summary');
  input.value = 'team/review.json'; button.click(); assert.equal(a.downloads[0].filename, 'team-review.json');
  const report = JSON.parse(await a.downloads[0].blob.text()); assert.equal(report.inspection.completeness, 'complete'); assert.ok(!JSON.stringify(report).includes('clean.docx'));
  a.w.document.querySelector('#languageButton').click(); assert.equal(input.value, 'team-review');
  await a.api.resetApp(false); assert.equal(button.disabled, true); button.click(); assert.equal(a.downloads.length, 1);
  await a.api.inspectSelectedFile(a.file('broken.docx')); assert.equal(button.disabled, true); button.click(); assert.equal(a.downloads.length, 1);
});
test('replacement invalidates report immediately and a delayed old source cannot return', async t => {
  const a = app(); t.after(a.close); const button = a.w.document.querySelector('#downloadReportButton'); assert.ok(button);
  await a.api.inspectSelectedFile(a.file('clean.docx'));
  let release; const slow = { name: secret + '.docx', arrayBuffer: () => new Promise(resolve => { release = resolve; }) };
  const old = a.api.inspectSelectedFile(slow); assert.equal(button.disabled, true);
  const current = a.api.inspectSelectedFile(a.file('clean.xlsx')); await current; release(new ArrayBuffer(0)); await old;
  button.click(); assert.equal(JSON.parse(await a.downloads[0].blob.text()).format, 'xlsx');
});
test('report export is disabled during cleanup and includes verified after counts', async t => {
  const a = app(); t.after(a.close); await a.api.inspectSelectedFile(a.file('core-properties.docx'));
  const button = a.w.document.querySelector('#downloadReportButton');
  const pending = a.api.createCleanedCopy(); assert.equal(button.disabled, true); button.click(); assert.equal(a.downloads.length, 0);
  await pending; assert.equal(button.disabled, false); button.click();
  const report = JSON.parse(await a.downloads[0].blob.text()); assert.equal(report.cleanup.status, 'verified'); assert.equal(report.cleanup.after.categoryCounts.metadata, 0);
});
test('cancelled cleanup confirmation cannot act on a replacement source', async t => {
  const a = app(); t.after(a.close); await a.api.inspectSelectedFile(a.file('comments.docx'));
  const checkbox = a.w.document.querySelector('[data-cleanup-target="docx:comments"]'); checkbox.checked = true; checkbox.dispatchEvent(new a.w.Event('change'));
  const pending = a.api.createCleanedCopy(); assert.equal(a.w.document.querySelector('#appConfirmDialog').open, true);
  await a.api.inspectSelectedFile(a.file('comments.docx'));
  a.w.document.querySelector('#appConfirmOk').click(); await pending;
  assert.equal(a.api.after, null); assert.equal(a.w.document.querySelector('#cleanupOutput').hidden, true);
});
test('cleanup changes clear after counts, failed reinspection remains unknown, and language preserves report name', async t => {
  const a = app(); t.after(a.close); await a.api.inspectSelectedFile(a.file('clean.docx'));
  const input = a.w.document.querySelector('#reportFilenameInput'); input.value = 'chosen-review';
  a.api.setCleanup(a.api.result); a.w.document.querySelector('#downloadReportButton').click(); assert.equal(JSON.parse(await a.downloads[0].blob.text()).cleanup.status, 'verified');
  a.api.updateCleanupSelection(); a.w.document.querySelector('#downloadReportButton').click(); assert.equal(JSON.parse(await a.downloads[1].blob.text()).cleanup.status, 'not_performed');
  a.api.setCleanup(a.api.result, new Error(secret)); a.w.document.querySelector('#downloadReportButton').click();
  const failed = JSON.parse(await a.downloads[2].blob.text()); assert.equal(failed.cleanup.after, null); assert.equal(failed.cleanup.status, 'reinspection_failed'); assert.ok(!JSON.stringify(failed).includes(secret));
  a.w.document.querySelector('#languageButton').click(); assert.equal(input.value, 'chosen-review');
  assert.equal(a.w.document.documentElement.lang, 'ja'); assert.equal(a.w.document.querySelector('#downloadReportButton').textContent, '検査サマリーを保存 (.json)');
});
test('blank, reserved and repeated JSON extensions become safe report names', async t => {
  const a = app(); t.after(a.close); await a.api.inspectSelectedFile(a.file('clean.docx'));
  const input = a.w.document.querySelector('#reportFilenameInput'); const button = a.w.document.querySelector('#downloadReportButton');
  for (const [name, expected] of [[' . . ', 'inspection-summary.json'], ['CON', '_CON.json'], ['review.JSON.json', 'review.json'], ['private\\folder\u0000?', 'private-folder--.json']]) { input.value = name; button.click(); assert.equal(a.downloads.at(-1).filename, expected); }
});
test('source replacement during cleanup restores the new source action label', async t => {
  const a = app(); t.after(a.close); const base = a.file('comments.docx'); let reads = 0; let release;
  const oldFile = { name: base.name, size: base.size, type: base.type, arrayBuffer: () => ++reads === 1 ? base.arrayBuffer() : new Promise(resolve => { release = resolve; }) };
  await a.api.inspectSelectedFile(oldFile); const pending = a.api.createCleanedCopy();
  assert.equal(a.w.document.querySelector('#createCleanedButton').textContent, 'Cleaning up and reinspecting…');
  await a.api.inspectSelectedFile(a.file('core-properties.xlsx')); release(await base.arrayBuffer()); await pending;
  const create = a.w.document.querySelector('#createCleanedButton'); assert.equal(create.disabled, false); assert.equal(create.textContent, 'Create cleaned copy');
  const report = a.w.document.querySelector('#downloadReportButton'); assert.equal(report.disabled, false); report.click();
  const json = JSON.parse(await a.downloads[0].blob.text()); assert.equal(json.format, 'xlsx'); assert.equal(json.cleanup.status, 'not_performed');
});
test('real failed verification discards the output but reports reinspection_failed', async t => {
  const a = app(); t.after(a.close); await a.api.inspectSelectedFile(a.file('comments.docx'));
  const failures = []; a.w.console.error = error => failures.push(error);
  const read = a.w.FileReader.prototype.readAsArrayBuffer;
  a.w.FileReader.prototype.readAsArrayBuffer = function (file) { return read.call(this, file.name.includes('-cleaned') ? a.file('malformed-optional.docx') : file); };
  await a.api.createCleanedCopy(); assert.equal(a.api.after, null); assert.equal(a.w.document.querySelector('#cleanupOutput').hidden, true); assert.ok(failures.some(error => error.code === 'cleanupVerification'));
  a.w.document.querySelector('#downloadReportButton').click(); const report = JSON.parse(await a.downloads[0].blob.text());
  assert.equal(report.cleanup.status, 'reinspection_failed'); assert.equal(report.cleanup.after, null); assert.ok(report.inspection.categoryCounts.metadata > 0);
  a.w.document.querySelector('#languageButton').click(); a.w.document.querySelector('#downloadReportButton').click(); assert.equal(JSON.parse(await a.downloads[1].blob.text()).cleanup.status, 'reinspection_failed');
  a.api.updateCleanupSelection(); a.w.document.querySelector('#downloadReportButton').click(); assert.equal(JSON.parse(await a.downloads[2].blob.text()).cleanup.status, 'not_performed');
});
test('late ordinary reinspection failure cannot contaminate the replacement report', async t => {
  const a = app(); t.after(a.close); await a.api.inspectSelectedFile(a.file('comments.docx')); let rejectOld; let started;
  const startedPromise = new Promise(resolve => { started = resolve; });
  a.api.interceptInspection((original, file, ...args) => file.name === 'comments-cleaned.docx' ? new Promise((resolve, reject) => { rejectOld = reject; started(); }) : original(file, ...args));
  const failures = []; a.w.console.error = error => failures.push(error);
  const pending = a.api.createCleanedCopy(); await startedPromise;
  await a.api.inspectSelectedFile(a.file('clean.xlsx')); rejectOld(new Error('DELAYED_PRIVATE_DECODER_FAILURE')); await pending;
  a.w.document.querySelector('#downloadReportButton').click(); const report = JSON.parse(await a.downloads[0].blob.text());
  assert.equal(report.format, 'xlsx'); assert.equal(report.cleanup.status, 'not_performed'); assert.equal(report.cleanup.after, null);
  assert.equal(a.w.document.querySelector('#appToastMessage').textContent, 'Inspection complete'); assert.equal(failures.length, 0);
});
test('late old reinspection failure cannot erase a newer verified cleanup', async t => {
  const a = app(); t.after(a.close); await a.api.inspectSelectedFile(a.file('comments.docx')); let rejectOld; let started;
  const startedPromise = new Promise(resolve => { started = resolve; });
  a.api.interceptInspection((original, file, ...args) => file.name === 'comments-cleaned.docx' ? new Promise((resolve, reject) => { rejectOld = reject; started(); }) : original(file, ...args));
  a.w.console.error = () => {};
  const old = a.api.createCleanedCopy(); await startedPromise;
  await a.api.inspectSelectedFile(a.file('core-properties.xlsx')); await a.api.createCleanedCopy(); const verified = a.api.after; assert.ok(verified);
  rejectOld(new Error('Old decode failed')); await old; assert.equal(a.api.after, verified);
  a.w.document.querySelector('#downloadReportButton').click(); const report = JSON.parse(await a.downloads[0].blob.text()); assert.equal(report.format, 'xlsx'); assert.equal(report.cleanup.status, 'verified');
});
