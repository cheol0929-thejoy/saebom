#!/usr/bin/env python3
"""새봄묵상 AI 낭독 음성 만들기 (Edge TTS, 여성 선히 · 남성 인준).
사용: python3 tools/make_voice.py <index.html> <YYYY-MM-DD> [f|m|fm]
결과: audio/YYYY-MM-DD-f.mp3, audio/YYYY-MM-DD-m.mp3 (mono 64k) 를 index.html 폴더에 만든다.
필요: edge-tts (pip install edge-tts), ffmpeg. 프록시는 HTTPS_PROXY 를 그대로 쓴다.
"""
import json, os, re, subprocess, sys, tempfile
page, iso = sys.argv[1], sys.argv[2]
which = sys.argv[3] if len(sys.argv) > 3 else "fm"
root = os.path.dirname(os.path.abspath(page))
tmp = tempfile.mkdtemp()
js = os.path.join(tmp, "dump.js")
open(js, "w").write("""const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
const a=s.indexOf('const ENTRIES');const st=s.indexOf('[',a);const b=s.indexOf('\\n];',st);
const E=eval(s.slice(st,b+2));fs.writeFileSync(process.argv[3],JSON.stringify(E));""")
ej = os.path.join(tmp, "entries.json")
subprocess.run(["node", js, os.path.abspath(page), ej], check=True)
e = [x for x in json.load(open(ej)) if x["iso"] == iso][0]

def clean(t):
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", str(t))
    t = t.replace("~", "에서 ").replace("…", ".")
    t = re.sub(r"\(([^)]*)\)", r", \1,", t)      # 괄호는 쉼표로
    return re.sub(r"\s+", " ", t).strip()

def spoken_ref(r):  # "신명기 30장 11~20절" -> "신명기 30장 11절에서 20절"
    return re.sub(r"(\d+)~(\d+)절", r"\1절에서 \2절", r)

P = ".\n\n"   # 단락 쉼
parts = []
parts.append(f"새봄묵상. {clean(e['date'])}. {clean(e['title'])}. {spoken_ref(clean(e['ref']))} 말씀입니다.")
parts.append("오늘의 본문입니다.")
for n, v in e["verses"]:
    parts.append(f"{n}절. {clean(v)}.")
parts.append("관찰입니다.");  parts += [clean(x) for x in e["observe"]]
parts.append("해석입니다.");  parts += [clean(x) for x in e["interpret"]]
parts.append("오늘의 핵심입니다. " + clean(e["key"]))
parts.append("적용입니다.")
if e.get("applies"):
    for a in e["applies"]:
        parts.append(clean(a.get("label", "")) + "."); parts += [clean(x) for x in a["paras"]]
else:
    parts += [clean(x) for x in e["apply"]]
parts.append("함께 기도하겠습니다."); parts += [clean(x) for x in e["prayer"]]
parts.append("오늘의 실천입니다. " + clean(e["practice"]))
parts.append("함께 드리는 기도제목입니다.")
for i, r in enumerate(e["requests"], 1):
    parts.append(f"{i}. {clean(r)}")
parts.append("오늘의 한 구절입니다. " + clean(e["verse"]) + ". " + clean(e["verseRef"]) + " 말씀입니다.")
parts.append("오늘도 말씀 안에서 평안한 하루 되시기를 바랍니다.")
text = P.join(parts)
txt = os.path.join(tmp, "script.txt"); open(txt, "w", encoding="utf-8").write(text)

VOICES = {"f": "ko-KR-SunHiNeural", "m": "ko-KR-InJoonNeural"}
os.makedirs(os.path.join(root, "audio"), exist_ok=True)
for k in which:
    raw = os.path.join(tmp, f"{k}.mp3")
    cmd = ["edge-tts", "--voice", VOICES[k], "--rate=-5%", "--file", txt, "--write-media", raw]
    if os.environ.get("HTTPS_PROXY"):
        cmd[1:1] = ["--proxy", os.environ["HTTPS_PROXY"]]
    for attempt in range(3):
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0 and os.path.getsize(raw) > 10000:
            break
    else:
        sys.exit(f"edge-tts 실패 ({k}): {r.stderr[-300:]}")
    out = os.path.join(root, "audio", f"{iso}-{k}.mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-ac", "1", "-b:a", "64k", out], check=True)
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]))
    print(f"{out}\t{int(d//60)}분 {int(round(d%60))}초")
