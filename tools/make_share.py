#!/usr/bin/env python3
"""새봄묵상 카톡 공유 카드 만들기.
사용: python3 tools/make_share.py <묵상페이지 index.html> <YYYY-MM-DD> [그림 폴더]
- index.html 의 const ENTRIES 에서 그 날짜 항목을 읽어
  <repo>/MMDD/share.jpg (1200x630), <repo>/MMDD/index.html, <repo>/MMDD.html 을 만든다.
- 그림 폴더: 항목 image.src(images/YYYY-MM-DD.svg)를 찾을 기준 폴더. 생략하면 index.html 이 있는 폴더.
- 필요: node, playwright(chromium). og 제목·설명은 고정("새봄 2026" / "교회, 사명의 자리에 서라").
"""
import json, sys, html, os, subprocess, tempfile
page, iso = sys.argv[1], sys.argv[2]
imgroot = sys.argv[3] if len(sys.argv) > 3 else os.path.dirname(os.path.abspath(page))
repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
here = os.path.dirname(os.path.abspath(__file__))
mmdd = iso[5:7] + iso[8:10]
E = html.escape
tmp = tempfile.mkdtemp()
js = os.path.join(tmp, 'dump.js')
open(js, 'w').write("""const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
const a=s.indexOf('const ENTRIES');const st=s.indexOf('[',a);const b=s.indexOf('\\n];',st);
const E=eval(s.slice(st,b+2));fs.writeFileSync(process.argv[3],JSON.stringify(E));""")
ej = os.path.join(tmp, 'entries.json')
subprocess.run(['node', js, os.path.abspath(page), ej], check=True)
e = [x for x in json.load(open(ej)) if x['iso'] == iso][0]
mark = open(os.path.join(here, 'mark.txt')).read()
img = 'file://' + os.path.join(imgroot, e['image']['src']) if e.get('image') else ''
card = f'''<!doctype html><meta charset=utf-8><style>
body{{margin:0;width:1200px;height:630px;background:#F3F5EF;font-family:"Noto Sans CJK KR",sans-serif;color:#1F2A22}}
.c{{position:absolute;inset:22px;background:#fff;border-radius:28px;border:2px solid #D9E0D5;display:flex;align-items:center;gap:34px;padding:30px 36px;box-sizing:border-box}}
.pic{{width:520px;height:520px;object-fit:cover;border-radius:20px;flex:none}}
.r{{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px}}
.b{{display:flex;align-items:center;gap:12px;color:#3F6B4C;font-family:"Noto Serif CJK KR",serif;font-weight:700;font-size:34px}}.b img{{height:58px}}
.d{{color:#5D6B60;font-size:24px}}
h1{{word-break:keep-all;font-family:"Noto Serif CJK KR",serif;font-size:{58 if len(e["title"])<=9 else 46}px;line-height:1.15;margin:0}}
.ref{{color:#3F6B4C;font-size:24px;font-weight:500}}
.key{{word-break:keep-all;font-family:"Noto Serif CJK KR",serif;font-size:23px;line-height:1.5;font-weight:700;margin-top:4px}}
.url{{font-size:19px;color:#5D6B60;margin-top:-2px}}
.go{{margin-top:6px;background:#3F6B4C;color:#fff;border-radius:999px;padding:12px 28px;font-size:24px;font-weight:700}}
</style><div class=c>{f'<img class=pic src="{img}">' if img else ''}<div class=r><div class=b><img src="{mark}">새봄묵상</div>
<div class=d>{E(e['date'])}</div><h1>{E(e['title'])}</h1><div class=ref>{E(e['ref'])} · 신철 목사</div>
<div class=key>{E(e['key'])}</div><div class=go>{'▶ 링크 누르고 목사님 음성으로 듣기' if e.get('audio') else '▶ 링크 눌러 오늘 묵상 읽기'}</div><div class=url>cheol0929-thejoy.github.io/saebom/{mmdd}</div></div></div>'''
ch = os.path.join(tmp, 'card.html'); open(ch, 'w', encoding='utf-8').write(card)
d = os.path.join(repo, mmdd); os.makedirs(d, exist_ok=True)
sj = os.path.join(tmp, 'shot.js')
open(sj, 'w').write(f"const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage({{viewport:{{width:1200,height:630}}}});await p.goto('file://{ch}');await p.waitForTimeout(400);await p.screenshot({{path:'{d}/share.jpg',type:'jpeg',quality:88}});await b.close();}})();")
env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip())
subprocess.run(['node', sj], check=True, env=env)
base = 'https://cheol0929-thejoy.github.io/saebom'
target = f'https://claude.ai/artifact/83acT3uNMUC3NGidY5284F#d{iso.replace("-", "")}'
title, desc = "새봄 2026", "교회, 사명의 자리에 서라"
out = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title>
<meta property="og:type" content="article">
<meta property="og:site_name" content="새봄묵상">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta name="description" content="{E(desc)}">
<meta property="og:image" content="{base}/{mmdd}/share.jpg">
<meta property="og:image:secure_url" content="{base}/{mmdd}/share.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<style>body{{font-family:sans-serif;text-align:center;padding:40px 16px;background:#F3F5EF;color:#1F2A22}}a{{color:#3F6B4C;font-size:20px}}</style>
</head><body><p>새봄묵상으로 이동합니다…</p><p><a href="{target}">바로 가기</a></p>
<script>setTimeout(function(){{location.replace({json.dumps(target)});}},300);</script></body></html>'''
open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(out)
open(os.path.join(repo, mmdd + '.html'), 'w', encoding='utf-8').write(out)
print(d + '/share.jpg')
