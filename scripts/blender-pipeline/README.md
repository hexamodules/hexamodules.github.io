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
Hexaは既存assets/furniture-finish-hexa.webpの表面部分を実行時に切り出す。
patterns/*-black*は車全体の画像なので素材として使用しない。写真のピッチ・木目方向は仮設定。
詳細・未判定32ボディ・実行1行は作業場のexports/hexa-studio-blender-20261010/報告-材質の貼り分け-2026-10-10.md。
実Blender出力は未検証。Python検査は上のunittest discoverで実行する。
