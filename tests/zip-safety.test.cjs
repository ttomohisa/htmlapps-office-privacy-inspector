const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const source = fs.readFileSync(process.env.OFFICE_TEST_HTML || path.join(__dirname, '../src/index.template.html'), 'utf8');
const slice = (a, b) => source.slice(source.indexOf(a), source.indexOf(b, source.indexOf(a)));
const context = vm.createContext({Uint8Array, DataView, TextDecoder, Map});
vm.runInContext(slice('      class AppError', '      function cancelActiveRead') + slice('      function u16', '      async function inflateRaw') + 'globalThis.parseZipDirectory = parseZipDirectory', context);
function archive(names, method = 0) {
  const parts = []; let offset = 0; const records = [];
  for (const name of names) {
    const encoded = Buffer.from(name); const local = Buffer.alloc(30 + encoded.length);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(method, 8); local.writeUInt16LE(encoded.length, 26); encoded.copy(local, 30);
    const central = Buffer.alloc(46 + encoded.length); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 6); central.writeUInt16LE(method, 10); central.writeUInt16LE(encoded.length, 28); central.writeUInt32LE(offset, 42); encoded.copy(central, 46);
    parts.push(local); records.push(central); offset += local.length;
  }
  const central = Buffer.concat(records); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(names.length, 8); end.writeUInt16LE(names.length, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, central, end]);
}
for (const names of [['docProps/core.xml', 'docProps/core.xml'], ['docProps/core.xml', 'docProps\\core.xml'], ['docProps\\core.xml', 'docProps/core.xml']]) {
  test(`reject duplicate normalized ZIP names: ${names.join(', ')}`, () => {
    assert.throws(() => context.parseZipDirectory(archive(names)), error => error.code === 'broken');
  });
}
for (const method of [0, 8]) test(`unique ZIP entries remain readable, method ${method}`, () => {
  assert.equal(context.parseZipDirectory(archive(['[Content_Types].xml', 'docProps/core.xml'], method)).size, 2);
});
test('malformed ZIP remains rejected', () => assert.throws(() => context.parseZipDirectory(Buffer.from('broken')), error => error.code === 'broken'));
test('ZIP64 sentinel remains rejected', () => { const bytes = archive(['a']); bytes.writeUInt16LE(0xffff, bytes.length - 12); assert.throws(() => context.parseZipDirectory(bytes), error => error.code === 'broken'); });
test('encrypted central entry remains rejected', () => { const bytes = archive(['a']); bytes.writeUInt16LE(1, bytes.readUInt32LE(bytes.length - 6) + 8); assert.throws(() => context.parseZipDirectory(bytes), error => error.code === 'encrypted'); });
