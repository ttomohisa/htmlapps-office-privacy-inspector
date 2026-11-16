const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { deflateRawSync } = require('node:zlib');
const { app } = require('./app-harness.cjs');

function checksum(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Repack only test fixtures into a small, standards-compliant stored ZIP.
function makeZip(parts) {
  const locals = []; const centrals = []; let offset = 0;
  for (const [name, value] of parts) {
    const data = Buffer.from(value); const nameBytes = Buffer.from(name, 'utf8');
    const crc = checksum(data);
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26); nameBytes.copy(local, 30);
    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(offset, 42); nameBytes.copy(central, 46);
    locals.push(local, data); centrals.push(central); offset += local.length + data.length;
  }
  const index = Buffer.concat(centrals); const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(parts.size, 8); end.writeUInt16LE(parts.size, 10);
  end.writeUInt32LE(index.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, index, end]);
}
async function fixtureParts(a, name) {
  const source = new Uint8Array(fs.readFileSync(path.join(__dirname, 'fixtures', name)));
  const entries = a.api.parseZipDirectory(source); const parts = new Map();
  for (const [entryName, entry] of entries) parts.set(entryName, Buffer.from(await a.api.readZipEntry(source, entry)));
  return parts;
}
function putText(parts, name, value) { parts.set(name, Buffer.from(value, 'utf8')); }
function addRelation(parts, path, id, type, target) {
  const empty = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const source = (parts.get(path) || Buffer.from(empty)).toString('utf8');
  const rel = '<Relationship Id="' + id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/' + type + '" Target="' + target + '"/>';
  assert.match(source, /<\/(?:\w+:)?Relationships>/);
  putText(parts, path, source.replace(/<\/(?:\w+:)?Relationships>/, rel + '$&'));
}
function noteRelsPath(part) {
  const slash = part.lastIndexOf('/');
  return part.slice(0, slash + 1) + '_rels/' + part.slice(slash + 1) + '.rels';
}

test('Word hidden runs inherit paragraph and character styles; an explicit off remains visible', async t => {
  const a = app(); t.after(a.close);
  const parts = await fixtureParts(a, 'clean.docx');
  const namespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const styles = '<?xml version="1.0"?><w:styles xmlns:w="' + namespace + '">' +
    '<w:style w:type="paragraph" w:styleId="PrivateParagraph"><w:rPr><w:vanish/></w:rPr></w:style>' +
    '<w:style w:type="character" w:styleId="PrivateCharacter"><w:rPr><w:vanish/></w:rPr></w:style></w:styles>';
  putText(parts, 'word/styles.xml', styles);
  const source = parts.get('word/document.xml').toString('utf8');
  const injected = '<w:p xmlns:w="' + namespace + '"><w:pPr><w:pStyle w:val="PrivateParagraph"/></w:pPr>' +
    '<w:r><w:t>INHERITED_PARAGRAPH_SECRET</w:t></w:r>' +
    '<w:r><w:rPr><w:vanish w:val="0"/></w:rPr><w:t>EXPLICITLY_VISIBLE</w:t></w:r></w:p>' +
    '<w:p xmlns:w="' + namespace + '"><w:r><w:rPr><w:rStyle w:val="PrivateCharacter"/></w:rPr>' +
    '<w:t>INHERITED_CHARACTER_SECRET</w:t></w:r></w:p>';
  assert.match(source, /<\/(?:\w+:)?body>/);
  putText(parts, 'word/document.xml', source.replace(/<\/(?:\w+:)?body>/, injected + '$&'));
  const result = await a.api.inspectOfficeFile(a.file('synthetic-hidden.docx', makeZip(parts)), a.api.generation, false);
  const texts = result.docx.hiddenText.map(item => item.text).join('\n');
  assert.match(texts, /INHERITED_PARAGRAPH_SECRET/);
  assert.match(texts, /INHERITED_CHARACTER_SECRET/);
  assert.doesNotMatch(texts, /EXPLICITLY_VISIBLE/);
});

test('PowerPoint notes with an image but no text are detected and can be removed', async t => {
  const a = app(); t.after(a.close);
  const parts = await fixtureParts(a, 'speaker-notes.pptx');
  const original = await a.api.inspectOfficeFile(a.file('original.pptx', makeZip(parts)), a.api.generation, false);
  assert.ok(original.pptx.notes.length > 0);
  const part = original.pptx.notes[0].part;
  let xml = parts.get(part).toString('utf8');
  xml = xml.replace(/(<(?:\w+:)?t>)[\s\S]*?(<\/(?:\w+:)?t>)/g, '$1$2');
  const spTree = xml.match(/<\/((?:\w+:)?)spTree>/);
  assert.ok(spTree, 'fixture must contain a note shape tree');
  xml = xml.replace(spTree[0], '<' + spTree[1] + 'pic/>' + spTree[0]);
  putText(parts, part, xml);
  const file = a.file('image-only-notes.pptx', makeZip(parts));
  const before = await a.api.inspectOfficeFile(file, a.api.generation, false);
  assert.ok(before.pptx.notes.some(note => note.part === part && note.text === ''));
  const cleaned = await a.api.buildCleanedOfficeBytes(file, before, ['pptx:notes:all'], a.api.generation);
  const after = await a.api.inspectOfficeFile(a.file('cleaned.pptx', cleaned), a.api.generation, false);
  assert.equal(after.pptx.notes.length, 0);
  a.api.validateCleanupReinspection(before, after, ['pptx:notes:all']);
  assert.ok(!a.api.parseZipDirectory(cleaned).has(part));
});

test('PowerPoint note-only media is removed, while shared slide media is retained', async t => {
  const a = app(); t.after(a.close);
  const parts = await fixtureParts(a, 'speaker-notes.pptx');
  const original = await a.api.inspectOfficeFile(a.file('original.pptx', makeZip(parts)), a.api.generation, false);
  assert.ok(original.pptx.notes.length > 0);
  const notePart = original.pptx.notes[0].part;
  const noteRels = noteRelsPath(notePart);
  const privateMedia = 'ppt/media/private-note-attachment.png';
  const sharedMedia = 'ppt/media/shared-note-attachment.png';
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9XqRAQAAAABJRU5ErkJggg==', 'base64');
  parts.set(privateMedia, image); parts.set(sharedMedia, image);
  addRelation(parts, noteRels, 'rIdNotePrivateMedia', 'image', '../media/private-note-attachment.png');
  addRelation(parts, noteRels, 'rIdNoteSharedMedia', 'image', '../media/shared-note-attachment.png');
  addRelation(parts, 'ppt/slides/_rels/slide1.xml.rels', 'rIdSlideSharedMedia', 'image', '../media/shared-note-attachment.png');
  const source = a.file('notes-with-images.pptx', makeZip(parts));
  const before = await a.api.inspectOfficeFile(source, a.api.generation, false);
  assert.ok(before.pptx.notes.length);
  const cleaned = await a.api.buildCleanedOfficeBytes(source, before, ['pptx:notes:all'], a.api.generation);
  const entries = a.api.parseZipDirectory(cleaned);
  assert.equal(entries.has(privateMedia), false, 'orphan media from the note must be removed');
  assert.equal(entries.has(sharedMedia), true, 'media still used on a slide must not be removed');
  const after = await a.api.inspectOfficeFile(a.file('cleaned.pptx', cleaned), a.api.generation, false);
  a.api.validateCleanupReinspection(before, after, ['pptx:notes:all']);
});

test('bounded decompression stops expansion before building a large buffer', async t => {
  const a = app(); t.after(a.close);
  const compressed = new Uint8Array(deflateRawSync(Buffer.alloc(4096, 65)));
  await assert.rejects(a.api.inflateRaw(compressed, 4096, 128), error => error.code === 'tooLarge');
});

test('ZIP entry CRC corruption is rejected and the Office inspection becomes partial', async t => {
  const a = app(); t.after(a.close);
  const parts = await fixtureParts(a, 'clean.docx');
  const zip = makeZip(parts);
  const entries = a.api.parseZipDirectory(zip);
  const entry = entries.get('word/document.xml'); assert.ok(entry);
  let offset = entries.zipMeta.centralOffset;
  while (offset < entries.zipMeta.eocdOffset) {
    const length = zip.readUInt16LE(offset + 28);
    const name = zip.subarray(offset + 46, offset + 46 + length).toString('utf8');
    if (name === entry.name) break;
    offset += 46 + length + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
  }
  assert.ok(offset < entries.zipMeta.eocdOffset);
  zip.writeUInt32LE(0, offset + 16);
  await assert.rejects(a.api.readZipEntry(zip, a.api.parseZipDirectory(zip).get(entry.name)), error => error.code === 'broken');
  const inspected = await a.api.inspectOfficeFile(a.file('crc-invalid.docx', zip), a.api.generation, false);
  assert.ok(inspected.package.partialFailures.some(failure => failure.part === entry.name));
  assert.ok(inspected.package.cleanupBlockedReasons.includes('partial'));
});

test('View findings scrolls to actual XLSX findings rather than empty metadata', async t => {
  const a = app(); t.after(a.close);
  const result = await a.api.inspectOfficeFile(a.file('hidden-sheet.xlsx'), a.api.generation, false);
  assert.ok(result.xlsx.hiddenSheets.length > 0);
  result.core = {}; result.extended = {}; result.custom = [];
  a.api.setInspection(result);
  let target = '';
  a.w.document.getElementById('reviewSection').scrollIntoView = () => { target = 'review'; };
  a.w.document.getElementById('xlsxSection').scrollIntoView = () => { target = 'xlsx'; };
  a.w.document.getElementById('jumpToFindingsButton').click();
  assert.equal(target, 'xlsx');
});


test('ZIP rejects a local method mismatch and an oversized declared entry', async t => {
  const a = app(); t.after(a.close);
  const parts = new Map([['sample.xml', Buffer.from('<sample/>')]]);
  const mismatch = makeZip(parts);
  mismatch.writeUInt16LE(8, 8); // The central directory still declares method 0.
  const entry = a.api.parseZipDirectory(mismatch).get('sample.xml');
  await assert.rejects(a.api.readZipEntry(mismatch, entry), error => error.code === 'broken');

  const huge = makeZip(parts);
  const index = huge.readUInt32LE(huge.length - 22 + 16);
  huge.writeUInt32LE(128 * 1024 * 1024 + 1, index + 24);
  const hugeEntry = a.api.parseZipDirectory(huge).get('sample.xml');
  await assert.rejects(a.api.readZipEntry(huge, hugeEntry), error => error.code === 'tooLarge');
});


test('PowerPoint geometry-only note shapes are not mistaken for empty placeholders', async t => {
  const a = app(); t.after(a.close);
  const parts = await fixtureParts(a, 'speaker-notes.pptx');
  const original = await a.api.inspectOfficeFile(a.file('original.pptx', makeZip(parts)), a.api.generation, false);
  const part = original.pptx.notes[0].part;
  let xml = parts.get(part).toString('utf8').replace(/(<(?:\w+:)?t>)[\s\S]*?(<\/(?:\w+:)?t>)/g, '$1$2');
  const spTree = xml.match(/<\/((?:\w+:)?)spTree>/); assert.ok(spTree);
  xml = xml.replace(spTree[0], '<' + spTree[1] + 'sp><' + spTree[1] + 'spPr/></' + spTree[1] + 'sp>' + spTree[0]);
  putText(parts, part, xml);
  const report = await a.api.inspectOfficeFile(a.file('shape-only-note.pptx', makeZip(parts)), a.api.generation, false);
  assert.ok(report.pptx.notes.some(note => note.part === part && note.text === ''));
});

test('Word document-wide hidden default style respects direct reveal formatting', async t => {
  const a = app(); t.after(a.close);
  const parts = await fixtureParts(a, 'clean.docx');
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  putText(parts, 'word/styles.xml', '<?xml version="1.0"?><w:styles xmlns:w="' + ns + '"><w:docDefaults><w:rPrDefault><w:rPr><w:vanish/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>');
  const xml = parts.get('word/document.xml').toString('utf8');
  const paragraph = '<w:p xmlns:w="' + ns + '"><w:r><w:t>HIDDEN_BY_DEFAULT</w:t></w:r>' +
    '<w:r><w:rPr><w:vanish w:val="0"/></w:rPr><w:t>VISIBLE_BY_OVERRIDE</w:t></w:r></w:p>';
  putText(parts, 'word/document.xml', xml.replace(/<\/(?:\w+:)?body>/, paragraph + '$&'));
  const result = await a.api.inspectOfficeFile(a.file('default-hidden.docx', makeZip(parts)), a.api.generation, false);
  const hidden = result.docx.hiddenText.map(item => item.text).join('\n');
  assert.match(hidden, /HIDDEN_BY_DEFAULT/);
  assert.doesNotMatch(hidden, /VISIBLE_BY_OVERRIDE/);
});
