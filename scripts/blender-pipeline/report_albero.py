"""Build the ALBERO comparison sheet and report from completed checks."""
from pathlib import Path
import json,html,hashlib
from PIL import Image,ImageDraw
from rebuild_bounds import ROOT
base=ROOT/'exports/hexa-studio-blender-20261011';r=base/'albero-review';out=base/'shared-textures-albero-20261011-1';rows=json.loads((out/'material-changes.json').read_text());logs=json.loads((r/'capture-results.json').read_text());assert len(logs)==2
assert all(not l['errors'] and not l['warnings'] and not l['badResponses'] for l in logs)
assert len(logs[1]['all38'])==38
comparisons=[];(r/'comparison').mkdir(exist_ok=True)
for p in sorted((r/'before').glob('*.png')):
 a=Image.open(p).convert('RGB');b=Image.open(r/'after'/p.name).convert('RGB');canvas=Image.new('RGB',(1920,640),'white');canvas.paste(a.resize((960,600)),(0,40));canvas.paste(b.resize((960,600)),(960,40));d=ImageDraw.Draw(canvas);d.text((20,12),'BEFORE',fill='black');d.text((980,12),'AFTER',fill='black');canvas.save(r/'comparison'/p.name);comparisons.append(p.name)
for a,b in zip(logs[0]['tests'],logs[1]['tests']):assert a['key']==b['key'] and a['finish']==b['finish'] and a['views']==b['views']
(r/'比較一覧.html').write_text('<!doctype html><meta charset="utf-8"><title>ALBERO 裏面 前後比較</title><style>body{font:16px sans-serif;background:#eee;margin:24px}img{max-width:100%}section{margin:32px 0}</style><h1>ALBERO天板の裏面・小口</h1><p>左：現在の採用版／右：修正版。設計データを元にしたイメージです。実際の色・仕様とは細部が異なる場合があります。</p><p>inside＝車内、underside＝下から、top-only＝天板のみの裏面（他の部品を一時非表示）。</p>'+''.join(f'<section><h2>{html.escape(n)}</h2><img src="comparison/{n}"></section>' for n in comparisons))
assets=ROOT/'exports/hexa-public/layouts';baseline=json.loads((r/'baseline.json').read_text());deltas=[n for n,h in baseline.items() if not (assets/n).exists() or hashlib.sha256((assets/n).read_bytes()).hexdigest()!=h];(r/'scope-check.json').write_text(json.dumps(dict(original_layouts_written_by_this_task=False,concurrent_changes=deltas),indent=2))
size=sum(p.stat().st_size for p in (out/'assets/blender').rglob('*') if p.is_file());delta=max(x['delta'] for x in logs[1]['all38']);unique={(x['model'],x['body_index']):x for x in rows}
text=f'''# ALBERO天板の裏面・小口（2026-10-11）

完了：対象10種類の天板を、Hexa・バーチ両仕上げとも部品全体でALBEROにしました。38GLBを別出力し、本番には反映していません。

[前後写真18組](albero-review/比較一覧.html) ／ [修正版38本](shared-textures-albero-20261011-1/assets/blender/)

## 変更と検査

- 変更20GLB、天板20部材（仕上げ別）、42面区分。残り18GLBは全バイト一致。
- 合計 {size:,} bytes。既存共有WebP5枚をそのまま利用。画像の再生成・再圧縮なし。
- 上面の材質・UV、全形状・法線・位置・AO用UVとAO割当を保持。下面と小口だけ既存ALBERO素材へ変更。小口は厚み方向を含むUVを設定。
- ベッド天板・他の合板・金物と、既存の材質判定規則は変更なし。`countertop_candidate`に該当する部品の全パーツを対象。
- 独立検査38本成功。ブラウザーで38本すべてGLB採用・外接差2mm以内、最大 {delta:.9f} mm。最終撮影の読込エラー・警告・HTTPエラー0。
- 再実行：`python3 -B scripts/blender-pipeline/repair_albero.py --execute --external-textures --tag albero-20261011-2`（新しい出力名が必要）。

## 前後画像

side-cabinet・front-module・aluminum-side-cabinetの両仕上げ、車内・下から・天板のみの裏面、前後36PNG（1440×900）。比較18PNG（1920×640）。全18組で同一カメラ。

「前」の6GLBは現在の公開URLから取得したものと全バイト一致。UIは作業開始時のローカル採用版を複写して統一し、GLBだけ差し替えています。公開サイトの画面全体を直接撮影した比較ではありません。

細身side-cabinetの扉開閉機能は現行実装にないため、扉を開けた画像は作らず、天板だけを一時表示した裏面画像で確認しました。元の部品の形状・位置は変えていません。

設計データを元にしたイメージです。実際の色・仕様とは細部が異なる場合があります。

'''
for model in ['side-cabinet','front-module','aluminum-side-cabinet']:
 for finish in ['black','birch']:text+=f'### {model} / {finish}\n\n![裏面前後](albero-review/comparison/{model}-{finish}-top-only.png)\n\n[車内](albero-review/comparison/{model}-{finish}-inside.png) ／ [下から](albero-review/comparison/{model}-{finish}-underside.png)\n\n'
text+='## 変更部品一覧\n\n各行ともHexa・バーチの両方。寸法は元データのX/Y/Z、mm。\n\n|モジュール|部品（元番号）|X × Y × Z mm|\n|---|---|---|\n'
for (model,i),x in unique.items():
 lo,hi=x['bounds_mm'];dims=' × '.join(f'{b-a:g}' for a,b in zip(lo,hi));text+=f"|{model}|{x['body']}（{i}）|{dims}|\n"
text+='''
## 記録・作業範囲

[材質変更の全一覧](shared-textures-albero-20261011-1/material-changes.json) ／ [入力ハッシュと概要](shared-textures-albero-20261011-1/summary.json) ／ [保持検査](albero-review/verification.json) ／ [ブラウザー検査](albero-review/capture-results.json) ／ [本番データ照合](albero-review/production-check.json) ／ [並行変更の記録](albero-review/scope-check.json)

元のlayouts/と8766へ書込なし。並行担当の変更は保持。Blender・Fusion・Chrome起動・push・公開なし。既存Chrome 9222の専用コンテキストと一時8767だけを使用。

初回は小口の別パーツを検出して対象を部品全体へ広げました。初回撮影の未定義視点と複写版の補助CSS/JS不足を直し、最終画像を取り直しています。

次にできること：ジョブズが比較画像を確認し、別作業で修正版を採用する。
'''
(base/'報告-ALBERO裏面-2026-10-11.md').write_text(text)
print(size,delta,len(comparisons))
