"""Serve a frozen review copy on 8767; never write to layouts."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, unquote
from rebuild_bounds import ROOT
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        p=unquote(urlsplit(path).path)
        base=ROOT/'exports/hexa-public'
        if p.startswith('/layouts/'):
            base=ROOT/'exports/hexa-studio-blender-20261011/lounge-top-review/studio-snapshot'
            p=p[len('/layouts/'):]
        return str(base/p.lstrip('/'))
ThreadingHTTPServer(('127.0.0.1',8767),Handler).serve_forever()
