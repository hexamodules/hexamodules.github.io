# 床の変換経路（2026-10-10・試作）

**Blender段は実行未検証。** この環境のBlender 5.2.2 LTSは、バックグラウンド起動時のMetal検出でSIGSEGVになる。Python本文へ到達しない。完成したBlender試作GLBやAOとして扱わないこと。

## 実行

プロジェクト直下から：

```sh
python3 scripts/blender-pipeline/run.py 入力フォルダ 出力フォルダ
```

入力は `.mesh.json`＋同じフォルダのbin、FBX、GLB、OBJ。床の自前形式は同じ場所のfloor-finishes.jsonも使用。既定木目は現行オーク写真。別画像は `--texture`。出力先に同名の部品フォルダがあると停止し、上書きしない。FBXの正式なサンプルは未入手・未検証。FBX/GLBはインポーターがメートルへ変換するため追加の1000倍補正をしない。自前mm形式とOBJ(mm指定)は0.001倍にする。異常な寸法を自動推測で補正しない。

Blender内で読み込み→同一頂点統合→輪郭とUV境界を考慮した平面整理→試験的Decimate（既定0.15）→元木目UVを残してAO用Smart UV→Cycles CPU/16samples/1024px AO→PBR→GLBを行うコード。間引きの目標達成や輪郭保持は未確認で、出力後に元モデルとの外形・段差・UVの目視比較が必須。製造用データには使わない。

Blenderを必要としない入口変換（動作確認済）：

```sh
python3 scripts/blender-pipeline/mesh_to_glb.py exports/hexa-public/layouts/assets/interior-floor-oak.mesh.json exports/hexa-studio-blender-20261010/新しい入力名.glb
```

これは材質色と元UVの入力用GLB。木目・AOは未付与。三角形85,464を維持する。床用の実行では元mesh.jsonを直接指定すると、現行の床写真切り出しを作れる。

## 圧縮

Codex Nodeのパス：`~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`。
`dependencies/package.json`とlockにglTF Transform CLI 4.5.1を記録。dependencies内でnpm ciを実行して準備する（この環境ではnpmが付属しないためnpm 12.2.0をregistryから同フォルダへ取得して使用した）。node_modulesとnpm本体はコミットしない。

```sh
python3 scripts/blender-pipeline/compress.py 入力.glb 新しい出力.glb
```

WebP品質82→Meshopt、位置16bit／法線12bit／UV14bit。元UVが[0,1]外ならCLIはUV量子化を省略して保持する。gzipは配信または別ファイルで追加する。Meshoptには微小な量子化誤差がある。

`validate.mjs`で圧縮前後GLBをデコードし、三角形数・メートル外形を比較できる。floor-input-referenceの圧縮で検証済み。AOやFBXを含む完成経路の成功を意味しない。

サイトへモデルを組み込む処理は含まない。スタジオの元assetsには書き込まない。
