const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
function app() {
  const source = fs.readFileSync(process.env.OFFICE_TEST_HTML || path.join(__dirname, '../src/index.template.html'), 'utf8');
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.config.json')));
  const dom = new JSDOM(source.replace(/<script>[\s\S]*?<\/script>/g, ''), { url: 'https://test.invalid', runScripts: 'outside-only' });
  const w = dom.window; const blobs = new Map(); const downloads = []; const revoked = [];
  Object.assign(w, { TextEncoder, TextDecoder, Uint8Array, Uint32Array, DataView, Blob, File, Response, CompressionStream, DecompressionStream });
  w.requestAnimationFrame = callback => callback();
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.URL.createObjectURL = blob => { const url = `blob:test-${blobs.size}`; blobs.set(url, blob); return url; };
  w.URL.revokeObjectURL = url => { revoked.push(url); };
  w.HTMLAnchorElement.prototype.click = function () { downloads.push({ filename: this.download, blob: blobs.get(this.href), url: this.href }); };
  w.FileReader = class {
    static LOADING = 1;
    readAsArrayBuffer(file) { this.readyState = 1; file.arrayBuffer().then(bytes => { if (this.readyState !== 1) return; this.readyState = 2; this.result = bytes; this.onload?.(); }, error => { this.readyState = 2; this.error = error; this.onerror?.(); }); }
    abort() { this.readyState = 2; this.onabort?.(); }
  };
  let code = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  code = code.replace('__APP_CONFIG_JSON__', JSON.stringify(config)).replace('__BUILD_MANIFEST_JSON__', '{}').replace('__EMBEDDED_ASSET_BUNDLE_JSON__', '{}');
  code = code.replace(/\}\)\(\);\s*$/, `window.testApi = {
    inspectSelectedFile, resetApp, inspectOfficeFile, parseZipDirectory, readZipEntry, readZipText, rebuildZip,
    buildCleanedOfficeBytes, validateCleanupReinspection, createCleanedCopy, updateCleanupSelection,
    get result() { return currentResult; }, get after() { return cleanupAfterResult; },
    get generation() { return sourceGeneration; },
    interceptInspection(interceptor) { const original = inspectOfficeFile; inspectOfficeFile = (...args) => interceptor(original, ...args); },
    report: typeof createInspectionReport === 'function' ? createInspectionReport : null,
    setInspection: result => { currentResult = result; renderResult(result); showOnly('result'); },
    setCleanup: (after, error = null) => { cleanupAfterResult = after; cleanupReinspectionError = error; cleanupBlob = new Blob(['test']); }
  }; })();`);
  w.eval(code);
  return { w, api: w.testApi, downloads, blobs, revoked, close: () => w.close(), file: (name, bytes) => new File([bytes || fs.readFileSync(path.join(__dirname, 'fixtures', name))], name) };
}
module.exports = { app };
