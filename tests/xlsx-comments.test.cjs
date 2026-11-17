const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./app-harness.cjs');

const fixtures = path.join(__dirname, 'fixtures');
const relNs = 'http://schemas.openxmlformats.org/package/2006/relationships';
const legacyRel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments';
const threadRel = 'http://schemas.microsoft.com/office/2017/10/relationships/threadedComment';
const personRel = 'http://schemas.microsoft.com/office/2017/10/relationships/person';
const threadedNs = 'http://schemas.microsoft.com/office/spreadsheetml/2018/threadedcomments';

function checksum(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function makeZip(parts) {
  const locals = [], centrals = []; let offset = 0;
  for (const [name, value] of parts) {
    const data = Buffer.from(value), bytes = Buffer.from(name, 'utf8'), crc = checksum(data);
    const local = Buffer.alloc(30 + bytes.length), central = Buffer.alloc(46 + bytes.length);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22); local.writeUInt16LE(bytes.length, 26); bytes.copy(local, 30);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(bytes.length, 28); central.writeUInt32LE(offset, 42); bytes.copy(central, 46);
    locals.push(local, data); centrals.push(central); offset += local.length + data.length;
  }
  const centralBytes = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(parts.size, 8); end.writeUInt16LE(parts.size, 10);
  end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}
async function baseParts(a) {
  const bytes = new Uint8Array(fs.readFileSync(path.join(fixtures, 'clean.xlsx')));
  const entries = a.api.parseZipDirectory(bytes), parts = new Map();
  for (const [name, entry] of entries) parts.set(name, Buffer.from(await a.api.readZipEntry(bytes, entry)));
  assert.ok(parts.has('xl/worksheets/sheet1.xml'), 'base fixture contains a worksheet');
  return parts;
}
function setText(parts, name, text) { parts.set(name, Buffer.from(text, 'utf8')); }
function link(parts, relsPath, id, type, target) {
  const empty = '<Relationships xmlns="' + relNs + '"></Relationships>';
  const xml = (parts.get(relsPath) || Buffer.from(empty)).toString('utf8');
  const relation = '<Relationship Id="' + id + '" Type="' + type + '" Target="' + target + '"/>';
  assert.match(xml, /<\/(?:\w+:)?Relationships>/);
  setText(parts, relsPath, xml.replace(/<\/(?:\w+:)?Relationships>/, relation + '$&'));
}
const legacyPath = 'xl/comments1.xml';
const threadedPath = 'xl/threadedComments/threadedComment1.xml';
const personPath = 'xl/persons/person1.xml';
function addLegacy(parts) {
  link(parts, 'xl/worksheets/_rels/sheet1.xml.rels', 'rIdPrivacyLegacy', legacyRel, '../comments1.xml');
  setText(parts, legacyPath, '<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<authors><author>Legacy Author</author></authors><commentList><comment ref="B9" authorId="0"><text>' +
    '<r><t>Internal </t></r><r><t>&lt;img src=x onerror=alert(1)&gt;</t></r>' +
    '</text></comment></commentList></comments>');
}
function addThreaded(parts) {
  link(parts, 'xl/worksheets/_rels/sheet1.xml.rels', 'rIdPrivacyThreaded', threadRel, '../threadedComments/threadedComment1.xml');
  link(parts, 'xl/_rels/workbook.xml.rels', 'rIdPrivacyPersons', personRel, 'persons/person1.xml');
  setText(parts, personPath, '<personList xmlns="' + threadedNs + '">' +
    '<person id="{person-1}" displayName="Alex Example" userId="alex@example.invalid"/>' +
    '<person id="{person-2}" displayName="Taylor Example" userId="taylor@example.invalid"/></personList>');
  setText(parts, threadedPath, '<ThreadedComments xmlns="' + threadedNs + '">' +
    '<threadedComment ref="G8" personId="{person-1}" id="{thread-1}" dT="2026-10-30T12:30:00Z"><text>DO_NOT_EXPORT_COMMENT_ROOT</text></threadedComment>' +
    '<threadedComment personId="{person-2}" id="{thread-2}" parentId="{thread-1}"><text>DO_NOT_EXPORT_COMMENT_REPLY</text></threadedComment>' +
    '</ThreadedComments>');
}
async function inspect(a, parts) {
  return a.api.inspectOfficeFile(a.file('synthetic-comments.xlsx', makeZip(parts)), a.api.generation, false);
}
test('legacy Excel cell notes include sheet, cell, rich text and author without HTML injection', async t => {
  const a = app({ savedLanguage: 'ja' }); t.after(a.close);
  const parts = await baseParts(a); addLegacy(parts);
  const result = await inspect(a, parts);
  assert.equal(result.package.partialFailures.length, 0);
  assert.equal(result.xlsx.comments.length, 1);
  assert.equal(result.xlsx.threadedComments.length, 0);
  assert.equal(result.xlsx.comments[0].sheet, 'Sheet1');
  assert.equal(result.xlsx.comments[0].cell, 'B9');
  assert.equal(result.xlsx.comments[0].author, 'Legacy Author');
  assert.match(result.xlsx.comments[0].text, /Internal <img src=x onerror=alert\(1\)>/);
  a.api.setInspection(result);
  const list = a.w.document.querySelector('#xlsxFindingList');
  assert.match(list.textContent, /セルのメモ/);
  assert.match(list.textContent, /Sheet1!B9/);
  assert.match(list.textContent, /Legacy Author/);
  assert.match(list.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(list.querySelector('img'), null, 'comment content must be text, not markup');
  assert.equal(a.w.document.querySelector('#xlsxSectionCount').textContent, '1');
  assert.equal(a.api.report(result).inspection.categoryCounts.comments, 1);
  assert.equal(a.w.document.querySelector('[data-cleanup-target="xlsx:comments"]'), null);
});
test('threaded Excel comment authors resolve through person records; replies inherit the cell', async t => {
  const a = app({ savedLanguage: 'en' }); t.after(a.close);
  const parts = await baseParts(a); addThreaded(parts);
  const result = await inspect(a, parts);
  assert.equal(result.package.partialFailures.length, 0);
  assert.equal(result.xlsx.threadedComments.length, 2);
  assert.deepEqual(result.xlsx.threadedComments.map(item => item.cell), ['G8','G8']);
  assert.deepEqual(result.xlsx.threadedComments.map(item => item.author), ['Alex Example', 'Taylor Example']);
  assert.equal(result.xlsx.threadedComments[1].parentId, '{thread-1}');
  assert.equal(a.api.report(result).inspection.categoryCounts.comments, 2);
  a.api.setInspection(result);
  assert.match(a.w.document.querySelector('#xlsxFindingList').textContent, /Threaded comments/);
  assert.match(a.w.document.querySelector('#xlsxFindingList').textContent, /Reply/);
  assert.match(a.w.document.querySelector('#summaryPreviewList').textContent, /DO_NOT_EXPORT_COMMENT_ROOT/);
  assert.match(a.w.document.querySelector('#xlsxFindingList').textContent, /Taylor Example/);
});
test('both comment types contribute to findings and counts, while downloaded JSON contains no private text or author', async t => {
  const a = app({ savedLanguage: 'ja' }); t.after(a.close);
  const parts = await baseParts(a); addLegacy(parts); addThreaded(parts);
  await a.api.inspectSelectedFile(a.file('sensitive.xlsx', makeZip(parts)));
  const result = a.api.result; assert.ok(result);
  assert.equal(result.xlsx.comments.length, 1);
  assert.equal(result.xlsx.threadedComments.length, 2);
  assert.equal(a.api.report(result).inspection.categoryCounts.comments, 3);
  assert.equal(a.w.document.querySelector('#xlsxSectionCount').textContent, '3');
  a.w.document.querySelector('#languageButton').click();
  assert.match(a.w.document.querySelector('#xlsxFindingList').textContent, /Cell notes/);
  assert.match(a.w.document.querySelector('#xlsxFindingList').textContent, /Threaded comments/);
  a.w.document.querySelector('#downloadReportButton').click();
  const exported = await a.downloads.at(-1).blob.text();
  for (const value of ['sensitive.xlsx', 'Legacy Author', 'Alex Example', 'Taylor Example', 'DO_NOT_EXPORT_COMMENT_ROOT', 'DO_NOT_EXPORT_COMMENT_REPLY', 'Internal']) {
    assert.ok(!exported.includes(value), 'counts-only JSON must not include ' + value);
  }
  assert.equal(JSON.parse(exported).inspection.categoryCounts.comments, 3);
});
test('broken or missing referenced Excel comment part prevents cleanup and is not silently treated as safe', async t => {
  const a = app(); t.after(a.close);
  const parts = await baseParts(a); addLegacy(parts);
  parts.delete(legacyPath);
  const result = await inspect(a, parts);
  assert.ok(result.package.partialFailures.some(item => item.part === legacyPath));
  assert.ok(result.package.cleanupBlockedReasons.includes('partial'));
  assert.equal(a.api.report(result).inspection.completeness, 'partial');
  assert.equal(a.api.report(result).inspection.categoryCounts.comments, null);
  await assert.rejects(a.api.buildCleanedOfficeBytes(a.file('broken-comments.xlsx', makeZip(parts)), result, ['core:creator'], a.api.generation), error => error.code === 'cleanupBlocked');
});
test('malformed person list and comment XML become partial inspections', async t => {
  const a = app(); t.after(a.close);
  const parts = await baseParts(a); addThreaded(parts);
  setText(parts, personPath, '<personList><person');
  const missingPerson = await inspect(a, parts);
  assert.ok(missingPerson.package.partialFailures.some(item => item.part === personPath));
  assert.equal(missingPerson.package.cleanupBlockedReasons.includes('partial'), true);
  setText(parts, personPath, '<personList xmlns="' + threadedNs + '"><person id="{person-1}" displayName="Alex"/></personList>');
  setText(parts, threadedPath, '<ThreadedComments><threadedComment');
  const malformedComments = await inspect(a, parts);
  assert.ok(malformedComments.package.partialFailures.some(item => item.part === threadedPath));
  assert.equal(malformedComments.package.cleanupBlockedReasons.includes('partial'), true);
});
test('unreferenced comment ZIP parts are not mistaken for a worksheet comment', async t => {
  const a = app(); t.after(a.close);
  const parts = await baseParts(a);
  setText(parts, legacyPath, '<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><commentList><comment ref="C1" authorId="0"><text>Orphan</text></comment></commentList></comments>');
  const result = await inspect(a, parts);
  assert.deepEqual(result.xlsx.comments, []);
  assert.deepEqual(result.xlsx.threadedComments, []);
  assert.equal(a.api.report(result).inspection.categoryCounts.comments, 0);
});
