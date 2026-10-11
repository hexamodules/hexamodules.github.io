"""Build comparison sheets and evidence from captured, unedited studio PNGs."""
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[2]
if ROOT.name=='hexa-public':ROOT=ROOT.parent.parent
BASE=ROOT/'exports/hexa-studio-blender-20261011'; OUT=BASE/'edge4-review'
KEYS=['front-module','two-side-bed','side-cabinet','lounge-bed','lounge-slide-bed','aluminum-front-kitchen']
NAMES=['フロントキッチン（合板）','両サイドベッド','サイドキャビネット','ラウンジベッド','ラウンジスライドベッド','フロントキッチン（アルミ）']
VIEW={'side':'サイド','inside':'車内','rear':'後ろ'}
font=ImageFont.truetype('/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',24)
records=[];(OUT/'comparison').mkdir(exist_ok=True)
logs=json.loads((OUT/'capture-results.json').read_text());assert len(logs)==2
assert all(not x['errors'] and not x['warnings'] and not x['badResponses'] for x in logs)
for key,label in zip(KEYS,NAMES):
 for finish in ['black','birch']:
  for view,vlabel in VIEW.items():
   name=f'{key}-{finish}-{view}.png'
   a=Image.open(OUT/'before'/name).convert('RGB');b=Image.open(OUT/'after'/name).convert('RGB')
   diff=ImageChops.difference(a,b); pixels=sum(x!=(0,0,0) for x in diff.getdata())
   before=next(t for t in logs[0]['tests'] if t['key']==key and t['finish']==finish)
   after=next(t for t in logs[1]['tests'] if t['key']==key and t['finish']==finish)
   assert before['views']==after['views'],(key,finish)
   records.append(dict(key=key,finish=finish,view=view,pixels_changed=pixels,bbox=diff.getbbox(),camera_identical=True,viewport_pixels_changed=sum(x!=(0,0,0) for x in diff.crop((0,84,1440,900)).getdata())))
   sheet=Image.new('RGB',(1920,680),'#f8f8f5');d=ImageDraw.Draw(sheet)
   d.text((20,10),f'{label} / {vlabel} / '+('Hexa' if finish=='black' else 'Birch'),fill='#24312a',font=font)
   d.text((20,45),'前：現在の採用GLB',fill='#24312a',font=font);d.text((980,45),'後：修正版 hexafix-20261011-2',fill='#24312a',font=font)
   sheet.paste(a.resize((960,600)),(0,80));sheet.paste(b.resize((960,600)),(960,80))
   sheet.save(OUT/'comparison'/name)
(OUT/'pixel-comparison.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
html=['<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>両サイド縁4枚 前後比較</title><style>body{font-family:sans-serif;background:#f5f5f0;color:#26372d;margin:24px}img{width:100%;height:auto}section{max-width:1600px;margin:36px auto}a{color:inherit}nav a{margin:12px}summary{cursor:pointer}</style><h1>縁4枚を黒に・前後比較</h1><p>左＝現在の採用GLB、右＝修正版。形状・照明・カメラは同一。設計データを元にしたイメージです。実際の色・仕様とは細部が異なる場合があります。</p><nav>']
for k,n in zip(KEYS,NAMES):html.append(f'<a href="#{k}">{n}</a>')
html.append('</nav>')
for k,n in zip(KEYS,NAMES):
 html.append(f'<section id="{k}"><h2>{n}</h2>')
 for v,label in VIEW.items():html.append(f'<h3>{label}・Hexa</h3><a href="comparison/{k}-black-{v}.png"><img src="comparison/{k}-black-{v}.png" loading="lazy" alt="{n} {label} 前後"></a>')
 html.append('<details><summary>バーチ版の前後</summary>')
 for v in VIEW:html.append(f'<img src="comparison/{k}-birch-{v}.png" loading="lazy" alt="バーチ前後">')
 html.append('</details></section>')
(OUT/'比較一覧.html').write_text('\n'.join(html))
print(json.dumps(records,ensure_ascii=False,indent=2))
parts=json.loads((OUT/'parts-results.json').read_text());assert len(parts)==2
assert all(not x['errors'] and not x['warnings'] and not x['badResponses'] for x in parts)
for key,label in zip(KEYS,NAMES):
 if key=='side-cabinet':continue
 name=f'{key}-black-parts.png';a=Image.open(OUT/'before'/name).convert('RGB');b=Image.open(OUT/'after'/name).convert('RGB')
 before=next(t for t in parts[0]['tests'] if t['key']==key);after=next(t for t in parts[1]['tests'] if t['key']==key);assert before['views']==after['views']
 sheet=Image.new('RGB',(1920,680),'#f8f8f5');d=ImageDraw.Draw(sheet)
 d.text((20,10),f'{label} / 変更部材のみ（他の部品を一時非表示）',fill='#24312a',font=font)
 d.text((20,45),'前：現在の採用GLB',fill='#24312a',font=font);d.text((980,45),'後：修正版 hexafix-20261011-2',fill='#24312a',font=font)
 sheet.paste(a.resize((960,600)),(0,80));sheet.paste(b.resize((960,600)),(960,80));sheet.save(OUT/'comparison'/name)
 html.append(f'<section><h2>{label}：変更部材の補助表示</h2><p>完成車の写真ではなく、変更部材のみを元の位置・素材のまま表示した確認画像。</p><img src="comparison/{name}" loading="lazy"></section>')
(OUT/'比較一覧.html').write_text('\n'.join(html))
