#!/usr/bin/env python3
"""Build the self-contained game pages.

    python3 build.py

- v3 (main game): src/v3/markup.html + src/v3/script.js  ->  index.html
- v2 (fly-through fallback): src/v2/template.html         ->  versions/v2-flythrough.html

Every %%asset-name%% placeholder is replaced with that file from assets/ as a data URI, so each output
is a single HTML file you can open directly or host anywhere (e.g. GitHub Pages).
%%SHIELD_L%% / %%SHIELD_R%% are inlined as live SVG (the game recolors the meter segments).
%%TYPEKIT%% becomes the Adobe Fonts kit link for Eurostile Extended (falls back to Michroma if it can't load).

Pass --artifact to also write dist/*.html bodies without the doctype/typekit (for claude.ai artifacts).
"""
import base64, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
A = ROOT / 'assets'
TYPEKIT = '<link rel="stylesheet" href="https://use.typekit.net/gon5nqi.css">'


def uri(name):
    b = (A / name).read_bytes()
    mime = 'image/svg+xml' if name.endswith('.svg') else 'image/png'
    return f'data:{mime};base64,' + base64.b64encode(b).decode()


def inline_shield(name, sid):
    s = (A / name).read_text()
    s = re.sub(r'clip0_[0-9_]+', f'clip_{sid}', s)
    s = re.sub(r' id="Vector[_0-9]*"', '', s)
    s = s.replace('<svg ', f'<svg id="{sid}" aria-hidden="true" ', 1)
    s = s.replace(' style="display: block;"', '')
    return s.strip()


def render(t):
    t = t.replace('%%SHIELD_L%%', inline_shield('shield-left.svg', 'meter-l'))
    t = t.replace('%%SHIELD_R%%', inline_shield('shield-right.svg', 'meter-r'))
    t = re.sub(r'%%([\w@.\-]+)%%', lambda m: m.group(0) if m.group(1) == 'TYPEKIT' else uri(m.group(1)), t)
    assert '%%' not in t.replace('%%TYPEKIT%%', ''), 'unknown placeholder left in template'
    return t


def standalone(body):
    body = body.replace('%%TYPEKIT%%', TYPEKIT)
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            + body.replace('<div id="viewport">', '</head>\n<body>\n<div id="viewport">', 1)
            + '\n</body>\n</html>\n')


def build(src_text, out, artifact_name=None):
    body = render(src_text)
    (ROOT / out).parent.mkdir(parents=True, exist_ok=True)
    (ROOT / out).write_text(standalone(body))
    print(f'{out}: {len((ROOT / out).read_bytes()) // 1024} KB')
    if artifact_name:
        d = ROOT / 'dist'; d.mkdir(exist_ok=True)
        (d / artifact_name).write_text(body.replace('%%TYPEKIT%%\n', ''))


if __name__ == '__main__':
    art = '--artifact' in sys.argv
    v3 = (ROOT / 'src/v3/markup.html').read_text() + (ROOT / 'src/v3/script.js').read_text()
    build(v3, 'index.html', 'asteroid_run_v3.html' if art else None)
    build((ROOT / 'src/v2/template.html').read_text(), 'versions/v2-flythrough.html', 'asteroid_run.html' if art else None)
