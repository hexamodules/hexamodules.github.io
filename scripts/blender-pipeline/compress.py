"""Compress a Blender GLB with the pinned local glTF Transform CLI.
No input overwrite. WebP retains alpha, quality 82. Meshopt uses 16-bit positions.
"""
import argparse,subprocess,os
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');a=p.parse_args()
base=Path(__file__).resolve().parent;node=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node';cli=base/'dependencies/node_modules/@gltf-transform/cli/bin/cli.js';src=Path(a.input).resolve();out=Path(a.output).resolve();temp=out.with_name(out.stem+'-webp.glb')
if out.exists() or temp.exists():raise SystemExit('Choose a new output name')
subprocess.run([str(node),str(cli),'webp',str(src),str(temp),'--quality','82'],check=True)
subprocess.run([str(node),str(cli),'meshopt',str(temp),str(out),'--quantize-position','16','--quantize-normal','12','--quantize-texcoord','14'],check=True)
