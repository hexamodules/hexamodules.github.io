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
