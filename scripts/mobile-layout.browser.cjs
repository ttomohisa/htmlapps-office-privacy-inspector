'use strict';
// Bounded native layout regression. Inputs are synthetic, with no personal data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const cfg = {"slug": "office-privacy-inspector", "bp": 720, "nav": "#mobileResultActions", "header": "#helpDialog .dialog-header", "body": "#helpDialog > .dialog-body", "details": "#helpDialog .help-build details", "ids": ["buildVersion", "builtAt", "dependencyCount"], "end": "#dependencyCount", "hideBuild": false};
const evidence = path.resolve('test-results/mobile-layout');
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function bounds(locator, width, height, label, vertical = true) {
  const r = await locator.boundingBox();
  assert.ok(r && r.x >= -1 && r.x + r.width <= width + 1 && (!vertical || (r.y >= -1 && r.y + r.height <= height + 1)), label + ': bounds ' + JSON.stringify(r));
}
async function metadata(page, rendered) {
  for (const id of cfg.ids) {
    assert.equal(await page.locator('#' + id).count(), 1, id + ' unique');
    assert.equal(await page.locator('#helpDialog #' + id).count(), 1, id + ' inside Help');
    assert.equal(await page.locator('main #' + id).count(), 0, id + ' removed from main');
  }
  assert.match(await page.locator('#buildVersion').textContent(), /^\d+\.\d+\.\d+$/);
  assert.match(await page.locator('#builtAt').textContent(), /^\d{4}-\d\d-\d\dT/);
  if (cfg.slug === 'ffmpeg-filter-builder') {
    assert.equal(await page.locator('#builderVersion').textContent(), rendered ? 'v1.10.2' : '—', 'preserve lazy runtime population');
    for (const id of ['threadMode', 'isolationValue', 'filterCount', 'encoderList', 'workerCount']) {
      assert.equal(await page.locator('#' + id).count(), 1);
      assert.equal(await page.locator('main #' + id).count(), 1, id + ' remains operational');
    }
    assert.equal(await page.locator('#isolationValue').textContent(), 'false', 'file mode remains non-isolated');
    if (rendered) {
      assert.equal(await page.locator('#threadMode').textContent(), 'single-thread');
      assert.match(await page.locator('#filterCount').textContent(), /^[1-9]\d*$/);
      assert.match(await page.locator('#encoderList').textContent(), /libx264/);
      assert.equal(await page.locator('#workerCount').textContent(), '0');
    }
  } else assert.match(await page.locator('#dependencyCount').textContent(), /^\d+$/);
}
// Check rendered geometry, including clipping by an ancestor (isVisible alone misses it).
async function auditHeader(page, label) {
  const badge = page.locator('header #versionBadge');
  assert.equal(await badge.textContent(), 'v' + require('../app.config.json').version, label + ': current header version');
  assert.equal(await badge.isVisible(), true, label + ': version visible');
  const clipped = await badge.evaluate(el => {
    const r = el.getBoundingClientRect(), problems = [];
    if (r.width <= 0 || r.height <= 0 || r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) problems.push('outside viewport');
    if (el.scrollWidth > el.clientWidth + 1) problems.push('version text clipped');
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      if (/hidden|clip|auto|scroll/.test(s.overflowX) && (r.left < b.left - 1 || r.right > b.right + 1)) problems.push('ancestor clips x: ' + p.className);
      if (/hidden|clip|auto|scroll/.test(s.overflowY) && (r.top < b.top - 1 || r.bottom > b.bottom + 1)) problems.push('ancestor clips y: ' + p.className);
    }
    return problems;
  });
  assert.deepEqual(clipped, [], label + ': complete header version remains readable');
  const help = page.locator('#helpButton svg');
  assert.equal(await help.isVisible(), true, label + ': Help icon visible');
  assert.ok(await help.evaluate(svg => {
    const paths = [...svg.querySelectorAll('path')], shape = paths.map(p => p.getAttribute('d')).join(' ');
    return /[aAcC]/.test(shape) && paths.some(p => /[hH]\.01/.test(p.getAttribute('d')) && getComputedStyle(p).strokeLinecap === 'round') && svg.getBBox().width > 0;
  }), label + ': question-mark curve and painted dot, not information icon');
  const shield = page.locator('.local-badge svg');
  if (await shield.count()) {
    assert.ok(await shield.evaluate(svg => [...svg.querySelectorAll('path')].some(p => /^M12 3 5 6/.test(p.getAttribute('d')))), label + ': local-processing shield');
  }
}

async function main() {
  fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch();
  try {
    const cases = [];
    for (const language of ['ja', 'en']) for (const [width, height] of [[1360,900], [cfg.bp+1,568], [cfg.bp,568], [320,568], [360,640], [390,844], [393,252]]) cases.push({ file:'dist/index.html', language, width, height });
    cases.push({file:'dist/index.self-extract.html',language:'en',width:360,height:640}, {file:cfg.slug+'.html',language:'ja',width:1360,height:900});
    if (cfg.slug === 'ffmpeg-filter-builder') cases.push({file:'dist/index.mt.html',language:'en',width:320,height:568}, {file:cfg.slug+'.mt.html',language:'ja',width:1360,height:900});
    for (const {file, language, width, height} of cases) {
      const context = await browser.newContext({ viewport:{width,height}, locale:language, reducedMotion:'reduce' });
      const page = await context.newPage(), errors = [], requests = [], label = `${file} ${language} ${width}x${height}`;
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
      let rendered = false;
      try {
        await page.goto(pathToFileURL(path.resolve(file)).href);
        await page.locator('#helpButton').waitFor();
        await page.waitForFunction(() => /^\d+\.\d+\.\d+$/.test(document.querySelector('#buildVersion').textContent));
        if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#languageButton').click();
        assert.equal((await page.locator('[data-i18n="localBadge"]').textContent()).trim(), language === 'ja' ? '完全ローカル処理' : 'Fully local processing');
        await bounds(page.locator('.local-badge'), width, height, label, false);
        assert.equal(await page.locator('body > footer').isVisible(), width > cfg.bp, label + ': initial footer');
        assert.equal(await page.locator(cfg.nav).isVisible(),false,'no document yet');
        // Four-entry stored DOCX built solely from synthetic XML for this regression.
        await page.locator('#fileInput').setInputFiles({name:'synthetic-layout.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from('UEsDBBQAAAAAAHOoV11JuY+y6AEAAOgBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbDxUeXBlcyB4bWxucz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3BhY2thZ2UvMjAwNi9jb250ZW50LXR5cGVzIj48RGVmYXVsdCBFeHRlbnNpb249InJlbHMiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtcGFja2FnZS5yZWxhdGlvbnNoaXBzK3htbCIvPjxEZWZhdWx0IEV4dGVuc2lvbj0ieG1sIiBDb250ZW50VHlwZT0iYXBwbGljYXRpb24veG1sIi8+PE92ZXJyaWRlIFBhcnROYW1lPSIvd29yZC9kb2N1bWVudC54bWwiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5kb2N1bWVudC5tYWluK3htbCIvPjxPdmVycmlkZSBQYXJ0TmFtZT0iL2RvY1Byb3BzL2NvcmUueG1sIiBDb250ZW50VHlwZT0iYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLXBhY2thZ2UuY29yZS1wcm9wZXJ0aWVzK3htbCIvPjwvVHlwZXM+UEsDBBQAAAAAAHOoV126btBNfwEAAH8BAAALAAAAX3JlbHMvLnJlbHM8UmVsYXRpb25zaGlwcyB4bWxucz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3BhY2thZ2UvMjAwNi9yZWxhdGlvbnNoaXBzIj48UmVsYXRpb25zaGlwIElkPSJyMSIgVHlwZT0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL29mZmljZURvY3VtZW50LzIwMDYvcmVsYXRpb25zaGlwcy9vZmZpY2VEb2N1bWVudCIgVGFyZ2V0PSJ3b3JkL2RvY3VtZW50LnhtbCIvPjxSZWxhdGlvbnNoaXAgSWQ9InIyIiBUeXBlPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvcGFja2FnZS8yMDA2L3JlbGF0aW9uc2hpcHMvbWV0YWRhdGEvY29yZS1wcm9wZXJ0aWVzIiBUYXJnZXQ9ImRvY1Byb3BzL2NvcmUueG1sIi8+PC9SZWxhdGlvbnNoaXBzPlBLAwQUAAAAAABzqFddGAXCVqsAAACrAAAAEQAAAHdvcmQvZG9jdW1lbnQueG1sPHc6ZG9jdW1lbnQgeG1sbnM6dz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3dvcmRwcm9jZXNzaW5nbWwvMjAwNi9tYWluIj48dzpib2R5Pjx3OnA+PHc6cj48dzp0PlN5bnRoZXRpYyBsYXlvdXQgZml4dHVyZS48L3c6dD48L3c6cj48L3c6cD48L3c6Ym9keT48L3c6ZG9jdW1lbnQ+UEsDBBQAAAAAAHOoV10vKmVq1gAAANYAAAARAAAAZG9jUHJvcHMvY29yZS54bWw8Y3A6Y29yZVByb3BlcnRpZXMgeG1sbnM6Y3A9Imh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9wYWNrYWdlLzIwMDYvbWV0YWRhdGEvY29yZS1wcm9wZXJ0aWVzIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPjxkYzpjcmVhdG9yPlN5bnRoZXRpYyBMYXlvdXQgQXV0aG9yPC9kYzpjcmVhdG9yPjwvY3A6Y29yZVByb3BlcnRpZXM+UEsBAhQDFAAAAAAAc6hXXUm5j7LoAQAA6AEAABMAAAAAAAAAAAAAAIABAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAMUAAAAAABzqFddum7QTX8BAAB/AQAACwAAAAAAAAAAAAAAgAEZAgAAX3JlbHMvLnJlbHNQSwECFAMUAAAAAABzqFddGAXCVqsAAACrAAAAEQAAAAAAAAAAAAAAgAHBAwAAd29yZC9kb2N1bWVudC54bWxQSwECFAMUAAAAAABzqFddLyplatYAAADWAAAAEQAAAAAAAAAAAAAAgAGbBAAAZG9jUHJvcHMvY29yZS54bWxQSwUGAAAAAAQABAD4AAAAoAUAAAAA','base64')});
        await page.locator('#resultState').waitFor();
        assert.equal(await page.locator('#resultHeading').textContent(),'synthetic-layout.docx');
        await page.waitForFunction(()=>!document.querySelector('#mobileCleanupButton').disabled);
        for (const w of [cfg.bp+1, cfg.bp, width]) {
          await page.setViewportSize({width:w,height}); await settle(page);
          assert.equal(await page.locator('body > footer').isVisible(), w > cfg.bp, label + ': footer resize');
          assert.equal(await page.locator(cfg.nav).isVisible(), w <= cfg.bp, label + ': functional bar');
          if (w <= cfg.bp) await bounds(page.locator(cfg.nav), w, height, label);
        }
        await page.evaluate(() => scrollTo({left:0,top:0,behavior:'instant'})); await settle(page);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ': page width');
        await auditHeader(page, label);
        if (file === 'dist/index.html' && [320,360,390,1360].includes(width)) await page.screenshot({path:path.join(evidence, `${language}-${width}-main.png`)});
        await page.locator('#helpButton').click();
        const visibleHelpText = await page.locator('#helpDialog').innerText();
        assert.doesNotMatch(visibleHelpText, /(?:EN\s*\/\s*JA|JA\s*[\/／]\s*EN|ヘッダーのEN|Use EN in the header)/, label + ': redundant language instructions removed');

        const body = page.locator(cfg.body), details = page.locator(cfg.details);
        await metadata(page, rendered);
        assert.ok(await body.evaluate(e => e.lastElementChild.classList.contains('help-build')), label + ': final Help child');
        const hiddenBuild = cfg.hideBuild && width <= cfg.bp;
        assert.equal(await details.isVisible(), !hiddenBuild, label + ': preserve metadata visibility');
        if (!hiddenBuild) {
          assert.equal(await details.evaluate(e => e.open), false);
          const summary = details.locator('summary');
          await summary.scrollIntoViewIfNeeded(); await summary.focus(); await page.keyboard.press('Enter');
          assert.equal(await details.evaluate(e => e.open), true);
          assert.equal(await page.locator('#helpDialog').isVisible(), true, label + ': keyboard disclosure stays inside Help');
        }
        await body.evaluate(e => { e.scrollTop = e.scrollHeight; }); await settle(page);
        const end = page.locator(hiddenBuild ? '[data-i18n="helpTouchBody"]' : cfg.end);
        const last = await end.evaluate(el => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let node, last;
          while (node = walker.nextNode()) if (node.textContent.trim()) last = node;
          if (!last) throw Error('No final Help text');
          const range = document.createRange(); range.setStart(last,last.textContent.trimEnd().length-1); range.setEnd(last,last.textContent.trimEnd().length);
          const r = range.getBoundingClientRect(); let top = 0, bottom = innerHeight;
          for (let p = el.parentElement; p; p = p.parentElement) if (/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)) {
            const b = p.getBoundingClientRect(); top = Math.max(top,b.top); bottom = Math.min(bottom,b.bottom);
          }
          return {top:r.top,bottom:r.bottom,clipTop:top,clipBottom:bottom};
        });
        assert.ok(last.top >= last.clipTop-1 && last.bottom <= last.clipBottom+1, label + ': Help end ' + JSON.stringify(last));
        assert.ok(await body.evaluate(e => e.scrollWidth <= e.clientWidth+1), label + ': Help width');
        await bounds(page.locator(cfg.header), width, height, label);
        const chrome = await page.locator(cfg.header).evaluate(header => {
          const rect = e => { const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; };
          return {header:rect(header),dialog:rect(header.closest('dialog')),title:rect(header.querySelector('h2')),close:rect(header.querySelector('button'))};
        });
        for (const key of ['title','close']) {
          const r=chrome[key], h=chrome.header, d=chrome.dialog;
          assert.ok(r.x>=Math.max(h.x,d.x)-1 && r.x+r.width<=Math.min(h.x+h.width,d.x+d.width)+1 && r.y>=Math.max(h.y,d.y)-1 && r.y+r.height<=Math.min(h.y+h.height,d.y+d.height)+1, label+': Help '+key+' containment '+JSON.stringify(chrome));
        }
        if (file==='dist/index.html' && [1360,320].includes(width)) { await settle(page); await page.screenshot({path:path.join(evidence,`${language}-${width}.png`)}); }
        const box=await page.locator('#helpDialog').boundingBox();
        const point=[[1,1],[width-1,1],[1,height-1],[width-1,height-1]].find(([x,y])=>x<box.x||x>box.x+box.width||y<box.y||y>box.y+box.height);
        assert.ok(point,label+': genuine backdrop');
        const before=await page.evaluate(()=>({root:scrollY,main:document.querySelector('main').scrollTop}));
        await page.mouse.move(...point); await page.mouse.wheel(0,400); await page.waitForTimeout(100);
        assert.deepEqual(await page.evaluate(()=>({root:scrollY,main:document.querySelector('main').scrollTop})),before,label+': background locked');
        await page.keyboard.press('Escape'); assert.equal(await page.locator('#helpDialog').isVisible(),false);
        await page.locator('#languageButton').click(); await page.locator('#languageButton').click(); await metadata(page,rendered);
        await page.locator('#helpButton').click(); await page.locator('#closeHelpButton').click(); assert.equal(await page.locator('#helpDialog').isVisible(),false);
        assert.deepEqual(errors,[],label+': console errors'); assert.deepEqual(requests,[],label+': runtime requests');
        console.log('PASS '+label);
      } catch (e) { await page.screenshot({path:path.join(evidence,'failure.png')}).catch(()=>{}); throw new Error(label+': '+e.message,{cause:e}); }
      finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
