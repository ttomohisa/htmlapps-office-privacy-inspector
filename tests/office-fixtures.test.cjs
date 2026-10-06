const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { app } = require('./app-harness.cjs');
for (const [name, format, restriction] of [
  ['clean.docx','docx'], ['clean.xlsx','xlsx'], ['clean.pptx','pptx'],
  ['docx-inspector-all.docx','docx'], ['xlsx-inspector-all.xlsx','xlsx','macro'], ['pptx-inspector-all.pptx','pptx','macro'],
  ['signed.docx','docx','signature'], ['duplicate-relationships.docx','docx','relationships'],
  ['macro-enabled.docm','docx','macro'], ['macro-enabled.xlsm','xlsx','macro'], ['macro-enabled.pptm','pptx','macro'],
  ['macro-parts.docx','docx','macro'], ['macro-parts.xlsx','xlsx','macro'], ['macro-parts.pptx','pptx','macro'],
  ['malformed-optional.docx','docx','partial'], ['malformed-document.docx','docx','partial'], ['unusual-namespaces.docx','docx']
]) test(`actual fixture inspection and report: ${name}`, async t => {
  const a = app(); t.after(a.close); const result = await a.api.inspectOfficeFile(a.file(name), a.api.generation, false);
  const report = a.api.report(result); assert.equal(report.format, format); assert.ok(!JSON.stringify(report).includes(name));
  assert.equal(report.inspection.completeness, restriction === 'partial' ? 'partial' : 'complete');
  if (restriction) { assert.ok(report.inspection.cleanupRestrictions.includes(restriction)); await assert.rejects(a.api.buildCleanedOfficeBytes(a.file(name), result, ['core:creator'], a.api.generation), error => error.code === 'cleanupBlocked'); }
  else assert.equal(report.inspection.cleanupRestrictions.length, 0);
  if (name === 'docx-inspector-all.docx') { assert.ok(report.inspection.categoryCounts.comments > 0); assert.ok(report.inspection.categoryCounts.trackedChanges > 0); }
  if (name === 'xlsx-inspector-all.xlsx') assert.ok(report.inspection.categoryCounts.hiddenSheets > 0);
  if (name === 'pptx-inspector-all.pptx') assert.ok(report.inspection.categoryCounts.speakerNotes > 0);
});
for (const [name, code] of [['encrypted.docx','encrypted'], ['legacy-disguised.docx','notOffice'], ['broken.docx','broken'], ['not-office.txt','notOffice']]) test(`unsupported fixture cannot produce report: ${name}`, async t => {
  const a = app(); t.after(a.close); await assert.rejects(a.api.inspectOfficeFile(a.file(name), a.api.generation, false), error => error.code === code);
  await a.api.inspectSelectedFile(a.file(name)); assert.equal(a.api.result, null); assert.equal(a.w.document.querySelector('#downloadReportButton').disabled, true);
});
for (const name of ['comments.docx', 'core-properties.xlsx', 'cleanup-media.pptx']) test(`metadata cleanup preserves all unrelated local records and bytes: ${name}`, async t => {
  const a = app(); t.after(a.close); const source = fs.readFileSync(path.join(__dirname, 'fixtures', name)); const original = Buffer.from(source); const file = a.file(name, source);
  const before = await a.api.inspectOfficeFile(file, a.api.generation, false);
  const bytes = await a.api.buildCleanedOfficeBytes(file, before, ['core:creator'], a.api.generation);
  const after = await a.api.inspectOfficeFile(a.file(name, bytes), a.api.generation, false);
  a.api.validateCleanupReinspection(before, after, ['core:creator']);
  assert.deepEqual(source, original); assert.equal(after.core.creator, '');
  const oldEntries = a.api.parseZipDirectory(source); const newEntries = a.api.parseZipDirectory(bytes);
  assert.equal(oldEntries.size, newEntries.size);
  for (const [name, entry] of oldEntries) {
    if (name === 'docProps/core.xml') continue;
    const next = newEntries.get(name); assert.ok(next, name);
    assert.deepEqual(Buffer.from(source.subarray(entry.localOffset, entry.localEnd)), Buffer.from(bytes.subarray(next.localOffset, next.localEnd)), name);
    assert.deepEqual(Buffer.from(await a.api.readZipEntry(source, entry)), Buffer.from(await a.api.readZipEntry(bytes, next)), name);
  }
  const report = a.api.report(before, after, 'verified'); assert.equal(report.cleanup.status, 'verified'); assert.equal(report.cleanup.after.categoryCounts.metadata, report.inspection.categoryCounts.metadata - 1);
});
test('synthetic author secret is detected but absent from serialized exported JSON', async t => {
  const a = app(); t.after(a.close); const bytes = new Uint8Array(fs.readFileSync(path.join(__dirname, 'fixtures/clean.docx'))); const entries = a.api.parseZipDirectory(bytes); const marker = 'DO_NOT_EXPORT_8d82_private_author';
  const oldCore = await a.api.readZipText(bytes, entries, 'docProps/core.xml', true);
  const newCore = oldCore.replace('</cp:coreProperties>', `<dc:creator>${marker}</dc:creator></cp:coreProperties>`);
  assert.ok(newCore.includes(marker));
  const modified = await a.api.rebuildZip(bytes, entries, new Map([['docProps/core.xml', new TextEncoder().encode(newCore)]]));
  await a.api.inspectSelectedFile(a.file(marker + '.docx', modified)); assert.equal(a.api.result.core.creator, marker);
  a.w.document.querySelector('#downloadReportButton').click(); const json = await a.downloads[0].blob.text(); assert.ok(!json.includes(marker)); assert.equal(JSON.parse(json).inspection.categoryCounts.metadata, 1);
});
test('missing required Word document part is partial, never zero or cleanup-capable', async t => {
  const a = app(); t.after(a.close); const bytes = new Uint8Array(fs.readFileSync(path.join(__dirname, 'fixtures/clean.docx')));
  const modified = await a.api.rebuildZip(bytes, a.api.parseZipDirectory(bytes), new Map(), new Set(['word/document.xml']));
  const file = a.file('missing-document.docx', modified); const result = await a.api.inspectOfficeFile(file, a.api.generation, false);
  assert.ok(result.package.partialFailures.some(failure => failure.part === 'word/document.xml'));
  const report = a.api.report(result); assert.equal(report.inspection.completeness, 'partial'); assert.equal(report.inspection.categoryCounts.comments, null); assert.ok(report.inspection.cleanupRestrictions.includes('partial'));
  await assert.rejects(a.api.buildCleanedOfficeBytes(file, result, ['core:creator'], a.api.generation), error => error.code === 'cleanupBlocked');
});
