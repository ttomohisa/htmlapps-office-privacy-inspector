# Test fixtures

Small local fixtures used for Office Privacy Inspector v1.0.0 regression checks.

- `punctuation-author.pptx`: Core Properties intentionally store `.` for Creator and Last Modified By to verify literal-value display in the summary.

Common / v0.1 foundation:

- `clean.docx` / `clean.xlsx` — baseline packages with no format-specific privacy findings expected.
- `core-properties.docx` / `core-properties.xlsx` / `core-properties.pptx` — common metadata inspection.
- `custom-properties.docx` — custom properties.
- `broken.docx` — invalid package error handling.
- `not-office.txt` — unsupported input handling.

DOCX Inspector v0.2.0:

- `comments.docx` — Word comments with multiple authors.
- `tracked-changes.docx` — insertions, deletions, and a formatting/property revision.
- `hidden-text.docx` — direct hidden text plus hidden character-style inheritance.
- `rsid.docx` — editing-session identifiers.
- `external-template.docx` — external hyperlink and attached template relationship.
- `custom-xml.docx` — Custom XML part.
- `embedded-object.docx` — embedded binary object.
- `docx-inspector-all.docx` — combined v0.2.0 Word findings.

XLSX Inspector v0.3.0:

- `hidden-sheet.xlsx` — hidden worksheet.
- `very-hidden-sheet.xlsx` — Very Hidden worksheet.
- `hidden-rows-columns.xlsx` — hidden rows and columns.
- `external-link.xlsx` — external workbook relationship, worksheet formula, and chart formula.
- `hidden-defined-name.xlsx` — hidden and external defined names.
- `connection.xlsx` — database/web connection metadata; the fixture intentionally contains a fake password to verify the UI does not expose the connection string.
- `pivot-cache.xlsx` — Pivot Cache part.
- `slicer-cache.xlsx` — Slicer Cache part.
- `embedded-object.xlsx` — embedded binary object.
- `macro-parts.xlsx` — suspicious VBA / ActiveX-related parts inside a normal XLSX package.
- `xlsx-inspector-all.xlsx` — combined v0.3.0 Excel findings.

These fixtures are intentionally small and synthetic.

PPTX Inspector v0.4.0:

- `clean.pptx` — baseline presentation with no PowerPoint-specific privacy findings expected.
- `comments.pptx` — legacy PowerPoint comment with author, date, and text.
- `multiple-comment-authors.pptx` — comments from multiple authors.
- `speaker-notes.pptx` — speaker notes associated with a slide.
- `hidden-slide.pptx` — hidden slide in presentation order.
- `off-slide-content.pptx` — text shape positioned outside the slide canvas.
- `external-link.pptx` — external hyperlink relationship.
- `custom-xml.pptx` — Custom XML part.
- `embedded-object.pptx` — embedded binary object under `ppt/embeddings/`.
- `macro-parts.pptx` — suspicious VBA / ActiveX-related parts inside a normal PPTX package.
- `pptx-inspector-all.pptx` — combined v0.4.0 PowerPoint findings.


Safe Metadata Cleanup v0.5.0:

- `cleanup-metadata.docx` — common removable metadata, selected Custom Properties, and RSID in one DOCX fixture.
- `cleanup-media.pptx` — metadata cleanup on a presentation containing an actual PNG media part; used to verify the media hash is unchanged after cleanup.
- Existing `core-properties.xlsx` / `core-properties.pptx` fixtures are also used to verify cross-format metadata cleanup.
- Existing `custom-properties.docx` verifies that Custom Properties start unchecked and only selected properties are removed.

Comments / Notes Cleanup v0.6.0:

- Existing `comments.docx` verifies all Word comments and comment references can be removed without deleting the commented body text.
- Existing `comments.pptx` / `multiple-comment-authors.pptx` verify PowerPoint comment and author cleanup.
- Existing `speaker-notes.pptx` verifies speaker-note removal.
- `two-speaker-notes.pptx` contains notes on two slides and verifies per-slide cleanup preserves an unselected note while remove-all clears both notes.
- Existing `pptx-inspector-all.pptx` is used to verify comments + notes can be removed together while unrelated embedded content / Custom XML remain intact.


Reinspection / Before & After v0.7.0:

- Existing `cleanup-metadata.docx` verifies automatic reinspection removes selected metadata / RSID and reports the remaining unselected Custom Property.
- Existing `comments.docx` verifies comment cleanup is reflected in the After result while unrelated Word findings remain visible.
- Existing `pptx-inspector-all.pptx` verifies comments / speaker notes can be removed while hidden slides, off-slide content, embedded objects, Custom XML, and other findings remain in the After summary.
- Existing `two-speaker-notes.pptx` verifies selective note removal produces the expected remaining-note count.
- Browser regression also verifies edited download names keep the original Office extension and the completion UI does not overflow at 360 px width.

Hard Cases / Reliability v0.8.0:

- `signed.docx` — synthetic OOXML digital-signature package structure; verifies signed files remain inspection-only. This fixture does not contain a real cryptographic signature.
- `duplicate-relationships.docx` — duplicate Relationship ID; verifies ambiguous packages are inspection-only.
- `macro-parts.docx` — suspicious `word/vbaProject.bin` inside a normal DOCX package.
- `macro-enabled.docm` / `macro-enabled.xlsm` / `macro-enabled.pptm` — macro-enabled main content types plus synthetic VBA-related parts; verify DOCM / XLSM / PPTM inspection-only support.
- `malformed-optional.docx` — malformed optional Custom Properties XML; verifies partial inspection is separated from whole-file failure.
- `malformed-document.docx` — malformed Word document XML; verifies a format-specific parse failure is reported without claiming a clean result.
- `unusual-namespaces.docx` — Word namespace bound to an unusual prefix; verifies namespace-aware comment / document inspection.
- `encrypted.docx` — synthetic compound-file header with `EncryptedPackage` / `EncryptionInfo` markers; verifies encrypted Office detection.
- `legacy-disguised.docx` — synthetic legacy OLE compound file renamed `.docx`; verifies it is not misreported as password-protected OOXML.
- Existing clean DOCX / XLSX / PPTX fixtures remain cleanup-capable and are used as the no-caution baseline.

Final release v1.0.0:

- Existing cleanup fixtures verify that successful cleanup automatically reinspects the generated copy and scrolls the completion result into view below the sticky header.
- Japanese / English release screenshots are captured from the generated standalone HTML.
- v0.9.1 punctuation-only metadata and finding-navigation regressions remain part of the final release checks.
