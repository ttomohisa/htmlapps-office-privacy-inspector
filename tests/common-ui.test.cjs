const assert=require('node:assert/strict');
const test=require('node:test');
const {app}=require('./app-harness.cjs');
const q=(a,id)=>a.w.document.querySelector('#'+id);

test('language preserves raw cleanup/report filename drafts, selected targets and expanded findings',async t=>{
 const a=app();t.after(a.close);await a.api.inspectSelectedFile(a.file('core-properties.docx'));await a.api.createCleanedCopy();
 q(a,'cleanupFilenameInput').value=' raw / draft ';q(a,'reportFilenameInput').value=' report / draft ';
 const selected=Array.from(a.w.document.querySelectorAll('[data-cleanup-target]:checked'),x=>x.dataset.cleanupTarget);
 const details=a.w.document.querySelector('details');details.open=true;q(a,'languageButton').click();
 assert.equal(q(a,'cleanupFilenameInput').value,' raw / draft ');assert.equal(q(a,'reportFilenameInput').value,' report / draft ');
 assert.deepEqual(Array.from(a.w.document.querySelectorAll('[data-cleanup-target]:checked'),x=>x.dataset.cleanupTarget),selected);
 assert.equal(a.w.document.querySelector('details').open,true);
});

test('changed cleanup selection and failed recreation retain prior Office bytes and previous-result scope',async t=>{
 const a=app();t.after(a.close);await a.api.inspectSelectedFile(a.file('core-properties.docx'));await a.api.createCleanedCopy();const previous=a.api.output;
 const choice=a.w.document.querySelector('[data-cleanup-target]');choice.checked=!choice.checked;choice.dispatchEvent(new a.w.Event('change'));
 assert.equal(a.api.output.blob,previous.blob);assert.match(q(a,'cleanupPreviousNotice').textContent,/Previous result/);
 a.w.console.error=()=>{};a.api.interceptBuild(async()=>{throw Error('synthetic rewrite failure')});await a.api.createCleanedCopy();
 assert.equal(a.api.output.blob,previous.blob);assert.equal(a.api.output.url,previous.url);assert.match(q(a,'operationStatus').textContent,/Could not create/);
 q(a,'languageButton').click();assert.ok(q(a,'operationStatus').textContent);q(a,'downloadCleanedButton').click();
 assert.equal(a.downloads.at(-1).blob,previous.blob);assert.equal(q(a,'downloadCleanedButton').disabled,false);
});

for(const extension of ['docx','xlsx','pptx'])test('shared cleanup delivery preserves format and source bytes: '+extension,async t=>{
 const a=app();t.after(a.close);const file=a.file('core-properties.'+extension);const original=Buffer.from(await file.arrayBuffer());await a.api.inspectSelectedFile(file);await a.api.createCleanedCopy();
 q(a,'cleanupFilenameInput').value='edited-output';q(a,'downloadCleanedButton').click();const delivery=a.downloads.at(-1);assert.equal(delivery.filename,'edited-output.'+extension);
 assert.deepEqual(Buffer.from(await file.arrayBuffer()),original);const after=await a.api.inspectOfficeFile(new File([await delivery.blob.arrayBuffer()],delivery.filename),a.api.generation,false);
 assert.equal(after.file.format,extension);assert.equal(after.core.creator,'');assert.match(q(a,'cleanupSaveStatus').textContent,/Download started/);
});


test('language uses URL/common/legacy/browser priority without startup writes',t=>{
 for(const [options,expected] of [[{url:'https://test.invalid/?lang=ja',commonLanguage:'en'},'ja'],[{commonLanguage:'ja',savedLanguage:'en'},'ja'],[{savedLanguage:'ja'},'ja'],[{language:'fr',languages:['fr','ja-JP','en-US']},'ja'],[{language:'fr',languages:['fr']},'en']]){
  const a=app(options);t.after(a.close);assert.equal(a.w.document.documentElement.lang,expected);assert.deepEqual(a.storageWrites,[]);
  q(a,'languageButton').click();assert.equal(a.storageWrites.length,1);assert.equal(a.storageWrites[0][0],'browser-kitty:ui-language:v1');
 }
});
test('open cleanup confirmation translates exact source/count and cancel retains findings',async t=>{
 const a=app();t.after(a.close);await a.api.inspectSelectedFile(a.file('comments.docx'));
 const checkbox=a.w.document.querySelector('[data-cleanup-target="docx:comments"]');checkbox.checked=true;checkbox.dispatchEvent(new a.w.Event('change'));
 const before=a.api.result,pending=a.api.createCleanedCopy();assert.equal(q(a,'appConfirmDialog').open,true);assert.equal(a.w.document.activeElement,q(a,'appConfirmCancel'));
 q(a,'languageButton').click();assert.match(q(a,'appConfirmMessage').textContent,/comments.docx/);assert.match(q(a,'appConfirmMessage').textContent,/元ファイル/);
 q(a,'appConfirmCancel').click();await pending;assert.equal(a.api.result,before);assert.equal(a.api.output.blob,null);
});
test('download failure stays visible across language and retains cleaned copy for retry',async t=>{
 const a=app();t.after(a.close);await a.api.inspectSelectedFile(a.file('core-properties.docx'));await a.api.createCleanedCopy();const before=a.api.output;
 a.w.HTMLAnchorElement.prototype.click=function(){throw Error('download blocked')};q(a,'downloadCleanedButton').click();assert.match(q(a,'operationStatus').textContent,/Could not start/);
 q(a,'languageButton').click();assert.match(q(a,'operationStatus').textContent,/保存を開始できません/);assert.equal(a.api.output.blob,before.blob);
 a.w.console.error=()=>{};a.w.URL.createObjectURL=()=>{throw Error('URL allocation failed')};await a.api.createCleanedCopy();assert.equal(a.api.output.blob,before.blob);assert.equal(a.api.output.url,before.url);
 await a.api.resetApp(false);assert.equal(q(a,'operationStatus').textContent,'');
});


test('pending discard for source A cannot discard a newer source B',async t=>{
 const a=app();t.after(a.close);await a.api.inspectSelectedFile(a.file('clean.docx'));const pending=a.api.resetApp();
 await a.api.inspectSelectedFile(a.file('clean.xlsx'));q(a,'appConfirmOk').click();await pending;
 assert.equal(a.api.result.file.format,'xlsx');assert.equal(q(a,'resultState').hidden,false);
});


test('ordinary retry reinspection failure preserves verified Office output and current-attempt error',async t=>{
 const a=app();t.after(a.close);await a.api.inspectSelectedFile(a.file('core-properties.docx'));await a.api.createCleanedCopy();
 const previous=a.api.output,after=a.api.after;assert.ok(after);q(a,'cleanupFilenameInput').value=' kept / draft ';
 const choice=a.w.document.querySelector('[data-cleanup-target]');choice.checked=!choice.checked;choice.dispatchEvent(new a.w.Event('change'));
 a.w.console.error=()=>{};a.api.interceptInspection(async()=>{throw Error('ordinary decoder failure')});await a.api.createCleanedCopy();
 assert.equal(a.api.output.blob,previous.blob);assert.equal(a.api.output.url,previous.url);assert.equal(a.api.after,after);
 assert.deepEqual(a.api.output.targets,previous.targets);assert.ok(!a.revoked.includes(previous.url));assert.equal(a.blobs.size,1);
 assert.equal(q(a,'cleanupFilenameInput').value,' kept / draft ');assert.match(q(a,'cleanupPreviousNotice').textContent,/Previous result/);
 assert.match(q(a,'operationStatus').textContent,/Could not create/);assert.match(q(a,'operationStatus').textContent,/ordinary decoder failure/);
 q(a,'languageButton').click();assert.match(q(a,'operationStatus').textContent,/作成できません/);assert.match(q(a,'operationStatus').textContent,/ordinary decoder failure/);
 q(a,'downloadReportButton').click();const report=JSON.parse(await a.downloads.at(-1).blob.text());assert.equal(report.cleanup.status,'verified');assert.equal(report.cleanup.after.categoryCounts.metadata,0);
 q(a,'downloadCleanedButton').click();assert.equal(a.downloads.at(-1).blob,previous.blob);assert.equal(a.downloads.at(-1).filename,'kept - draft.docx');
});

test('first cleanup ordinary reinspection failure still offers partial Office output with unknown after counts',async t=>{
 const a=app();t.after(a.close);await a.api.inspectSelectedFile(a.file('core-properties.docx'));
 a.w.console.error=()=>{};a.api.interceptInspection(async()=>{throw Error('first decoder failure')});await a.api.createCleanedCopy();
 assert.ok(a.api.output.blob);assert.ok(a.api.output.url);assert.equal(a.api.after,null);assert.equal(q(a,'cleanupReinspectionWarning').hidden,false);
 assert.equal(q(a,'downloadCleanedButton').disabled,false);assert.equal(a.revoked.length,0);assert.equal(q(a,'operationStatus').textContent,'');
 q(a,'downloadReportButton').click();const report=JSON.parse(await a.downloads.at(-1).blob.text());assert.equal(report.cleanup.status,'reinspection_failed');assert.equal(report.cleanup.after,null);
 assert.ok(!JSON.stringify(report).includes('first decoder failure'));q(a,'downloadCleanedButton').click();assert.equal(a.downloads.at(-1).blob,a.api.output.blob);
});
