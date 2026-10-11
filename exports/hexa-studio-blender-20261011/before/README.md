# 床の変換経路（2026-10-10・試作）

**Blender段は実行未検証。** この環境のBlender 5.2.2 LTSは、バックグラウンド起動時のMetal検出でSIGSEGVになる。Python本文へ到達しない。完成したBlender試作GLBやAOとして扱わないこと。

## 実行（木目修正・2026-10-10）

Blenderはジョブズが外で実行する。今回の検査はPythonのみで、Blenderの描画・AO・GLB出力は未検証。
Python側はPillowが必要。作業場の直下から、まず写真の床部分を切り出す：

```sh
python3 -B scripts/blender-pipeline/extract_tile.py --furniture-source models/module-finishes/tetsuya-2026-10-10
```

既に `exports/hexa-studio-blender-20261010/tiles/` に生成済み。再生成は別の `--output` を指定する。既存タイルの上書きはしない。公開リポジトリ側のコピーも同じ作業場のタイルを参照する。独立チェックアウトでは `--assets` と `--tiles` で場所を指定できる。

ジョブズが床1つを実行する1行：

```sh
python3 -B scripts/blender-pipeline/run.py exports/hexa-studio-blender-20261010/input-floor/interior-floor-oak.mesh.json exports/hexa-studio-blender-20261010/out-floor-wood-v3 --finish oak --tile-mm 300 900
```

`--finish` は oak / teak / walnut / dark-canvas / light-canvas。`--tile-mm` 省略時はJSONどおり木目300×900mm、キャンバス150×150mm。`--texture` で別タイルも指定可能。`--dry-run` はBlenderを一切起動せず引数だけを出す。出力フォルダが既にあれば停止する。

入力は `.mesh.json`＋同じフォルダのbin、FBX、GLB、OBJ。自前形式はmm/Y-upをm/Z-upへ先に変換する（X回り+90°、元ZがBlenderの-Y）。GLB/FBXはインポーターのm/Z-up、OBJは既定mm/Z-up（`--units m` 対応）。この座標前提が異なる入力は先に整える。

Blender上の世界座標からUVMap0を `u=X(mm)/横寸法, v=Y(mm)/長手寸法` で作り直す。元のZ長手と符号は反対になるが、スタジオと同じMIRROR反復では同じ柄の位置になる。AOはUV1（名前AO）のSmart UVを維持。平面整理→Decimate（既定0.2）→UV生成→CPU/16samples/1024px AO→GLB。形状間引きの輪郭保持・AO・材質の実描画確認は次の実行で行う。製造用には使用しない。

### 同じカメラで比較（ジョブズが実行）

元のrender-compare.pyのカメラ・光・画角を引き継ぎ、両方に同じ `--reference` を指定すれば比較対象の外形差でカメラが変わらない。1400×900px、既存画像があれば停止。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python scripts/blender-pipeline/render-compare.py -- exports/hexa-studio-blender-20261010/out-floor-2/interior-floor-oak/trial.glb exports/hexa-studio-blender-20261010/compare-wood-before.png --reference exports/hexa-studio-blender-20261010/floor-input-reference.glb
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python scripts/blender-pipeline/render-compare.py -- exports/hexa-studio-blender-20261010/out-floor-wood-v3/interior-floor-oak/trial.glb exports/hexa-studio-blender-20261010/compare-wood-after.png --reference exports/hexa-studio-blender-20261010/floor-input-reference.glb
```

### 家具の下書き（任意、未実行）

`--mode furniture-draft` は合板面と小口を別材質にする。元画像の下388pxを除いて「表面 B」を外す。15mm表記の板の前左の小口を傾き補正し1024×128pxの帯にした。切り出し座標はextract_tile.pyに明記。

上下向き（世界法線のabs(Z)>=0.7）は面、横向きは小口。面の柄寸法1220×2440mm、小口の横繰返し300mm・厚み15mmは仮の表示設定。垂直に立つ側板の広い面や金属にもこの単純判定がかかるため、家具全体への本採用には板ごとの姿勢・材種による分類が必要。今日は床のみが対象。元写真・タイルを公開ページには載せない。

### Pythonだけの検査

```sh
python3 -B scripts/blender-pipeline/test_mapping.py
```

写真UVと画像の上下、実寸投影、負座標の反転反復、5柄の選択、出力上書き拒否、Python構文を検査する。Blenderは起動しない。

## 圧縮

Codex Nodeのパス：`~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`。
`dependencies/package.json`とlockにglTF Transform CLI 4.5.1を記録。dependencies内でnpm ciを実行して準備する（この環境ではnpmが付属しないためnpm 12.2.0をregistryから同フォルダへ取得して使用した）。node_modulesとnpm本体はコミットしない。

```sh
python3 scripts/blender-pipeline/compress.py 入力.glb 新しい出力.glb
```

WebP品質82→Meshopt、位置16bit／法線12bit／UV14bit。元UVが[0,1]外ならCLIはUV量子化を省略して保持する。gzipは配信または別ファイルで追加する。Meshoptには微小な量子化誤差がある。

`validate.mjs`で圧縮前後GLBをデコードし、三角形数・メートル外形を比較できる。floor-input-referenceの圧縮で検証済み。AOやFBXを含む完成経路の成功を意味しない。

サイトへモデルを組み込む処理は含まない。スタジオの元assetsには書き込まない。


## SIGBUS切り分け（2026-10-10）

`--skip-ao` はAO画像生成・AOノード・焼き・保存を省略する。UV1 Smart UVは残し、UV処理とAO処理を切り分ける。
`--skip-export` はGLB出力を省略し、metrics.jsonのbytesはnullになる。両方の併用が可能。
`STAGE: … BEGIN/END` で各処理を記録し、例外時はERROR、意図的な省略時はSKIPを表示する。
run.pyは標準出力・標準エラーをまとめ、blender-run.logへ逐次保存する。最後のBEGINにENDがなければ停止候補。
全実行／AOなし／AOと出力なしのコマンドは `exports/hexa-studio-blender-20261010/報告-SIGBUS-2026-10-10.md` を参照。
今回のBlender実行はジョブズ担当。packによるSIGBUS解消は未確認。

## AOモード（2026-10-10）

`run.py`／`pipeline.py` の `--ao-mode` は `plain`（既定）／`packed`／`lowres`／`gpu-off`／`none`。
plainは焼く間だけ白Diffuseへ交換（生成AOの焼き先ノードだけ残す）、終了後は木目＋AOへ復元。
packedは焼く直前に全画像pack、lowresは512px・4samples・margin2、gpu-offはGPU無効・denoising無効・64pxタイル。
noneは--skip-aoと同じ。--skip-ao併用はnone優先。各モードのSTAGEログとmetrics.jsonのao_settingsを比較する。
BlenderでのSIGBUS回避成功は未確認。filled床・oakの5本の実行コマンドは作業場の
`exports/hexa-studio-blender-20261010/報告-AOモード-2026-10-10.md` に記載。
Python検査は `python3 -B -m unittest discover -s scripts/blender-pipeline -p 'test_*.py'`（Blender起動なし）。


## 家具AOアトラス（2026-10-10）

家具モードは入力1ファイルを1部品とし、全ボディの間引き・UV0・材質割当て後に結合する。
結合後のUV1にSmart UV Projectを1回実行し、全材質が共有するAO画像へ1回焼く。
既定2048px、`--ao-atlas-size 4096` も選択可能。家具のlowresも画像サイズはこの指定を使い、サンプル4・余白2のみ軽くする。
小さいボディも今回は全て含める。none/skip-aoでは画像と焼きを省略する。
生成画像は非float・アルファなしの8bit PNGで、保存後にPNGヘッダーを検査する。
床のUV・AO・圧縮の既定品質82は維持する。

家具の圧縮には `python3 -B scripts/blender-pipeline/compress.py 入力.glb 新出力.glb --mode furniture-draft`。
WebP品質80、Meshopt圧縮。使用する全材質がUV1・同じ1枚のAO画像を参照することを圧縮前後に検査する。
`新出力.compression.json` に容量と2,000,000 bytes以下の判定を残し、超過は非ゼロ終了する（出力は調査用に残る）。
Blenderでの実焼き・画質・アルミベッド2MB達成はジョブズの実行待ち。
木の面／小口の既存の仮分類は継続し、アルミ材質の数値化・板の姿勢判定は今回変更しない。
実行1行と制限の詳細は作業場の `exports/hexa-studio-blender-20261010/報告-AOアトラス-2026-10-10.md`。


## 家具の材質貼り分け（2026-10-10、旧家具の仮分類を置換）

`--mode furniture-draft --finish birch`（家具の既定）または `--finish hexa`。
materials.jsonのボディ名→元材質名の順で判定し、同種材質を共有、合板は面／小口だけを分ける。
板の最短軸と法線で面小口を判定し、面内の短い軸を木目方向とする。AO1枚共有は維持。
未判定は合板に仮置きし、実行先のmaterial-report.jsonへ一覧を保存する。
Hexaはvisual-materials.jsの六角模様とsRGB色をPillowで生成し、新しい出力フォルダに保存する。
元UV450×900mmとrepeat(5,10)に合わせ1タイル90×90mm。小口は従来のバーチ、表面roughness=0.7、REPEAT指定。Canvas2Dとの輪郭のアンチエイリアス差はあり。
手順は作業場のexports/hexa-studio-blender-20261010/報告-Hexa柄-2026-10-10.md。
詳細・未判定32ボディ・実行1行は作業場のexports/hexa-studio-blender-20261010/報告-材質の貼り分け-2026-10-10.md。
実Blender出力は未検証。Python検査は上のunittest discoverで実行する。


## 忠実さ優先（2026-10-10、上記の旧設定より優先）

既定比率0.6。家具はボディ全体で3,000三角形未満、またはローカル外接寸法の最短辺が20mm未満なら、間引き・溶接・退化面削除を全て省略する。
mesh.jsonの元色を優先し、opaque_albedo→metal_f0→surface_albedoの順にsRGBを取得する。元色がない場合は停止。未判定は合板へ塗らず元色の非金属として記録する。
アルミだけ#d9d9d9/metalness0.9/roughness0.35、コンテナ本体・蓋#858585/0/0.6を指定値へ統一。材質は種類＋色＋物性ごとに共有し、旧10材質制限を撤廃。
合板は各ボディの全材質パートで共通の原点と軸を使用。同じ写真・物理縮尺・面内短辺方向を使い、REPEATで反転を防ぐ。面と小口はsRGB、AOはNon-Color。
家具AOは64samples以上、margin32px、白で初期化してuse_clear=False、焼き後に0.85〜1.0へ圧縮。1家具1枚、UV1を維持する。
圧縮後の容量目標は既定4,000,000 bytes。compress.pyとrebuild_bounds.pyの`--max-bytes`で変更できる。超過時は形状を削らず警告のみ（終了コード0）、容量報告へ`target_met: false`を残す。

4家具×birch/hexaの8本を新規フォルダへ再生成する（Blender実行はジョブズ）：

```sh
python3 -B scripts/blender-pipeline/rebuild_bounds.py --execute --tag reality-20261010-1
```

`--execute`なしなら24コマンドを表示するだけ。再実行時は未使用のtagを指定。旧GLB・layoutsへの書込や採用処理は含まない。
今回のBlender実生成・実容量・見た目は未検証。元色・AO・保護境界のBlenderなし検査はtest_reality.pyに追加。

## 2026-10-10 元表示への色味合わせ

`rebuild_bounds.py --execute --tag match-20261010-1` は既定で `--face-source studio`。
元画面が使う `assets/wood-grain.jpg`（仕上げ見本の furniture-finish-birch.webp とは別）を使い、
面の混色・濃淡・彩度・線形RGB倍率を画像へ一度だけ反映する。元UV0を維持し、
Hexa切替対象は app.js と同じ材質名 `SKY Hexa plywood|Hexa lightweight - charcoal` のみ。
切替対象でない天板は木目のまま。Hexa時の木目面は元画面と同じくバーチ補正なし。
小口の既存写真と投影、AO UV1、形状・外形保護は維持。

`--face-source tetsuya` は従来の実写切抜きを元木目画像のRGB累積ヒストグラムへ合わせ、
同じ画面補正を適用する。こちらは従来の物理寸法による木目投影を維持する。
色統計・画像参照元は各新規出力直下の `texture-match.json` に残す。
元画像、tiles、layoutsには書き込まない。

I-Seatは元画面の `assets/mattress-colors/light-green.jpg` を色と布目に使用し、
元UV0を消去しない。縫い目は画像なしで元の線形倍率0.64を適用。
冷蔵庫のgraphite材質は元meshのmetal_f0そのままでは元画面と異なるため、
元画面のrgb(61,65,69)→線形0.85倍と同じ #383c40 にする。
AOの白クリアやsRGB二重変換が扉の色差の原因ではない。

再生成はジョブズが実行する。出力済みtagは拒否し、layoutsへのコピーは行わない。
検査は `python3 -B -m unittest discover -s scripts/blender-pipeline -p 'test_*.py'`。
Blenderを起動せず、色値・切替規則・木目統計・UV保持・コマンド伝達を検査できる。

## 2026-10-10 容量上限と部分再生成

`--parts active-side-cabinet,aluminum-front-kitchen,i-seat` で対象を絞れる（各birch/hexa）。省略時は全4家具。
1本の生成・圧縮・寸法検査が失敗したら、その1本の後続処理を省き、次の仕上げ／部品へ進む。最後に部品・仕上げ・失敗段階をまとめ、失敗ありは終了コード1、すべて成功は0。容量超過の警告だけでは失敗扱いにしない。
既存の出力フォルダがあるtagは、開始前に拒否する。新しいtagを使い、元ファイルは上書きしない。


## 2026-10-10 ALBERO天板・明るい合板（上記旧設定より優先）

天板判定の実体は `layouts/countertops.js`。JSONの対象モジュール内で
元材質名が `oak|オーク材`、`koguchi` を除き、頂点法線がすべて上向き >0.8 の面だけに適用する。
`countertop-material.json` の `web_surface.image` と `tile_mm` を読み、
既存ボディの長手／短手と原点で440×1200mm・MIRROR投影する。
ALBERO面はsRGB・roughness .86・metalness 0。小口・裏面・ベッドは従来材質のまま。
仕上げbirch/hexaに共通、輪郭や穴の形状は変更しない。

家具AOは128samples以上、レンジ0.92〜1.0。合板面・小口・Hexa面はroughness .6、metalness 0。
テツヤ写真は既存の元木目画像への色合わせと表示補正後、sRGB平均明度を最大6%上げる。
参照のwood-grain.jpg平均明度を上限とし、既に明るいvariantは増幅しない。
元写真自体は参照より明るいため、一律の増幅はしない。実測はtexture-match.jsonに保存。

全8本の再生成（ジョブズが実行、CodexはBlenderを起動しない）：

```sh
python3 -B scripts/blender-pipeline/rebuild_bounds.py --execute --tag albero-20261010-1 --face-source tetsuya
```

`--execute`を外すとdry-run。既存出力拒否、layoutsへの書込なし。
シンク付きaluminum-side-cabinetも共通変換で対応するが、既存8本セットは
aluminum-bed / active-side-cabinet / aluminum-front-kitchen / i-seat ×2仕上げを維持。

コンテナ本体・蓋の既定色は `#858585`（roughness 0.6 / metalness 0）。`rebuild_bounds.py` または `run.py` に `--container-color '#777777'` を付けるとその実行だけ色を変更できます。`check_material_report.py` にも同じ指定が使え、`rebuild_bounds.py` は変換と検査の両方へ渡します。


### 2026-10-10 フロント後端と純正シート

`--parts all` は13モジュール＋付属6種類、各birch/hexaの38本。
`--parts front-module` は後端20/114/130/140も含む。後端だけの直接指定も可能。
後端は元データのbase_module=front-moduleを使用し、合板表面・小口・Hexa・天板の既存規則を共用する。
表示条件はconfigurations.jsonのplacements.front-module.asset_keyに従う。
現行保存構成ではslide-bed/lounge-slide-bedがrear-130、lounge-bed/two-side-bed/aluminum-bedがrear-140。
rear-20/114も変換対象だが現行保存構成に使用なし。layouts側のGLB採用は別作業。

純正seatはsource_originalに分類し、生地・木・指定アルミ色を適用しない。
元meshのmetal_f0=[160,160,160]を、元表示app.js＋visual-materials.jsと同じ
sRGB→線形RGB×0.85、metalness=0.9、roughness=0.35で渡す。
JSON自体にはroughnessがないため元表示側の解釈を保持する。黒への固定着色はしない。
I-Seatの布・縫目は従来どおり。生成後のmaterial-reportも全seat部品を検査する。

作業場直下から再生成（この行はBlenderを起動する。今回未実行）：

```sh
python3 -B scripts/blender-pipeline/rebuild_bounds.py --execute --parts front-module-rear-20,front-module-rear-114,front-module-rear-130,front-module-rear-140,seat --tag rear-seat-20261010-1 --face-source tetsuya --max-bytes 4000000
```

`--execute`を外すと実行せず40コマンドを表示する。5種類×2仕上げ=10本。
出力はexports/hexa-studio-blender-20261010/、既存出力は拒否。layouts/への書込なし。

### 2026-10-10 バーチをスッキリ明るく（旧6%補正より優先）

テツヤ写真は旧表示用の暗い乗算を通さず、写真の木目を元画像へ色合わせした後、
明るさ1.14・彩度0.85・平均色#e8dcc8へホワイトバランスを補正する。
参照の木目の標準偏差へ合わせ、白飛びを防ぐ共通係数でコントラストを抑える。
14%は露出段だけの値。旧暗色補正の撤去と平均色合わせもあるため最終増加率とは異なる。
全3variantに同じ明るい写真を使う。黒Hexaの画像とALBEROの色は維持。
合板面（Hexa面も含む）はroughness .45・metalness 0、AO=1固定。
ALBERO面もAO=1、専用roughness .86は維持。小口・金物は従来のAO .92〜1。
AO=1はocclusionTextureを出力しないことで表現し、圧縮検査も面だけ例外とする。
既定plainモードのAO焼込み用材質は独立しているため、小口・金物の焼込みを維持する。

```sh
python3 -B scripts/blender-pipeline/rebuild_bounds.py --execute --parts all --finishes birch,hexa --face-source tetsuya --tag bright-20261010-1 --max-bytes 4000000
```

全13モジュール＋付属6種×2仕上げ=38本。ジョブズが実行する。
`--execute`なしで152段階のdry-run。layoutsへは書き込まない。
`bright_samples.py`はBlenderを起動せず、tiles/へ561×768の前後画像と比較画像を新規保存する。
同名がある場合は上書きせず停止する。小さい見本と本番解像度では統計に軽微な差がある。

### 2026-10-10 バーチは元の木目＋6%（最新）

既定は `--face-source studio`。元wood-grain.jpgの画素へ共通1.06倍のみ。
旧toned/natural/rawの混色・彩度・コントラスト補正を通さず、3種とも同じ画像。
小口は元バーチ小口の積層を保持し、共通RGB倍率で面の平均明度へ合わせる。
面AOなし・roughness .45、ALBERO・Hexa天板バーチ・コンテナ#858585は維持。

```sh
python3 -B scripts/blender-pipeline/rebuild_bounds.py --execute --parts all --finishes birch,hexa --tag studio-20261010-1 --face-source studio --max-bytes 4000000
```

38本。`--execute`を外せばBlenderを起動せず152段階を表示。layoutsへのコピーなし。

### 2026-10-10 見た目を変えずに共通画像化（最新）

承認済み38本（ba0e824）の形状・画像をそのまま使い、画像の保存先だけ変更する。
`--external-textures` を付けた `rebuild_bounds.py` は **Blenderを起動せず**、
既存 `exports/hexa-public/layouts/assets/blender/` のGLBを読む専用経路になる。
再焼込み・画像の縮小・画像再圧縮・二重のmeshopt量子化は行わない。
色指定の変更は拒否。AOは元の解像度・元のバイト列のまま埋め込む。

ジョブズ用の38本一括再出力（Codexは今回未実行）：

```sh
python3 -B scripts/blender-pipeline/rebuild_bounds.py --execute --parts all --finishes birch,hexa --tag shared-tex-20261010-1 --external-textures
```

`--execute` を外すと38コマンドと容量の計算結果だけを表示する。
出力先は `exports/hexa-studio-blender-20261010/shared-textures-shared-tex-20261010-1/`。
配下の `assets/blender/` に38GLB、`assets/blender/tex/` に共通WebPができる。
画像内容のSHA-256をファイル名に使い、内容が同じ画像を仕上げ・部品間でも共有する。
GLB内は `images[].uri = "tex/<sha256>.webp"`。既存の出力先は上書きしない。
結果は `capacity.json` に残る。`layouts/` へのコピー・採用は別作業。
採用時はGLBと `tex/` を同じ構成でまとめて渡す（GLB単独では画像が不足する）。

`compress.py --external-textures` は既存WebPだけ受け付ける。
既にmeshopt済みなら形状の再圧縮も省略。未圧縮の入力ではmeshoptだけを実行し、
全画像・AOのバイト一致を検査してから外部参照を復元する。WebP変換コマンドは呼ばない。
PNG/JPEG入力は再圧縮禁止のため拒否する。既存のオプションなし経路は従来どおり。

基準38本からのメモリ上の算出では93,302,584→27,519,944 bytes（共通画像込み）。
GLB 25,851,084＋共通画像5枚1,668,860 bytes。生成済みファイルの実測ではない。
アルミベッドbirch単体：初回2,512,964→2,512,264 bytes、画像が全てキャッシュに
残っている場合は1,005,980 bytes。外部化だけで初回の全画像取得が不要になる訳ではない。
HTTPキャッシュの設定・再検証・同時読込によって実通信量／回数は変わる。

検査（Blender不要）：

```sh
python3 -B -m unittest discover -s scripts/blender-pipeline -p test_external_textures.py -v
```

全38本の画像・AO・圧縮形状バイト一致、材質・UV・変換情報の保持、
共通化・再入力・上書き拒否・dry-run・meshoptのみの分岐を検査する。
画面のピクセル比較は未実施。表示データの同一性をバイト単位で確認する。
