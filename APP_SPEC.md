# Office Privacy Inspector
## Browser Kitty 正式仕様書 / 開発計画

- 文書種別: 新規Browser Kittyアプリ仕様書
- 仮リポジトリ名: `htmlapps-office-privacy-inspector`
- アプリ名（日本語）: Office Privacy Inspector
- アプリ名（英語）: Office Privacy Inspector
- 対象リリース: v1.0.0
- バージョニング: Semantic Versioning
- 基準テンプレート: 開発開始時点の最新 `htmlapps-template`
- 基本方針: 完全ローカル処理 / 登録不要 / インストール不要 / 単一HTML配布を重視
- 対応言語: 日本語 / 英語
- 主要対象ブラウザ: Chrome / Edge
- 可能なら対応: Safari / Firefox

---

# 1. 目的

Office Privacy Inspector は、Microsoft Office Open XML ファイルを第三者へ共有する前に、
ファイル内へ残っている可能性のある個人情報、コメント、校閲情報、非表示データ、
外部参照、埋め込み要素などをブラウザ内で検査するツールである。

対象ファイル:

- `.docx`
- `.xlsx`
- `.pptx`

ユーザーはファイルを読み込んだ後、

1. 共有前に確認した方がよい情報を一覧する
2. 内容を確認する
3. 安全に削除できる項目だけを選択する
4. クリーンアップ済みのコピーを生成する
5. 生成後のファイルを再検査する
6. クリーンアップ済みOfficeファイルを保存する

という一連の操作を行える。

ファイルは原則として外部サーバーへ送信せず、処理はブラウザ内で完結させる。

---

# 2. このアプリが解決する問題

Office文書には、本文・セル・スライドだけでなく、共有時に意図していない情報が含まれることがある。

例:

- 作成者名
- 最終更新者
- 会社名
- 最終印刷日時
- コメント
- コメント作成者
- Wordの変更履歴
- Wordの非表示テキスト
- Excelの非表示シート
- ExcelのVery Hiddenシート
- Excelの外部参照
- PowerPointの発表者ノート
- PowerPointのスライド外オブジェクト
- Custom XML
- 埋め込みファイル
- VBA / Macro
- デジタル署名
- その他のOOXML package情報

Office Privacy Inspector は、これらを「すべて自動で消す」ツールにはしない。

重要なのは、

> 見つける → 内容を確認する → 安全なものだけ削除する → 再検査する

ことである。

---

# 3. Browser Kittyで提供する意味

Officeファイルには、氏名、メールアドレス、コメント、社内パス、非公開メモなどが含まれる可能性がある。

このため、共有前検査を行うためにファイルを別のWebサービスへアップロードすること自体を避けたい場面がある。

Office Privacy Inspector は、

- ログイン不要
- インストール不要
- 完全ローカル処理
- Officeファイルを外部サーバーへ送信しない
- 操作後にその場でOfficeファイルを保存できる
- 単一HTMLとして保存して使える構成を重視する

というBrowser Kittyの特徴を活かす。

Photo Privacy Inspector と同様に、

> 「共有前にファイルへ何が残っているか確認する」

というシリーズとして位置づける。

---

# 4. 非目的

v1.0.0では以下を目的としない。

- Word / Excel / PowerPointの完全な代替
- Office文書本文の編集
- Word変更履歴の自動承認 / 自動却下
- Excelの数式編集
- Excelの非表示データの自動削除
- PowerPointレイアウト編集
- マクロの修正
- VBAコード編集
- パスワード解除
- 暗号化Office文書の解析
- デジタル署名の維持を保証したファイル変更
- PDFへの変換
- 古いバイナリOffice形式 `.doc / .xls / .ppt` の編集
- 「このファイルは完全に安全」と保証すること
- Office Document Inspectorとの完全互換
- クラウド共有・履歴管理
- ユーザーアカウント

---

# 5. 対応形式

## v1.0.0 正式対応

- DOCX
- XLSX
- PPTX

## 検査のみ候補

以下はOOXML packageとして読み込める場合でも、v1.0.0では原則としてクリーンアップ対象にしない。

- DOCM
- XLSM
- PPTM

UIでは、

> マクロを含むOfficeファイルです。現在は検査のみ対応しています。

と案内する。

## 非対応

- DOC
- XLS
- PPT
- 暗号化 / パスワード保護済みOfficeファイル
- 破損しておりZIP packageとして開けないファイル

---

# 6. 検査結果の分類

検査結果は単なる「警告一覧」にしない。

以下の3分類を基本とする。

## 6.1 削除して共有しやすい情報

ユーザーが選択して削除可能。

例:

- Creator
- Last modified by
- Last printed
- Company
- Manager
- Total editing time
- 一部のCustom Properties
- コメント
- コメント作成者情報
- WordのRSID情報
- PowerPointのSpeaker Notes

## 6.2 内容を確認した方がよい情報

存在と内容を表示するが、安易に自動削除しない。

例:

- Word変更履歴
- Excel Hidden Sheet
- Excel Very Hidden Sheet
- Excel Hidden Row / Column
- Excel External Links
- Excel Hidden Defined Names
- PowerPoint Off-slide Content
- 埋め込みファイル

## 6.3 削除すると壊れる可能性がある情報

存在を検出し、原則として検査のみとする。

例:

- VBA / Macro
- ActiveX
- Embedded Object
- Pivot Cache
- Slicer Cache
- Cube Formula Cache
- デジタル署名
- 一部Custom XML
- 外部データ接続

---

# 7. 共通検査項目

DOCX / XLSX / PPTX共通で、可能な範囲で以下を検査する。

## 7.1 Core Properties

- Title
- Subject
- Creator
- Keywords
- Description
- Last Modified By
- Revision
- Created
- Modified
- Last Printed
- Category
- Content Status
- Identifier
- Language
- Version

## 7.2 Extended Properties

- Application
- AppVersion
- Company
- Manager
- TotalTime
- Template
- Pages
- Words
- Characters
- Slides
- Notes
- HiddenSlides
- MMClips
- SharedDoc
- HyperlinksChanged
- LinksUpToDate

すべてを「個人情報」とは扱わない。
表示価値のあるものと、削除候補を分ける。

## 7.3 Custom Properties

- Property名
- 型
- 値

を一覧化する。

削除はユーザーが個別選択可能とする。

## 7.4 Custom XML

存在するCustom XML partsを検出する。

表示:

- 件数
- part path
- namespace
- 推定サイズ

内容全文を初期画面へ露出させない。

削除は、ファイル破損や機能喪失の可能性があるため原則として詳細確認後の操作とする。
v1.0.0では「検出のみ」に留めてもよい。

## 7.5 埋め込みファイル / OLE

検出する。

表示例:

- embedded object数
- ファイル種別
- package path
- サイズ

v1.0.0では自動削除しない。

## 7.6 VBA / Macro

存在を検出する。

マクロ付きOffice形式では検査のみ。

`.docx/.xlsx/.pptx`に不自然なVBA-related partが存在する場合も警告する。

## 7.7 外部Relationship

OOXML relationshipsから外部参照を検出する。

例:

- external hyperlink
- external image
- external template
- external workbook
- external data connection

URLやローカルファイルパスが存在する場合はユーザーが内容を確認できるようにする。

---

# 8. DOCX検査仕様

## 8.1 コメント

検出:

- コメント件数
- Author
- Initials
- Date
- Comment text
- Reply関係（取得可能な場合）
- 対象箇所の情報（取得可能な範囲）

表示例:

```text
コメント
8件 / 3人

田中 太郎  5件
佐藤 花子  2件
高木 智久  1件
```

詳細画面からコメント本文を確認可能とする。

### クリーンアップ

「コメントをすべて削除」を提供する。

削除時は、

- comments part
- comment references
- comment range start/end
- related comments metadata

の整合性を保つ。

削除後に再検査する。

---

## 8.2 変更履歴

検出候補:

- insertions
- deletions
- moves
- formatting changes
- property changes
- revision author
- revision date

表示:

```text
変更履歴があります

17件
2人

共有前に内容を確認してください。
```

### v1.0.0方針

検出のみ。

以下は実装しない。

- すべて承認
- すべて却下
- 個別承認
- 個別却下

理由:

変更履歴の処理は文書内容そのものを変更するため、Privacy Cleanupの範囲を超える。

---

## 8.3 Hidden Text

非表示テキストを検出する。

表示:

- 件数
- 推定文字数
- 可能なら抜粋

v1.0.0では検出のみを基本とする。

---

## 8.4 RSID

Wordの編集セッション識別情報として使われるRSID関連要素を検出する。

表示は一般ユーザー向けには、

> 編集セッション情報

とする。

詳細情報内でRSIDという技術用語を説明する。

### クリーンアップ

RSID関連情報は削除候補とする。

削除後のDOCXが正常に開けることを回帰試験する。

---

## 8.5 テンプレート情報

外部テンプレート参照を検出する。

ローカルパスやネットワークパスが含まれている場合は特に確認項目とする。

---

# 9. XLSX検査仕様

## 9.1 Hidden Sheet

各worksheetのvisibilityを取得する。

分類:

- visible
- hidden
- veryHidden

表示例:

```text
非表示のシート

売上原価
非表示
使用セル 1,248

旧価格表
Very Hidden
使用セル 842
```

### v1.0.0方針

検出のみ。

削除しない。

再表示操作もv1.0.0では必須ではない。

---

## 9.2 Hidden Row / Column

hidden属性を持つ行・列を検出する。

表示:

- sheet名
- hidden rows件数
- hidden columns件数
- 範囲

大量に存在する場合は件数を先に表示し、詳細を折りたたむ。

### v1.0.0方針

検出のみ。

---

## 9.3 External Links

外部Workbook参照、外部Relationship、外部パスを検出する。

可能なら使用場所も特定する。

表示例:

```text
外部参照

C:\Users\tanaka\Documents\社外秘\cost.xlsx

使用場所
Sheet2!B14
```

検出対象:

- cell formula
- defined name
- chart series
- shape関連
- externalLink parts
- relationship targets

### v1.0.0方針

検出のみ。

外部リンクの自動切断はしない。

---

## 9.4 Defined Names

Workbook defined namesを検査する。

特に、

- hidden name
- external referenceを含むname
- ローカルパスを含むname

を確認項目とする。

---

## 9.5 Pivot / Slicer / Cube / Cache

存在を検出する。

表示:

- Pivot Cache数
- Slicer Cache数
- Cube関連情報
- 外部connection数

### v1.0.0方針

検出のみ。

削除しない。

---

## 9.6 Data Connection

Workbook connectionsを検出する。

表示候補:

- connection name
- connection type
- target / connection stringの存在
- 外部URL
- ローカルパス
- provider

秘密情報をUIへそのまま広範囲に露出させない。

Connection String等は初期表示ではマスクし、ユーザー操作で詳細表示することを検討する。

---

# 10. PPTX検査仕様

## 10.1 コメント

検出:

- コメント数
- author
- date
- slide number
- comment text
- reply / thread
- assignedTo等が存在する場合はその情報

### クリーンアップ

コメント削除を提供する。

削除後、comment references / authors / related partsの整合性を保つ。

---

## 10.2 Speaker Notes

各slideのSpeaker Notesを検出する。

表示:

- notesがあるslide数
- 各slideの文字数
- text preview

例:

```text
発表者ノート

Slide 3
128文字

Slide 8
「この数字は暫定。社外にはまだ出さない」

Slide 14
64文字
```

### クリーンアップ

選択したnotesまたは全notesを削除可能とする。

削除後にPPTXが正常に開けることを確認する。

---

## 10.3 Off-slide Content

スライドキャンバス外に配置されたオブジェクトを可能な範囲で検出する。

対象候補:

- text box
- image
- shape
- table
- chart

判定にはslide sizeとobject boundsを使用する。

### v1.0.0方針

検出のみ。

「スライド外に配置されたオブジェクトがあります」と表示する。

削除しない。

---

## 10.4 Hidden Slides

Hidden Slideを検出する。

表示:

- hidden slides件数
- slide number / title

v1.0.0では検出のみ。

---

# 11. デジタル署名

デジタル署名関連partを検出した場合は、ファイル書き換えを原則禁止する。

表示:

```text
デジタル署名があります

このファイルを書き換えると、
署名の有効性に影響する可能性があります。

Office Privacy Inspectorでは、
このファイルの検査のみ行います。
```

v1.0.0では、

- 検査
- 結果表示

のみ。

クリーンアップ操作は無効化する。

---

# 12. 暗号化 / パスワード保護

暗号化Officeファイルはv1.0.0では非対応。

表示:

```text
このOfficeファイルはパスワードで保護されています。

現在、暗号化されたOfficeファイルの検査には対応していません。
```

パスワード入力UIは実装しない。

---

# 13. クリーンアップ仕様

## 13.1 原則

クリーンアップは元ファイルを上書きしない。

必ず新しいコピーを生成する。

例:

```text
report.xlsx
↓
report-cleaned.xlsx
```

元ファイルはブラウザ内でも変更しない。

---

## 13.2 v1.0.0で削除可能にする候補

### 共通

- Creator
- Last Modified By
- Last Printed
- Company
- Manager
- Total Editing Time
- 選択したCustom Properties

### DOCX

- Comments
- Comment author metadata
- RSID

### PPTX

- Comments
- Comment author metadata
- Speaker Notes

### XLSX

v1.0.0では、本文・計算結果へ影響しうる項目の自動削除は原則行わない。

---

## 13.3 v1.0.0で削除しないもの

- Word tracked changes
- Word hidden text
- Excel hidden rows
- Excel hidden columns
- Excel hidden sheets
- Excel veryHidden sheets
- Excel external links
- Excel defined names
- Excel connections
- Pivot cache
- Slicer cache
- Embedded files
- OLE objects
- VBA / Macro
- PowerPoint off-slide content
- Hidden slides
- デジタル署名
- 意味を安全に判定できないCustom XML

---

# 14. 再検査

クリーンアップ後は必ず生成したOfficeファイルを再度解析する。

結果はBefore / Afterで表示する。

例:

```text
クリーンアップしました

削除前
確認項目 14

削除後
確認項目 3

残っている項目

非表示シート 2
外部参照 1
```

「処理成功」だけでは完了としない。

再検査で以下を確認する。

- ZIPとして開ける
- OOXML package構造が破損していない
- 削除対象が消えている
- 残すべき情報が残っている
- ファイルサイズ
- 対応アプリで開ける可能性が高い構造になっている

---

# 15. 最終結果の表現

以下のような断定は禁止する。

- このファイルは安全です
- 個人情報は完全に削除されました
- 機密情報はありません

推奨:

> 今回の検査項目では、個人情報や非表示データは見つかりませんでした。

注意書き:

> この結果は、ファイル内に機密情報が存在しないことを保証するものではありません。
> 本文、画像、図形、白文字、画像内の文字など、内容そのものに含まれる情報は別途確認してください。

---

# 16. UI / UX

## 16.1 初期画面

```text
Officeファイルを共有前に確認

DOCX / XLSX / PPTXをここにドロップ
または

[ファイルを選択]

作成者情報、コメント、非表示データなどを確認できます。

完全ローカル処理
ファイルは外部サーバーへ送信されません。
```

サンプルを提供する場合は、主操作より目立たせない。

---

## 16.2 読み込み中

大容量Officeファイルを考慮して進捗表示する。

例:

```text
ファイルを確認しています

パッケージを読み込み中
34 / 128
```

技術用語を一般画面へ出しすぎない。

「ZIP展開中」「XML解析中」等は詳細情報へ置く。

---

## 16.3 概要画面

例:

```text
report.xlsx

共有前に確認したい項目があります

個人情報          4
コメント          7
非表示データ      2
外部参照          1
埋め込みデータ    0

[詳細を見る]
```

重大度の色だけで意味を伝えない。

アイコン + 文言 + 件数を使用する。

---

## 16.4 詳細画面

カテゴリ例:

- 個人情報
- コメント / 校閲
- 非表示データ
- 外部参照
- 埋め込みデータ
- マクロ / 署名
- 詳細情報

各項目に、

- 何が見つかったか
- なぜ確認した方がよいか
- 削除可能か
- 削除時の影響

を表示する。

---

## 16.5 クリーンアップ選択

例:

```text
削除する情報

☑ 作成者
☑ 最終更新者
☑ コメント
☐ Custom Properties

変更されないもの

・非表示シート 2
・外部参照 1

[クリーンアップしてコピーを作成]
```

削除対象には初期選択のルールを設ける。

推奨:

初期ON:
- Creator
- Last Modified By
- Last Printed
- Company
- Manager
- Total Editing Time

初期OFF:
- Comments
- Speaker Notes
- Custom Properties

理由:
コメント・Notes・Custom Propertiesはユーザーが意図的に保持している可能性があるため。

---

## 16.6 完了画面

```text
クリーンアップしました

削除した項目
8

残っている確認項目
3

非表示シート 2
外部参照 1

[クリーンアップ済みファイルを保存]
```

ファイル名を変更可能にする。

例:

```text
report-cleaned.xlsx
```

拡張子は入力欄から分離してもよい。

---

# 17. スマートフォンUI

スマートフォンではPC版を縦に縮小しただけにしない。

推奨構成:

```text
[概要] [詳細] [保存]
```

の下部固定タブ。

ただしファイル未読込時には表示しない。

確認事項:

- 横スクロールを出さない
- 長いファイル名を省略表示しつつ全文確認可能
- ローカルパス / URL等の長文字列でレイアウトを壊さない
- 詳細modalを画面外へはみ出させない
- 下部固定UIが結果を隠さない
- タップ領域を十分に取る
- 重要ボタンを画面上部だけへ集中させない

---

# 18. アクセシビリティ

最低限:

- キーボード操作
- Focus表示
- Enter / Space操作
- Escapeでdialogを閉じる
- `aria-label`
- 色だけに依存しない状態表示
- 十分なコントラスト
- 44px前後を意識したタップ領域
- 読み込み / 完了 / エラーをscreen readerへ通知

---

# 19. プライバシー表示

一般画面:

```text
完全ローカル処理

Officeファイルはブラウザ内で確認・処理され、
外部サーバーへ送信されません。
```

ただし実際に外部通信が存在するビルドではこの文言を使用しない。

Runtimeでは可能な限り、

- fetch
- XMLHttpRequest
- WebSocket
- EventSource
- telemetry
- analytics
- CDN
- 外部フォント
- 外部画像

を使用しない。

---

# 20. 技術構成

## 20.1 基本処理

```text
Office File
    ↓
ZIP package読込
    ↓
OOXML parts / relationships解析
    ↓
Inspector
    ↓
結果モデル生成
    ↓
ユーザー選択
    ↓
必要なXML / relationshipsのみ変更
    ↓
ZIP再生成
    ↓
再検査
    ↓
保存
```

---

## 20.2 ZIP処理

OOXML packageを扱えるZIP実装を使用する。

要件:

- browser対応
- build時に取り込み可能
- runtime CDN不要
- binary保持
- 大容量entryを不用意にtext化しない
- media / embedded fileを再エンコードしない
- ZIP entry metadataの不要な破壊を避ける

---

## 20.3 XML処理

可能な限りDOMParser / XMLSerializer等のブラウザ標準機能を使用する。

必要に応じて専用parserを検討する。

要件:

- namespace-aware
- XML entity等の安全性
- 不明要素を理由なく削除しない
- 変更対象以外のpartsを保持する

---

## 20.4 大容量ファイル

Officeファイルには高解像度画像・動画・embedded objectが含まれる場合がある。

原則:

- mediaをdecodeしない
- mediaを再エンコードしない
- 必要なXMLだけ解析
- 大きなbinary partsはそのまま保持
- メモリ使用量を監視
- Worker利用を検討
- 処理中UIを固めない

目標:

100MB級Officeファイルでも、メディアを全展開・再エンコードせず処理できる設計を目指す。

数百MB級はブラウザメモリ制約により失敗する可能性を明示する。

---

# 21. CSP

完全ローカル処理版では必要最小限にする。

目標例:

```text
default-src 'none'
img-src 'self' data: blob:
style-src 'self' 'unsafe-inline'
script-src 'self' ...
worker-src 'self' blob:
connect-src 'none'
```

実際の単一HTML構成に合わせて調整する。

WASMを使用する場合のみ `wasm-unsafe-eval` を検討する。

不用意に、

```text
https:
*
```

等を許可しない。

---

# 22. 単一HTML

`dist/index.html` 単体で動作する構成を重視する。

可能な限り内包:

- CSS
- JavaScript
- SVG icons
- favicon
- ZIP library
- Worker
- その他必要resource

実行時CDN依存は禁止を基本とする。

---

# 23. エラー設計

## 非Officeファイル

```text
Officeファイルとして読み込めませんでした。

DOCX / XLSX / PPTXを選択してください。
```

## ZIP破損

```text
ファイルを読み込めませんでした。

Officeファイルが破損しているか、
対応していない形式の可能性があります。
```

## 暗号化

```text
このOfficeファイルはパスワードで保護されています。

現在、暗号化されたOfficeファイルの検査には対応していません。
```

## メモリ不足

```text
このファイルをブラウザ内で処理できませんでした。

ファイルサイズまたは埋め込みデータが大きいため、
使用できるメモリを超えた可能性があります。
```

## 一部解析失敗

ファイル全体を失敗扱いにせず、

```text
一部の情報を確認できませんでした。
```

として分離する。

詳細情報にtechnical errorを表示する。

---

# 24. 破壊的操作

元ファイルは変更しないため、通常のクリーンアップ開始時には過剰な確認dialogを挟まない。

ただし以下は確認を検討する。

- コメント全削除
- Speaker Notes全削除
- Custom Properties全削除
- 作業リセット

保存時には、

> クリーンアップ済みコピーを保存します

と結果が明確に分かるようにする。

---

# 25. 出力ファイル名

初期値:

```text
original-name-cleaned.docx
original-name-cleaned.xlsx
original-name-cleaned.pptx
```

ユーザーが変更可能。

同名ファイルを一括処理する将来機能では安全にsuffixを付与する。

---

# 26. 将来機能候補

v1.0.0には必須ではない。

- 複数Officeファイル一括検査
- Folder batch inspection
- ZIP一括出力
- inspection report HTML
- inspection report JSON
- DOCM/XLSM/PPTMのより深い検査
- Excel外部リンク安全解除
- Hidden Sheet再表示
- Hidden Row / Column再表示
- Word変更履歴レビュー
- Word変更履歴一括承認 / 却下
- Custom XML viewer
- Embedded file extractor
- Officeファイル間比較
- CLI版
- PWA
- File System Access API連携

---

# 27. テスト用ファイルセット

リリース前に人工的なテストOfficeファイルを用意する。

## DOCX

最低限:

1. clean.docx
2. core-properties.docx
3. comments.docx
4. multiple-comment-authors.docx
5. tracked-changes.docx
6. hidden-text.docx
7. rsid.docx
8. external-template.docx
9. custom-properties.docx
10. custom-xml.docx
11. embedded-object.docx
12. large-media.docx
13. signed.docx
14. broken.docx

## XLSX

1. clean.xlsx
2. core-properties.xlsx
3. comments.xlsx
4. hidden-sheet.xlsx
5. very-hidden-sheet.xlsx
6. hidden-rows-columns.xlsx
7. external-link.xlsx
8. hidden-defined-name.xlsx
9. connection.xlsx
10. pivot-cache.xlsx
11. embedded-object.xlsx
12. large-media.xlsx
13. signed.xlsx
14. broken.xlsx

## PPTX

1. clean.pptx
2. core-properties.pptx
3. comments.pptx
4. multiple-comment-authors.pptx
5. speaker-notes.pptx
6. hidden-slide.pptx
7. off-slide-content.pptx
8. custom-properties.pptx
9. embedded-object.pptx
10. large-video.pptx
11. signed.pptx
12. broken.pptx

---

# 28. 自動回帰テスト

可能な範囲でCIへ入れる。

## 構造

- ZIPとして再読込できる
- `[Content_Types].xml` が存在
- root relationshipsが存在
- 必須OOXML partsが存在

## クリーンアップ

- Creator削除後にCreatorが検出されない
- LastModifiedBy削除後に検出されない
- Comments削除後にcomment partsが残らない
- Word comment referencesが孤立しない
- PPT comment referencesが孤立しない
- Speaker Notes削除後もpresentation構造が壊れない
- RSID削除後もDOCXが解析可能

## 非変更

- worksheet countが変わらない
- slide countが変わらない
- media binary hashが変わらない
- embedded binary hashが変わらない
- 本文XMLの不要な変更が発生しない

## Runtime

- unresolved placeholderなし
- external runtime dependencyなし
- CSPを確認
- favicon存在
- version一致
- standalone HTML生成

---

# 29. README

Browser Kitty既存形式へ合わせる。

推奨構成:

```text
# Office Privacy Inspector

概要

スクリーンショット

## Features

## Supported files

## What it checks

## Cleanup behavior

## Usage

## Privacy

## Limitations

## Browser support

## Development

## Build

## License
```

READMEでは、

- 完全に機密情報を検出できるとは書かない
- 「安全なファイルを保証する」と書かない
- 完全ローカル処理の事実を説明する
- 検査できる項目 / できない項目を明示する

---

# 30. Assets

正式リリースまでに用意する。

```text
assets/
├─ favicon.svg
├─ screenshot.png
└─ screenshot-en.png
```

faviconとアプリ左上のブランドアイコンは同一系統のデザインとする。

ブランドカラー:

```text
#16624F
```

絵文字をUIアイコンとして使用しない。

---

# 31. リリース前チェック

## UI

- PC
- Smartphone
- 日本語
- English
- 初期状態
- 読み込み中
- 結果あり
- 結果なし
- 一部解析失敗
- 完了
- エラー
- dialog
- long filename
- long URL
- long local path

## Function

- DOCX読込
- XLSX読込
- PPTX読込
- Drag & Drop
- file picker
- inspection
- detail view
- cleanup selection
- cleanup
- reinspection
- file save
- reset

## Privacy

- external network
- CDN
- analytics
- telemetry
- external font
- external image
- CSP

## Build

- standalone HTML
- Worker
- ZIP runtime
- favicon
- unresolved placeholders
- version

## Repository

- README
- LICENSE
- version
- screenshots
- favicon
- GitHub Pages / target hosting

---

# 32. 開発計画

---

## v0.1.0 — OOXML Foundation / Core Properties

### 目的

Office Privacy Inspectorとして最小の縦切りを成立させる。

### 実装

- 最新 `htmlapps-template` から開始
- DOCX / XLSX / PPTX file input
- Drag & Drop
- OOXML ZIP package判定
- Office format判定
- Core Properties解析
- Extended Properties解析
- Custom Properties解析
- 基本結果UI
- 日本語 / 英語
- 完全ローカル処理
- runtime外部通信なし
- favicon初版
- version表示

### 出力

まだOfficeファイルの変更はしない。

### 完了条件

- DOCX/XLSX/PPTXから作成者等を正しく取得できる
- clean fileでは「該当なし」を表示できる
- 非Office / 壊れたOfficeを適切にエラー表示できる
- スマホで横スクロールしない
- standalone HTMLが生成できる

---

## v0.2.0 — DOCX Inspector

### 目的

Word共有前チェックを成立させる。

### 実装

- コメント検出
- コメントAuthor / Date / Text
- 変更履歴検出
- revision author / date
- Hidden Text検出
- RSID検出
- 外部template検出
- external relationships
- embedded object検出
- Custom XML検出
- DOCX専用結果UI

### 完了条件

テストDOCXで、

- コメント
- 変更履歴
- hidden text
- RSID
- external template
- embedded object

を区別して表示できる。

この段階では削除しない。

---

## v0.3.0 — XLSX Inspector

### 目的

Excel共有前チェックを成立させる。

### 実装

- Hidden Sheet
- Very Hidden Sheet
- Hidden Row
- Hidden Column
- External Links
- Defined Names
- Hidden Defined Names
- Workbook Connections
- Pivot Cache
- Slicer Cache
- External Relationships
- Embedded Object
- Macro関連part検出
- XLSX専用結果UI

### 完了条件

テストXLSXで、

- hidden / veryHidden
- external link
- hidden rows / columns
- hidden names
- connection
- cache

を区別できる。

削除はしない。

---

## v0.4.0 — PPTX Inspector

### 目的

PowerPoint共有前チェックを成立させる。

### 実装

- Comments
- comment authors
- comment dates
- Speaker Notes
- Hidden Slides
- Off-slide Content
- External Relationships
- Embedded Object
- Custom XML
- Macro関連part
- PPTX専用結果UI

### 完了条件

テストPPTXで、

- comments
- notes
- hidden slide
- off-slide object

を正しく区別して表示できる。

---

## v0.5.0 — Safe Metadata Cleanup

### 目的

安全性の高いmetadata cleanupを実装する。

### 実装

共通削除:

- Creator
- Last Modified By
- Last Printed
- Company
- Manager
- Total Editing Time
- 選択Custom Properties

Word:

- RSID cleanup

追加:

- cleanup selection UI
- 元ファイルを変更しない
- `-cleaned`出力
- ZIP package再構築
- media / binary保持確認

### 完了条件

- cleanup後ファイルを再読込可能
- 対象metadataが消える
- sheet / slide /本文構造を変更しない
- media hashが変わらない
- 100MB級テストで不要なmedia decodeをしない

---

## v0.6.0 — Comments / Notes Cleanup

### 目的

ユーザーが内容を確認した上で削除できる情報を拡張する。

### 実装

DOCX:

- comments削除
- comment author情報整理

PPTX:

- comments削除
- comment author情報整理
- Speaker Notes削除
- slide単位選択
- 全Notes削除

確認UI:

- 削除対象の内容preview
- comments全削除確認
- notes全削除確認

### 完了条件

- コメント削除後に孤立relationshipがない
- Word/PPTコメントが再検査で0
- Notes削除後もslide countや画像が変化しない
- Officeで開ける構造を維持

---

## v0.7.0 — Reinspection / Before & After

### 目的

Office Privacy Inspectorの中心体験を完成させる。

### 実装

- cleanup後自動再検査
- Before / After比較
- 削除済み件数
- 残存確認事項
- 一部失敗分離
- 完了画面
- 保存ファイル名編集
- 保存成功feedback

### 完了条件

ユーザーが、

```text
読み込む
→ 確認する
→ 削除項目を選ぶ
→ コピー生成
→ 再検査
→ 保存
```

を迷わず完了できる。

---

## v0.8.0 — Hard Cases / Reliability

### 目的

実ファイルで壊れにくい状態へ持っていく。

### 実装

- large media Office
- embedded objects
- unusual custom XML
- malformed OOXML
- missing optional parts
- macros検出
- signed document検出
- encrypted file判定
- unsupported format
- memory error handling
- partial inspection failure
- duplicate relationships
- unusual namespaces
- cancellation / reset cleanup
- Worker利用検討・導入

### 完了条件

- 壊れたファイルでアプリ全体が落ちない
- macro / signature / encryptionを安全側で処理する
- 検査できない項目を「安全」と誤判定しない
- large file処理でUIが長時間固まらない

---

## v0.9.0 — Release Candidate / UX / Accessibility

### 目的

正式リリース候補へ仕上げる。

### 実装

- UI文言総点検
- 一般ユーザー向け技術用語削減
- 詳細情報折りたたみ
- PC UI
- Smartphone UI
- 日本語
- English
- keyboard navigation
- focus
- ARIA
- modal behavior
- long filename
- long URL/path
- empty state
- loading state
- success state
- partial failure
- error state
- privacy copy
- help modal
- supported / unsupported説明
- icon / favicon最終化

### ドキュメント

- README正式版準備
- Limitations
- Privacy
- supported formats
- inspection matrix

### 完了条件

正式リリース前の回帰確認で重大なUX問題がない。

---

## v1.0.0 — Final Release

### 目的

正式版として公開可能な状態へ固定する。

### 最終作業

- version v1.0.0
- README最終化
- screenshot.png
- screenshot-en.png
- favicon.svg
- standalone HTML
- GitHub Pages / target hosting
- external communication確認
- CSP確認
- runtime dependency確認
- build CI
- repository check
- full regression
- test fixture regression
- mobile regression
- English regression

### v1.0.0必須機能

- DOCX / XLSX / PPTX読み込み
- metadata inspection
- DOCX privacy inspection
- XLSX privacy inspection
- PPTX privacy inspection
- safe metadata cleanup
- DOCX comments cleanup
- PPTX comments cleanup
- PPTX speaker notes cleanup
- RSID cleanup
- reinspection
- Before / After
- 保存
- 完全ローカル処理
- 日英UI
- mobile support
- standalone HTML

### リリース判定

以下を満たせば、追加機能が残っていてもv1.0.0をリリースする。

- 主要用途が最後まで完結する
- 初見で操作できる
- 大きな破損バグがない
- clean / dirty / malformed Office filesを適切に扱える
- スマートフォンで利用できる
- READMEがある
- screenshot日英がある
- standalone HTMLが動く
- 外部へのOfficeファイル送信がない
- Privacy説明が実装と一致する
- 「安全を保証する」と誤認させる表現がない

---

# 33. v1.0.0 検査 / 操作マトリクス

| 項目 | DOCX | XLSX | PPTX | 検出 | v1.0削除 |
|---|---:|---:|---:|---:|---:|
| Creator | ✓ | ✓ | ✓ | ✓ | ✓ |
| Last Modified By | ✓ | ✓ | ✓ | ✓ | ✓ |
| Last Printed | ✓ | ✓ | ✓ | ✓ | ✓ |
| Company / Manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| Total Editing Time | ✓ | ✓ | ✓ | ✓ | ✓ |
| Custom Properties | ✓ | ✓ | ✓ | ✓ | 選択 |
| Custom XML | ✓ | ✓ | ✓ | ✓ | 原則なし |
| Comments | ✓ | ✓* | ✓ | ✓ | DOCX/PPTX |
| Tracked Changes | ✓ | - | - | ✓ | × |
| Hidden Text | ✓ | - | - | ✓ | × |
| RSID | ✓ | - | - | ✓ | ✓ |
| Hidden Sheet | - | ✓ | - | ✓ | × |
| Very Hidden Sheet | - | ✓ | - | ✓ | × |
| Hidden Row / Column | - | ✓ | - | ✓ | × |
| External Links | ✓ | ✓ | ✓ | ✓ | × |
| Defined Names | - | ✓ | - | ✓ | × |
| Connections | - | ✓ | - | ✓ | × |
| Pivot / Slicer Cache | - | ✓ | - | ✓ | × |
| Speaker Notes | - | - | ✓ | ✓ | ✓ |
| Hidden Slides | - | - | ✓ | ✓ | × |
| Off-slide Content | - | - | ✓ | ✓ | × |
| Embedded Object | ✓ | ✓ | ✓ | ✓ | × |
| VBA / Macro | ✓ | ✓ | ✓ | ✓ | × |
| Digital Signature | ✓ | ✓ | ✓ | ✓ | × |
| Encryption | ✓ | ✓ | ✓ | 判定 | × |

`*` Excelのコメント / Notesは形式差異を確認し、実装範囲をv0.3.0で確定する。

---

# 34. 実装判断の原則

迷った場合は以下の順で判断する。

1. ファイルを壊さない
2. ユーザーの意図したOffice内容を勝手に変更しない
3. 見つからないものを「安全」と表現しない
4. 削除できないものでも存在を分かりやすく示す
5. 技術用語より「何が残っているか」を説明する
6. 元ファイルは変更しない
7. cleanup後は再検査する
8. 完全ローカル処理を維持する
9. smartphoneでも確認・保存まで完結させる
10. 機能を増やすより、共有前チェックを確実に終えられることを優先する

---

# 35. 開発開始時の引き継ぎ指示

別チャットで実装を開始する場合は、以下を前提とする。

- この仕様書をアプリ固有仕様の一次資料として使用する。
- Browser Kitty共通ルールは `Browser Kitty Guide` を参照する。
- 実装は開発開始時点の最新 `htmlapps-template` に準拠する。
- 既存機能を理由なく削除しない。
- 各バージョンでZIPを成果物として残してもよい。
- 次バージョンは前バージョンを基準に変更する。
- v0.1.0から順に段階実装する。
- 大規模な仕様変更が必要な場合は、Officeファイル破損防止とプライバシー表現を最優先する。
- コードの正は最新GitHubリポジトリまたは最新ZIPとする。
- v1.0.0前にPC / Smartphone / Japanese / English / README / favicon / screenshots / standalone HTML / CSP / external communicationを再確認する。

---

# 36. 参考仕様・調査先

実装時には、Office Open XML仕様とMicrosoftのDocument Inspector動作を確認しながら進める。

主な参考情報:

- Microsoft Support — Inspect documents for hidden data and personal information
- Microsoft Learn — Open XML SDK / Package Properties
- Microsoft Learn — Word comments
- Microsoft Learn — Excel hidden worksheets
- Microsoft Learn — PowerPoint comments
- Microsoft Support — External links in Excel
- Microsoft Support — Macros or VBA code found
- Microsoft Support — Digital signatures in Office

競合 / 参考UIとして、ブラウザ内でOffice metadata cleanupを行う既存サービスも確認するが、
Browser Kitty版では「一括削除」より、

> 検査 → 確認 → 安全な項目だけ削除 → 再検査

を中心体験とする。

---

# 37. 最終コンセプト

Office Privacy Inspector は、

> Officeファイルを共有する前に、見えていない情報を確認する。

ためのBrowser Kittyアプリである。

「metadataを全部消すツール」ではない。

ファイル内の情報を勝手に破壊せず、

- 何が残っているか
- 何が削除できるか
- 何は自分で確認する必要があるか
- cleanup後に何が残ったか

をユーザー自身が判断できるようにする。

Officeファイルは外部サーバーへ送信せず、ブラウザ内で処理する。


# v1.1.0 — Counts-only inspection summary

- Add a user-initiated local JSON summary download beside the current inspection. Use an editable generic `inspection-summary.json` default with a fixed `.json` extension; never derive it from the source filename.
- Schema version 1 includes only app version, detected DOCX/XLSX/PPTX family, supported-check completeness, fixed category counts, allowlisted cleanup restriction codes, cleanup status, and the explicit safety/anonymity caveat. `inspection` is the original/before snapshot; `cleanup.after` exists only for successful, verified reinspection of the same source.
- Exclude original/output document filenames, property names and values, authors, comments/notes, text snippets, paths, URLs, and raw errors. Do not persist report data or make network requests. The chosen report filename stays outside the JSON payload.
- For a partial inspection all category counts are `null`, conservatively indicating unknown coverage. Categories not inspected by this version or not applicable to the format are also `null`. Failed reinspection uses status `reinspection_failed` and `after: null`; no cleanup uses `not_performed`. A complete result describes only the supported checks; zero findings do not mean safe or anonymous.
- Clear report availability immediately on a new source, reset, or inspection error. Disable export during cleanup. Reject stale inspections and cleanup confirmations after source replacement. Keep a user-edited summary filename during language changes and cleanup of the same source; reset it for a new source.
- Reject duplicate normalized ZIP entry names before insertion, including backslash/slash collisions, through the existing unsupported/broken-package path. Never choose a duplicate winner or clean such a package. Preserve existing encryption, signature, macro, duplicate-relationship, and partial-inspection restrictions.
- Regression requirements: distinctive synthetic secrets never enter JSON; stored/deflate and malformed/ZIP64/encrypted controls; DOCX/XLSX/PPTX and macro/signature/partial fixtures; cleanup keeps unrelated local ZIP records and uncompressed bytes unchanged; edited filenames; replacement/reset/error; verified and failed after state.

- Treat a missing required `word/document.xml` as a partial DOCX inspection and block cleanup. Keep reporting failed cleanup verification as `reinspection_failed` after discarding unsafe output; late failures cannot change a newer source or its successful cleanup.
- Completeness is scoped to implemented checks, not full OOXML structural validation. Existing missing referenced worksheet/slide-target coverage is not expanded by this change.


## v1.1.1 — Header consistency

- Show EN as the language-switch target in Japanese and JA in English. Keep the localized action-target aria-label and matching title synchronized on initial load, repeated toggles, and saved-language reload.
- Display the current app version as `vMAJOR.MINOR.PATCH`, including the static startup fallback.
- Preserve the existing responsive layout and the privacy badge text 完全ローカル処理 / Fully local processing.
- The default canonical build must refresh the public `office-privacy-inspector.html` entry point with byte-identical readable dist output. Explicit `-OutputPath` builds leave that root release unchanged. Check root/source/config parity before a repository-check rebuild, and exercise the actual root release in regression tests.
