"""Generate small before/after proof tiles only; never starts Blender."""
import json
from PIL import Image, ImageDraw
import numpy as np
from extract_tile import defaults, save_new
from match_textures import histogram_match, studio_face, brighten_face, stats


def main():
    assets, tiles = defaults()
    with Image.open(assets/'wood-grain.jpg') as im:
        reference=im.convert('RGB');reference.thumbnail((768,768))
    with Image.open(tiles/'birch-face.png') as im:
        source=im.convert('RGB');source.thumbnail((768,768))
    matched=histogram_match(source,reference)
    old=studio_face(matched)
    weights=np.array([.2126,.7152,.0722])
    old_mean=float((np.asarray(old)@weights).mean())
    gain=max(1,min(1.06,float((np.asarray(reference)@weights).mean())/old_mean))
    before=Image.fromarray(np.rint(np.clip(np.asarray(old,dtype=float)*gain,0,255)).astype('uint8'))
    after,adjustment=brighten_face(matched,reference)
    tag='birch-bright-20261010-1'
    save_new(before,tiles/(tag+'-before.png'))
    save_new(after,tiles/(tag+'-after.png'))
    w,h=before.size
    pair=Image.new('RGB',(w*2,h+32),'white')
    pair.paste(before,(0,32));pair.paste(after,(w,32))
    draw=ImageDraw.Draw(pair);draw.text((10,10),'BEFORE',fill='black');draw.text((w+10,10),'AFTER #e8dcc8',fill='black')
    save_new(pair,tiles/(tag+'-comparison.png'))
    report=dict(size=list(after.size),before=stats(before),after=stats(after),reference=stats(reference),adjustment=adjustment)
    with (tiles/(tag+'.json')).open('x') as f:json.dump(report,f,indent=2)
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
