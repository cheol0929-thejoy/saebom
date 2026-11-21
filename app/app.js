/* 새봄묵상 앱 — 재작업 2026-11-20 (worker-2). 이 파일의 화면 코드(render·색인·재생기·글자 크기)는 새봄묵상 페이지 index.html(ver 1795058595-16e9)의 스크립트를 그대로 옮기고,
   데이터만 app/data(묶음 B: index.json + 날짜별 json)에서 읽도록 몇 줄 바꿨다. 앱에만 있는 것: 설정 화면(밝게/어둡게·홈 화면에 추가·알림·앱 정보), 인터넷 없음 표시, 아이폰 보조 링크. */
var VERSION="v1-704fd1a068", APP_VER="2.2.1", BUILT="2026-11-21"; /* v2.0.3: VERSION = 빌드 판(해시), APP_VER = 사람이 읽는 판 - 원본은 manifest.webmanifest 의 version, stamp_app.py 가 sw.js 와 여기에 똑같이 넣는다 */
var DATA_IDX=null, DAYS={};
var ARTIFACT="https://claude.ai/artifact/83acT3uNMUC3NGidY5284F";
const IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
var OFFLINE=false;
function offlineFlag(on){OFFLINE=!!on;const o=document.getElementById("offline");if(o)o.hidden=!on;} /* 인터넷 없음이면 음성 미리 받기를 하지 않는다(페이지 자산은 저장하지 않음) */
function getJSON(u){return fetch(u,{cache:"no-cache"}).then(r=>{if(!r.ok)throw new Error(u+" "+r.status);if(/index\.json$/.test(u))offlineFlag(r.headers.get("X-Saebom-Offline")==="1"||!navigator.onLine);return r.json();});} /* 인터넷 없음 표시는 목록(index) 응답으로만 정한다 */
var BOOTED=false;function loadIndex(){return getJSON("data/index.json").then(j=>{DATA_IDX=j;DAYS=(BOOTED||OFFLINE)?{}:Object.assign({},j.full||{});BOOTED=true;delete j.full;computeVisible();return j;});} /* perf A: first open uses the newest 2 day entries embedded in index.json (one request); later re-checks and offline opens (cached index may be older than a cached day file) use the day file so changed data still shows */
/* perf A: per-day Gowun Batang subset (build_fonts.py) - only that day's glyphs, registered under the page's family name; one day's faces active at a time; text waits for it (block: max 3 s, file 20-35 KB, cached offline) so the title/verses do not re-wrap (CLS 0) */
var FONTS={};function dayFont(iso){try{if(!("FontFace" in window)||!document.fonts)return;Object.keys(FONTS).forEach(k=>{if(k!==iso)FONTS[k].forEach(f=>document.fonts.delete(f));});if(!FONTS[iso])FONTS[iso]=["r","b"].map((k,i)=>{const f=new FontFace("Gowun Batang","url(fonts/"+iso+"-"+k+".woff2)",{weight:i?"700":"400",display:"block"});f.load().catch(()=>{});return f;});FONTS[iso].forEach(f=>{if(!document.fonts.has(f))document.fonts.add(f);});}catch(e){}}
function loadDay(iso){if(DAYS[iso])return Promise.resolve(DAYS[iso]);return getJSON("data/"+iso+".json").then(j=>{DAYS[iso]=j;return j;});}

const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=s=>esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
const paras=a=>a.map(t=>`<p>${fmt(t)}</p>`).join("");

/* 한국 시간 기준 오늘 날짜(YYYY-MM-DD). 날짜가 아직 안 된 묵상은 숨김 */
/* 새 묵상은 한국 시간 오전 5시부터 보인다 (자정~오전 5시에는 전날 묵상) */
var VOICE="p";try{const v=localStorage.getItem("voice");if(["p","f","m"].includes(v))VOICE=v;}catch(err){}
var VCLICK=false; /* 오너 규칙 2026-11-19: 목사님 녹음이 있으면 기본 = 목사님 음성(이 화면에서 직접 고르기 전까지) */
const OPEN_HOUR=5;
const LOCAL=/^(127\.0\.0\.1|localhost)$/.test(location.hostname);
function nowMs(){const q=LOCAL?new URLSearchParams(location.search).get("now"):null;const t=q?Date.parse(q):NaN;return isNaN(t)?Date.now():t;} /* 앱: ?now= 는 이 PC 시험에서만 */
function todayKST(){
  const t=new Date(nowMs()-OPEN_HOUR*3600e3);
  try{return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(t);}
  catch(e){const d=new Date(t.getTime()+9*3600e3);return d.toISOString().slice(0,10);}
}
/* 앱: ENTRIES 대신 data/index.json (같은 05:00 규칙) */
let VISIBLE=[];
function computeVisible(){const t=todayKST();VISIBLE=(DATA_IDX?DATA_IDX.days:[]).filter(x=>!x.iso||x.iso<=t).sort((a,b)=>(b.iso||"").localeCompare(a.iso||"")).map(x=>Object.assign({},x,{audio:x.hasPastorAudio?1:"",audio_f:x.hasAiAudio?1:""}));}
let RTOK=0;
var PENDING=null,RGEN=0;
function render(id){const tok=++RTOK,dir=NAVDIR;NAVDIR="";PENDING=id; /* r2 (Codex M1): 불러오는 중인 날짜 */ /* B r2 (Gemini M3): 늦게 온 이전 요청은 버린다 */
  const meta=VISIBLE.find(x=>x.id===id)||VISIBLE[0];
  if(!meta){document.getElementById("today").innerHTML='<p class="loadmsg">아직 열린 묵상이 없습니다.</p>';return Promise.resolve();}
  if(meta.font)dayFont(meta.iso);
  return loadDay(meta.iso).then(e=>{
  if(tok!==RTOK)return;PENDING=null;if(SAVEPOS)SAVEPOS(); /* B r2: 다른 날로 가기 전에 들은 위치 저장 */
  const ab=e.audio_base||"";
  /* B: 자료 v2 voices[].src = 구간 요청(Range) 되는 음성 주소 우선, 실패하면 data-fb(voices[].fallback 또는 v1 주소) */
  const one=(k,a,du,l,s)=>{const v=(e.voices||[]).find(x=>x.key===k)||null,v1=e[a]?ab+e[a]:"";return [k,(v&&v.src)||v1,e[du]||(v&&v.dur)||"",l,s,(v&&v.fallback)||v1];};
  const ALL=[one("p","audio","dur","신철 목사 음성","담임목사"),one("m","audio_m","dur_m","남성 낭독","남성"),one("f","audio_f","dur_f","여성 낭독","여성")]; /* 오너 지시 21:10 (v2.0.1): 순서·이름 담임목사·남성·여성 */
  const SRC=["p","f","m"].map(k=>ALL.find(x=>x[0]===k)).filter(x=>x[1]); /* v2.0.1: 단추 순서만 바꿈 — 고른 목소리가 없는 날 기본 순서는 예전 그대로(목사→여성→남성) */
  const pick=(ALL[0][1]&&!VCLICK)?ALL[0]:(SRC.find(x=>x[0]===VOICE)||SRC[0]);
  const cur=pick?{src:pick[1],dur:pick[2]||"",kind:pick[0],fb:pick[5]||""}:null;
  const RL=[[0.8,"천천히"],[1,"보통"],[1.2,"조금 빠르게"],[1.5,"빠르게"]]; /* v2.0.1 오너 지시(CEO 23:19): 예전 선택 상자, 처음 = 보통, 모든 목소리 같은 기준(BASE=1) */
  const audio=cur
    ? `<div class="tts"><span class="lab">듣기</span><button type="button" class="sk" id="sk-b" data-skip="-15" aria-label="15초 뒤로"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 4V1L7 5l5 4V6a7 7 0 1 1-7 7H3a9 9 0 1 0 9-9z"/></svg><span aria-hidden="true">15</span></button><button type="button" class="pp" id="pp" aria-label="재생">▶</button><button type="button" class="sk fw" id="sk-f" data-skip="15" aria-label="15초 앞으로"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 4V1l5 4-5 4V6a7 7 0 1 0 7 7h2a9 9 0 1 1-9-9z"/></svg><span aria-hidden="true">15</span></button><span class="brk" aria-hidden="true"></span><button type="button" class="st" id="st" aria-label="처음으로" disabled>■</button><select class="rate" id="rate" aria-label="읽는 속도">${RL.map(([r,l])=>`<option value="${r}"${r===RATE?" selected":""}>${l}</option>`).join("")}</select><span class="vsel" role="group" aria-label="목소리">${ALL.map(x=>`<button type="button" data-voice="${x[0]}" class="${pick&&x[0]===pick[0]?"on":""}" aria-pressed="${pick&&x[0]===pick[0]}"${x[1]?"":" disabled"} title="${x[3]}${x[1]?"":" · 아직 없습니다"}">${x[4]}</button>`).join("")}</span></div>
       <div class="bar"><span class="tm"><span id="cur">0:00</span> / <span id="tot">${esc(cur.dur?cur.dur.replace(/(\d+)분 (\d+)초/,(m,a,b)=>a+":"+b.padStart(2,"0")):"--:--")}</span></span><input type="range" id="seek" min="0" max="1000" value="0" aria-label="재생 위치"></div>
       <audio id="player" preload="${OFFLINE?"none":"metadata"}" src="${esc(cur.src)}" data-kind="${cur.kind}"${cur.fb&&cur.fb!==cur.src?` data-fb="${esc(cur.fb)}"`:""}></audio>
       ${cur.kind!=="p"?`<p class="aiNote">${cur.kind==="f"?"여성":"남성"} AI 음성으로 읽어 드립니다</p>`:""}
       ${IOS?'<p class="iosNote"><a href="'+esc(ARTIFACT+"#"+e.id)+'" target="_blank" rel="noopener">재생이 안 되면 묵상 페이지에서 듣기</a></p>':""}`
    : `<p class="aiNote">오늘 묵상 음성은 준비 중입니다.</p>`;
  document.getElementById("today").innerHTML=`
  <div class="wrap" style="padding:0" id="day" data-iso="${esc(e.iso)}">
    <div class="hero">
      <span class="date">${esc(e.date)}</span>${e.special?'<span class="special">✝ 주일 특별묵상</span>':""}
      <h1>${esc(e.title)}</h1>
      <span class="ref">${esc(e.ref)} · 신철 목사</span>
    </div>
    ${audio}
    <article>
      <section><h2>오늘의 본문</h2>
        <div class="scripture">${e.verses.map(([n,t])=>`<span class="v"><sup>${n}</sup>${esc(t)}</span>`).join("")}</div>
      </section>
      <section><h2>관찰</h2>${paras(e.observe)}</section>
      <section><h2>해석</h2>${paras(e.interpret)}
        <p class="key">${esc(e.key)}</p></section>
      ${e.image?`<figure class="pic"><img src="${esc(e.image.src)}" alt="${esc(e.image.alt||"")}" loading="lazy" width="1200" height="675">${e.image.caption?`<figcaption>${esc(e.image.caption)}</figcaption>`:""}</figure>`:""}
      <section><h2>적용</h2>${e.applies&&e.applies.length?e.applies.map((a,i)=>`<h3 class="sub"><i>적용 ${i+1}</i>${esc(a.label||"")}</h3>${paras(a.paras)}`).join(""):paras(e.apply)}</section>
      <section class="prayer"><h2>기도</h2>${paras(e.prayer)}</section>
      <section><div class="practice"><b>오늘의 실천</b>${fmt(e.practice)}</div></section>
      <section><h2>함께 드리는 기도제목</h2>
        <ol class="req">${e.requests.map(r=>`<li>${esc(r)}</li>`).join("")}</ol></section>
      <section><h2>오늘의 한 구절</h2>
        <p class="verse">“${esc(e.verse)}”<cite>${esc(e.verseRef)}</cite></p></section>
      <section class="share"><h2>오늘 묵상 나눠요</h2>
        <p>오늘 묵상을 가족과 이웃에게 보내 주세요.</p>
        ${e.share===null?'<p class="small">이 날은 카카오톡 공유 카드가 없습니다.</p>':`<a class="kakao-btn" href="${esc((typeof e.share==="string"&&e.share)||(e.share&&e.share.url)||("https://cheol0929-thejoy.github.io/saebom/kakao.html?d="+(e.iso||"").slice(5).replace("-","")))}" target="_blank" rel="noopener">💬 카카오톡으로 보내기</a>
        <button type="button" class="share-btn" data-title="${esc(e.title)}" data-url="${esc((e.share&&typeof e.share==="object"&&e.share.page)||e.card_page||("https://cheol0929-thejoy.github.io/saebom/"+(e.iso||"").slice(5).replace("-","")+".html"))}">🔗 링크 복사하기</button>`}
        <p class="share-msg" role="status"></p></section>
    </article>
  </div>`; /* v2.0.2 owner 05:28 (via CEO): 이전/다음 묵상 카드 없앰 - 옆으로 밀기·화살표 키·지난 묵상 찾기로 넘긴다 */
  CURRENT=e.id;dayIn(dir);unreadSync(e.iso); /* v2.1: 이 날을 열었다 */
  renderArchive();
  }).catch(()=>{if(tok!==RTOK)return;PENDING=null;document.getElementById("today").innerHTML='<p class="loadmsg">인터넷이 없어 이 날 묵상을 불러오지 못했습니다. 최근 14일은 인터넷 없이도 볼 수 있습니다.</p>';});
}

/* ── 색인: 성경 권별 · 주제별 ── */
const OT=["창세기","출애굽기","레위기","민수기","신명기","여호수아","사사기","룻기","사무엘상","사무엘하","열왕기상","열왕기하","역대상","역대하","에스라","느헤미야","에스더","욥기","시편","잠언","전도서","아가","이사야","예레미야","예레미야애가","에스겔","다니엘","호세아","요엘","아모스","오바댜","요나","미가","나훔","하박국","스바냐","학개","스가랴","말라기"];
const NT=["마태복음","마가복음","누가복음","요한복음","사도행전","로마서","고린도전서","고린도후서","갈라디아서","에베소서","빌립보서","골로새서","데살로니가전서","데살로니가후서","디모데전서","디모데후서","디도서","빌레몬서","히브리서","야고보서","베드로전서","베드로후서","요한일서","요한이서","요한삼서","유다서","요한계시록"];
const TOPICS=["하나님","예수 그리스도와 십자가","성령","말씀","기도","예배","은혜와 용서","믿음과 순종","고난과 소망","감사와 기쁨","가정","이웃 사랑과 섬김","교회 공동체","일상과 일터","죽음과 영생"];
const BYLEN=[...OT,...NT].sort((a,b)=>b.length-a.length);
const bookOf=x=>x.book||BYLEN.find(b=>(x.ref||"").startsWith(b))||"";
const chap=x=>{const m=(x.ref||"").match(/(\d+)장\s*(\d+)?/);return m?(+m[1])*1000+(+(m[2]||0)):0;};
let CURRENT="", TAB="date";
try{const t=localStorage.getItem("tab");if(["date","book","topic"].includes(t))TAB=t;}catch(err){}
const item=x=>`<li><a href="#${x.id}" aria-current="${x.id===CURRENT}"><span class="d">${esc(x.short)}</span><span class="t">${esc(x.title)}${x.ref?`<span class="r">${esc(x.ref)}</span>`:""}</span>${x.audio?'<span class="ear">🎧 음성</span>':(x.audio_f||x.audio_m)?'<span class="ear">🎧 AI</span>':""}</a></li>`;
const fold=(label,list,open)=>`<details${open?" open":""}><summary><span>${esc(label)} <span class="n">(${list.length})</span></span></summary><ul>${list.map(item).join("")}</ul></details>`;
function renderArchive(){
  document.querySelectorAll(".tabs button").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===TAB)));
  let h="";
  if(TAB==="date"){
    const months={};VISIBLE.forEach(x=>{const k=(x.iso||"").slice(0,7);(months[k]=months[k]||[]).push(x);});
    h=Object.keys(months).sort().reverse().map((k,i)=>{const [y,m]=k.split("-");return fold(`${y}년 ${+m}월`,months[k],i===0);}).join("");
  }else if(TAB==="book"){
    const by={};VISIBLE.forEach(x=>{const b=bookOf(x);if(b)(by[b]=by[b]||[]).push(x);});
    const part=(name,books)=>{const hit=books.filter(b=>by[b]);return `<div class="grp"><h4>${name}</h4>${hit.length?hit.map(b=>fold(b,by[b].slice().sort((p,q)=>chap(p)-chap(q)),false)).join(""):'<p class="empty">아직 묵상이 없습니다.</p>'}</div>`;};
    h=part("구약",OT)+part("신약",NT);
  }else{
    const by={};VISIBLE.forEach(x=>(x.topics||[]).forEach(t=>{(by[t]=by[t]||[]).push(x);}));
    const hit=TOPICS.filter(t=>by[t]);
    h=hit.length?hit.map(t=>fold(t,by[t],false)).join(""):'<p class="empty">아직 묵상이 없습니다.</p>';
  }
  document.getElementById("archive").innerHTML=h;
}
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>{TAB=b.dataset.tab;try{localStorage.setItem("tab",TAB)}catch(err){}renderArchive();}));
function route(){const h=location.hash.slice(1);const set=h==="settings"||h.indexOf("set-")===0;
  document.getElementById("settings").hidden=!set;document.getElementById("today").hidden=set;document.querySelector("nav.arch").hidden=set;
  if(set){showSettings(h==="settings");if(h!=="settings"){const t=document.getElementById(h);if(t)setTimeout(()=>t.scrollIntoView(),60);}return Promise.resolve();}
  return render(/^\d{4}-\d{2}-\d{2}$/.test(h)?"d"+h.replace(/-/g,""):h).then(()=>{if(typeof applyRate==="function")applyRate();});} /* B: 딥링크 #YYYY-MM-DD */
window.addEventListener("hashchange",()=>{route();window.scrollTo(0,0);});
/* 재생 속도·목소리: 이 기기에서만 기억 */
var RATES=[0.8,1,1.2,1.5]; /* v2.0.1 오너 지시(CEO 23:19): 예전 선택 상자로 — 천천히 0.8·보통 1.0·조금 빠르게 1.2·빠르게 1.5, 처음 = 보통 */
var RATE=1;
var BASE=1; /* 오너 지시 21:11: 고른 배속을 모든 목소리(목사님·AI)에 그대로 (페이지의 목사님 1.2배 기준은 쓰지 않음) */
try{let r=parseFloat(localStorage.getItem("rate2"));const MIG={"0.9":0.8,"1.25":1.2,"1.75":1.5};if(MIG[r])r=MIG[r];else if(!isNaN(r)&&!RATES.includes(r))r=RATES.reduce((a,b)=>Math.abs(b-r)<Math.abs(a-r)?b:a);if(!isNaN(r)&&String(r)!==localStorage.getItem("rate2"))localStorage.setItem("rate2",r); /* v2.0 배속 0.9→0.8, 1.25→1.2, 1.75→1.5 */if(RATES.includes(r))RATE=r;}catch(err){}
const fmtT=t=>{t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+":"+String(t%60).padStart(2,"0");};
const baseOf=a=>a&&a.dataset.kind&&a.dataset.kind!=="p"?1:BASE;
function applyRate(){const a=document.getElementById("player");if(a){a.preservesPitch=true;a.webkitPreservesPitch=true;a.mozPreservesPitch=true; /* 오너 21:20: 빠르게 들어도 목소리 높이 그대로 (mp3 는 손대지 않음) */a.playbackRate=RATE*baseOf(a);a.defaultPlaybackRate=RATE*baseOf(a);}
  const sel=document.getElementById("rate");if(sel)sel.value=String(RATE);
  wirePlayer();}
function wirePlayer(){
  const a=document.getElementById("player");if(!a||a.dataset.wired)return;a.dataset.wired="1";
  const pp=document.getElementById("pp"),st=document.getElementById("st"),seek=document.getElementById("seek"),cur=document.getElementById("cur"),tot=document.getElementById("tot");
  const upd=()=>{if(a.duration){tot.textContent=fmtT(a.duration);if(!seek.matches(":active"))seek.value=Math.round(a.currentTime/a.duration*1000);}cur.textContent=fmtT(a.currentTime);st.disabled=a.paused&&a.currentTime===0;};
  a.addEventListener("loadedmetadata",upd);a.addEventListener("timeupdate",upd);
  a.addEventListener("play",()=>{a.playbackRate=RATE*baseOf(a);pp.textContent="❚❚";pp.setAttribute("aria-label","일시정지");st.disabled=false;});
  a.addEventListener("pause",()=>{pp.textContent="▶";pp.setAttribute("aria-label","재생");upd();});
  a.addEventListener("ended",()=>{pp.textContent="▶";pp.setAttribute("aria-label","재생");});
  pp.addEventListener("click",()=>{if(a.paused)a.play().catch(()=>{});else a.pause();}); /* 앱: 재생 시작 중 목소리를 바꾸면 이전 재생 요청이 취소된다 - 오류로 남기지 않음 */
  st.addEventListener("click",()=>{a.pause();a.currentTime=0;upd();posClear(a);});
  seek.addEventListener("input",()=>{if(typeof UPD==="object")UPD.input=Date.now();noRestore(a);if(a.duration)a.currentTime=seek.value/1000*a.duration;}); /* r2 (Gemini m1): 끄는 동안은 손댄 것으로 */
  const dg=on=>()=>{if(typeof UPD==="object"){UPD.drag=on;UPD.input=Date.now();}};["pointerdown","touchstart"].forEach(n=>seek.addEventListener(n,dg(true),{passive:true}));["pointerup","pointercancel","touchend","touchcancel","change"].forEach(n=>seek.addEventListener(n,dg(false),{passive:true}));
  wireExtras(a,upd);
}
document.addEventListener("change",ev=>{
  if(ev.target.id==="rate"){RATE=parseFloat(ev.target.value)||1;if(!RATES.includes(RATE))RATE=1;try{localStorage.setItem("rate2",RATE)}catch(err){}applyRate();}
});
document.addEventListener("click",ev=>{
  const vb=ev.target.closest(".vsel button[data-voice]");
  if(vb){if(vb.disabled)return;VOICE=vb.dataset.voice;VCLICK=true;try{localStorage.setItem("voice",VOICE)}catch(err){}
    if(PENDING!==null)return; /* r2 (Codex M1): 다른 날을 불러오는 중이면 목소리 뜻만 바꾸고, 그 날이 그려질 때 이 목소리로 */
    const a=document.getElementById("player");const t=a?a.currentTime:0;const was=a&&!a.paused;
    /* 앱: render 가 비동기(그날 파일을 읽음)이므로 새 재생기가 그려진 뒤에 연결한다 (Gemini r1 BLOCK 1) */
    render(CURRENT).then(()=>{applyRate();
      const n=document.getElementById("player");if(n&&(t>0||was)){n.addEventListener("loadedmetadata",()=>{try{if(t>0)n.currentTime=Math.min(t,n.duration||t);}catch(err){}if(was)n.play().catch(()=>{});},{once:true});}});
    return;}
  const sb=ev.target.closest(".share-btn");
  if(sb){const t=sb.dataset.url,msg=sb.parentNode.querySelector(".share-msg");
    const ok=()=>{msg.textContent="링크가 복사됐습니다. 카톡 대화창을 길게 눌러 ‘붙여넣기’ 하시면 됩니다.";};
    const fb=()=>{const ta=document.createElement("textarea");ta.value=t;ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();let done=false;try{done=document.execCommand("copy");}catch(err){}ta.remove();if(done)ok();else msg.textContent="아래 글을 길게 눌러 복사해 주세요: "+t;};
    try{navigator.clipboard.writeText(t).then(ok,fb);}catch(err){fb();}
    return;}
});
boot();

/* 글자 크기: 이 기기에서만 기억 */
let fs=19;
try{const s=parseInt(localStorage.getItem("fs"),10);if(s>=15&&s<=27)fs=s;}catch(e){}
const applyFs=()=>{document.documentElement.style.setProperty("--fs",fs+"px");try{localStorage.setItem("fs",fs)}catch(e){}};
applyFs();
document.getElementById("fs-up").onclick=()=>{fs=Math.min(27,fs+2);applyFs();};
document.getElementById("fs-down").onclick=()=>{fs=Math.max(15,fs-2);applyFs();};
/* ===== 앱 추가분 ===== */
function boot(){loadIndex().then(route).then(()=>{if(typeof updAfterBoot==="function")updAfterBoot();}).catch(()=>{document.getElementById("today").innerHTML='<p class="loadmsg">인터넷이 없고 저장된 묵상도 없습니다. 인터넷에 연결한 뒤 다시 열어 주세요.</p>';});}
/* 앱으로 돌아올 때마다 목록을 다시 받는다 — 05:00 넘어 새 묵상, 나중에 붙은 녹음·그림 반영 */
var REG=null;if("serviceWorker" in navigator)navigator.serviceWorker.getRegistration().then(r=>{REG=r||null;}).catch(()=>{});
function checkNew(){if(document.visibilityState!=="visible")return;if(typeof updCheck==="function")updCheck(); /* v2.0.3: 새 판 확인 + 마지막 확인 시각 기록 */const a=document.getElementById("player");if(a&&!a.paused)return;
  /* F36 (Gemini quick r1): 같은 날이고 그날 자료가 그대로면 다시 그리지 않는다 — 같은 <audio> 가 남아 멈춘 위치·상태가 그대로(음원 서버가 Range 를 안 받아 새 재생기에서는 위치를 되돌릴 수 없음). 날이 바뀌었거나 자료가 바뀌었을 때만 다시 그린다. */
  const was=CURRENT,top=VISIBLE[0]&&VISIBLE[0].id,old=VISIBLE.find(x=>x.id===was),oldTxt=old&&DAYS[old.iso]?JSON.stringify(DAYS[old.iso]):null;
  loadIndex().then(()=>{newDayNote(top);unreadSync();if(!document.getElementById("settings").hidden)return;const h=normId(location.hash.slice(1)),want=h&&h!==top?h:"",meta=VISIBLE.find(x=>x.id===want||x.iso===want)||VISIBLE[0];
    const same=!!(meta&&meta.id===was&&oldTxt!==null&&document.getElementById("day"));
    return (same?loadDay(meta.iso).then(e=>JSON.stringify(e)===oldTxt):Promise.resolve(false)).then(keep=>{if(keep){if(VISIBLE[0]&&VISIBLE[0].id!==top)refreshNav(meta.iso);return;} /* B r2 (Gemini M2): 같은 날이면 #day(재생기)는 그대로, 날짜 띠·앞뒤·목록만 새로 */return render(/^\d{4}-\d{2}-\d{2}$/.test(want)?"d"+want.replace(/-/g,""):want).then(()=>{if(typeof applyRate==="function")applyRate();});});}).catch(()=>offlineFlag(true));}
document.addEventListener("visibilitychange",checkNew);
window.addEventListener("online",()=>offlineFlag(false));window.addEventListener("offline",()=>offlineFlag(true));
/* 밝게/어둡게 (이 기기에서만 기억, 기본 = 어둡게 = 페이지와 같음) */
function applyTheme(t){document.documentElement.setAttribute("data-theme",t);const m=document.getElementById("tc");if(m)m.content=t==="light"?"#F6F4EE":"#000000";
  document.querySelectorAll("[data-theme-set]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.themeSet===t)));}
let THEME="dark";try{const t=localStorage.getItem("theme");if(t==="light"||t==="dark")THEME=t;}catch(err){}
applyTheme(THEME);
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-theme-set]");if(!b)return;THEME=b.dataset.themeSet;try{localStorage.setItem("theme",THEME)}catch(err){}applyTheme(THEME);});
/* 홈 화면에 추가 */
/* v2.0.3 (오너 「설정에서 앱 다운로드 및 설치 하게 하라」, CEO 05:29): 「앱 설치」 단추는 늘 보인다(이미 설치됐으면 숨김).
   안드로이드 크롬·엣지·삼성 인터넷 = 브라우저 설치 창(beforeinstallprompt) / 그 창이 없으면(아이폰·사파리 등) = 2단계 그림 안내를 펼친다 */
let DEFER=null,INSTALLED=false,GUIDE=false;
const KAKAO=/KAKAOTALK/i.test(navigator.userAgent); /* v2.1.1: 카카오톡 안 브라우저 = 설치 불가 → 「다른 브라우저로 열기」 */
const openExternal=()=>{location.href="kakaotalk://web/openExternal?url="+encodeURIComponent(location.href);};
{const kb=document.getElementById("inst-kakao-btn");if(kb)kb.addEventListener("click",openExternal);}
/* v2.2.0 (오너 쉬운 설치 묶음, CEO 11-21): 맨 위 큰 「홈 화면에 새봄묵상 설치」 배너 - 안드로이드 크롬·삼성 인터넷 = 한 번 눌러 설치 창(beforeinstallprompt), 아이폰 = 그림 3장 안내.
   설치됐거나(홈 화면 앱으로 열림 포함) 닫으면(또는 설치 창에서 취소) 7일 동안 숨김. 카카오톡 안에서는 안 보임(바깥 브라우저로 넘김). 설정 「앱 설치」는 그대로 */
const IB_KEY="ibDismissed",IB_DAYS=7;
const ibDismissed=()=>{try{const t=+localStorage.getItem(IB_KEY);return t>0&&Date.now()-t<IB_DAYS*864e5;}catch(e){return false;}};
const ibDismiss=()=>{try{localStorage.setItem(IB_KEY,String(Date.now()));}catch(e){}instUI();};
{const x=document.getElementById("ib-x");if(x)x.addEventListener("click",ibDismiss);
 const g=document.getElementById("ib-go");if(g)g.addEventListener("click",()=>{if(!DEFER)return;const e=DEFER;DEFER=null;try{e.prompt();}catch(err){}
  Promise.resolve(e.userChoice).then(c=>{if(c&&c.outcome==="accepted")INSTALLED=true;else ibDismiss();},()=>{}).then(instUI);});}
function bannerUI(){const bn=document.getElementById("ibanner");if(!bn)return;const done=isStandalone()||INSTALLED;
  const ios=IOS&&!done,and=!IOS&&!!DEFER&&!done;const show=!KAKAO&&!ibDismissed()&&(ios||and);
  bn.hidden=!show;document.getElementById("ib-go").hidden=!and;document.getElementById("ib-ios").hidden=!ios;}
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
window.addEventListener("beforeinstallprompt",ev=>{ev.preventDefault();DEFER=ev;instUI();});
window.addEventListener("appinstalled",()=>{DEFER=null;INSTALLED=true;GUIDE=false;instUI();});
document.getElementById("inst-btn").addEventListener("click",()=>{
  if(DEFER){const e=DEFER;DEFER=null;try{e.prompt();}catch(err){}Promise.resolve(e.userChoice).then(c=>{if(c&&c.outcome==="accepted")INSTALLED=true;},()=>{}).then(instUI);return;}
  GUIDE=!GUIDE;instUI();if(GUIDE){const g=document.getElementById(IOS?"g-ios":"g-android");if(g)setTimeout(()=>g.scrollIntoView({block:"nearest"}),30);}});
function instUI(){const $=id=>document.getElementById(id),sa=isStandalone(),done=sa||INSTALLED,b=$("inst-btn"),d=$("inst-done");if(!b)return;
  d.hidden=!done;d.textContent=sa?"이미 설치되어 있습니다. 홈 화면 아이콘으로 열려 있습니다.":INSTALLED?"설치되었습니다. 홈 화면의 새봄묵상 아이콘으로 여시면 됩니다.":"";
  b.hidden=done;$("inst-note").hidden=done;b.setAttribute("aria-expanded",String(!DEFER&&GUIDE));
  const show=!done&&!DEFER&&GUIDE;$("g-ios").hidden=!(show&&IOS);$("g-android").hidden=!(show&&!IOS);
  bannerUI();const k=$("inst-kakao");if(k){k.hidden=!(KAKAO&&!done);if(KAKAO&&!done){b.hidden=true;$("inst-note").hidden=true;$("g-ios").hidden=true;$("g-android").hidden=true;}}}
bannerUI(); /* v2.2.0: 처음 열 때 (아이폰은 바로, 안드로이드는 설치 창 준비되면 beforeinstallprompt 에서 다시) */
function showSettings(top){applyTheme(THEME);
  instUI();
  updUI();
  const bs=document.getElementById("badge-sup");if(bs){const m=badgeMode();bs.textContent=m==="icon"?"홈 화면 앱 아이콘에도 숫자가 보입니다":"이 폰은 앱 안에서만 숫자가 보입니다";bs.dataset.mode=m;}unreadSync(); /* v2.1 */
  const n=DATA_IDX&&DATA_IDX.days.length?DATA_IDX.days.length:0;document.getElementById("datainfo").textContent=VISIBLE[0]?(VISIBLE[0].short+" 묵상까지 · "+VISIBLE.length+"일"):"-";
  if(top!==false)window.scrollTo(0,0);}

/* ===== B: 재생기·탐색 (worker-5, 2026-11-20) — ±15초·날짜별 위치 기억·잠금화면(Media Session)·좌우 넘기기 (v2.0.1: 월~토 날짜 띠는 오너 지시로 뺐다)·딥링크·새 묵상 알림 ===== */
function nbr(iso){const i=VISIBLE.findIndex(x=>x.iso===iso);return {older:i>=0?VISIBLE[i+1]||null:null,newer:i>0?VISIBLE[i-1]:null};}
let NAVDIR="";
function go(dir){if(!document.getElementById("settings").hidden)return false;const iso=(document.getElementById("day")||{dataset:{}}).dataset.iso;const n=nbr(iso),x=dir==="next"?n.newer:n.older;
  if(!x){toast(dir==="next"?"가장 최근 묵상입니다":"더 이전 묵상이 없습니다");return false;}NAVDIR=dir;location.hash=x.id;return true;}
function dayIn(dir){const d=document.getElementById("day");if(d&&dir)d.classList.add(dir==="next"?"in-next":"in-prev");}
function normId(h){return /^\d{4}-\d{2}-\d{2}$/.test(h)?"d"+h.replace(/-/g,""):h;}
function refreshNav(iso){renderArchive();}
/* 좌우로 넘기기: 왼쪽으로 밀면 다음(새) 묵상, 오른쪽으로 밀면 이전 묵상 — 재생 막대·선택 상자 위에서는 넘기지 않는다 */
(function(){const m=document.getElementById("today");if(!m)return;let sx=0,sy=0,st=0,ok=false;
  m.addEventListener("touchstart",ev=>{ok=ev.touches.length===1&&!ev.target.closest("input,select,textarea,.bar");if(!ok)return;sx=ev.touches[0].clientX;sy=ev.touches[0].clientY;st=Date.now();},{passive:true});
  m.addEventListener("touchend",ev=>{if(!ok)return;ok=false;const t=ev.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    if(Date.now()-st<800&&Math.abs(dx)>=60&&Math.abs(dx)>Math.abs(dy)*1.6&&!(window.getSelection&&String(window.getSelection()).length))go(dx<0?"next":"prev");},{passive:true});})();
document.addEventListener("keydown",ev=>{if(ev.altKey||ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.target.closest("input,select,textarea,[contenteditable]"))return;if(ev.key==="ArrowLeft")go("prev");else if(ev.key==="ArrowRight")go("next");});
/* 알림 띠(토스트): 화면 아래에 떠서 글 배치를 밀지 않는다 */
let TT=0;const TOAST=document.createElement("div");TOAST.id="toast";TOAST.className="toast";TOAST.setAttribute("role","status");TOAST.setAttribute("aria-live","polite");TOAST.hidden=true;document.body.appendChild(TOAST);
function toast(msg,act,fn){clearTimeout(TT);TOAST.innerHTML='<span class="tm">'+esc(msg)+'</span>'+(act?'<button type="button" class="tact">'+esc(act)+'</button>':'')+'<button type="button" class="tx" aria-label="알림 닫기">✕</button>';
  TOAST.hidden=false;TOAST.classList.remove("show");void TOAST.offsetWidth;TOAST.classList.add("show");
  const b=TOAST.querySelector(".tact");if(b)b.onclick=()=>{TOAST.hidden=true;fn&&fn();};TOAST.querySelector(".tx").onclick=()=>{TOAST.hidden=true;};
  TT=setTimeout(()=>{TOAST.hidden=true;},act?12000:5000);}
function newDayNote(oldTop){const n=VISIBLE[0];if(!oldTop||!n||n.id===oldTop)return;const h=normId(location.hash.slice(1)),pinned=h&&h!==oldTop&&h!==n.id&&h!==n.iso&&h!=="settings"&&h.indexOf("set-")!==0;
  if(pinned)toast(n.short+" 새 묵상이 열렸습니다","보기",()=>{NAVDIR="next";location.hash=n.id;});else toast(n.short+" 새 묵상이 열렸습니다");}
/* 05:00(한국 시간)에 앱이 열려 있으면 새 묵상을 확인한다. 재생 중이면 1분 뒤 다시 */
function at0500(){const t=nowMs(),D=864e5,off=((t-20*3600e3)%D+D)%D;setTimeout(function tick(){const a=document.getElementById("player");if(a&&!a.paused){setTimeout(tick,60000);return;}checkNew();at0500();},D-off+3000);}
at0500();
if("serviceWorker" in navigator){const had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("message",ev=>{if(ev.data&&ev.data.type==="saebom:new-day")checkNew();});
  let CTL=navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener("controllerchange",()=>{const prev=CTL;CTL=navigator.serviceWorker.controller;if(had||prev)updFound();});} /* v2.0.3: 「다시 열기」 대신 안전한 때 자동 적용. 처음 연 화면(아직 SW 없음)이 첫 설치 뒤 열린 채 다음 판을 받아도 적용 */
var HAD_CTL=!!("serviceWorker" in navigator&&navigator.serviceWorker.controller);
/* 재생기 추가분: ±15초 · 날짜별 위치 기억 · 잠금화면 */
function skipBy(s){const a=document.getElementById("player");if(!a)return;noRestore(a);let t=(a.currentTime||0)+s;if(isFinite(a.duration))t=Math.min(t,Math.max(0,a.duration-0.25));a.currentTime=Math.max(0,t);}
const posKey=a=>"pos:"+((document.getElementById("day")||{dataset:{}}).dataset.iso||"")+":"+(a.dataset.kind||"");
function noRestore(a){if(!a)return;a.__rgen=(a.__rgen||0)+1;if(a.__again){["loadeddata","canplay","play"].forEach(n=>a.removeEventListener(n,a.__again));a.__again=null;}} /* r2 (Codex M2): 정지·직접 이동 뒤에는 저장 위치를 다시 넣지 않는다 */
function posClear(a){noRestore(a);try{localStorage.removeItem(posKey(a));}catch(err){}}
let SAVEPOS=null,PRUNED=false;
function prunePos(){if(PRUNED||!VISIBLE.length)return;PRUNED=true;try{const keep={};VISIBLE.forEach(x=>{keep[x.iso]=1;});for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.indexOf("pos:")===0&&!keep[k.split(":")[1]])localStorage.removeItem(k);}}catch(err){}}
function msMeta(a){if(!("mediaSession" in navigator))return;const iso=(document.getElementById("day")||{dataset:{}}).dataset.iso,e=DAYS[iso];if(!e)return;
  const art=[];if(e.image&&e.image.src){const u=new URL(e.image.src,location.href).href,x=(u.split("?")[0].split(".").pop()||"").toLowerCase();art.push({src:u,sizes:"1200x675",type:x==="svg"?"image/svg+xml":x==="png"?"image/png":x==="webp"?"image/webp":"image/jpeg"});}
  art.push({src:new URL("icons/icon-512.png",location.href).href,sizes:"512x512",type:"image/png"});
  try{navigator.mediaSession.metadata=new MediaMetadata({title:e.title,artist:"신철 목사",album:"새봄묵상 · "+e.date,artwork:art});}catch(err){}}
function msPos(a){if(!("mediaSession" in navigator)||!navigator.mediaSession.setPositionState)return;try{if(isFinite(a.duration)&&a.duration>0)navigator.mediaSession.setPositionState({duration:a.duration,playbackRate:a.playbackRate||1,position:Math.min(a.currentTime,a.duration)});}catch(err){}}
if("mediaSession" in navigator){const P=()=>document.getElementById("player");const H={play:()=>{const a=P();if(a)a.play().catch(()=>{});},pause:()=>{const a=P();if(a)a.pause();},
  seekbackward:d=>skipBy(-((d&&d.seekOffset)||15)),seekforward:d=>skipBy((d&&d.seekOffset)||15),seekto:d=>{const a=P();if(a&&d&&isFinite(d.seekTime)){noRestore(a);a.currentTime=d.seekTime;}},stop:()=>{const a=P();if(a){a.pause();a.currentTime=0;posClear(a);}}};
  for(const k in H){try{navigator.mediaSession.setActionHandler(k,H[k]);}catch(err){}}}
function wireExtras(a,upd){prunePos();
  a.addEventListener("error",()=>{const fb=a.dataset.fb;if(fb&&a.getAttribute("src")!==fb){const was=!a.paused;delete a.dataset.fb;a.src=fb;a.load();if(was)a.play().catch(()=>{});}});
  document.querySelectorAll(".tts [data-skip]").forEach(b=>b.addEventListener("click",()=>{skipBy(parseFloat(b.dataset.skip)||0);upd();}));
  const K=posKey(a);
  const restore=()=>{let s=0;try{s=parseFloat(localStorage.getItem(K))||0;}catch(err){}if(s>3&&a.duration&&s<a.duration-5&&a.currentTime<1){try{a.currentTime=s;}catch(err){}upd();
    /* WebKit(사파리)은 loadedmetadata 때의 위치 이동을 버릴 때가 있다 — 0 근처로 남았으면 canplay·첫 재생 때 한 번 더 */
    a.__rgen=(a.__rgen||0)+1;const gen=a.__rgen,again=()=>{if(gen!==a.__rgen)return;if(a.currentTime<1){try{a.currentTime=s;}catch(err){}upd();}};a.__again=again;a.addEventListener("loadeddata",again,{once:true});a.addEventListener("canplay",again,{once:true});a.addEventListener("play",again,{once:true});}msPos(a);};
  if(a.readyState>=1)restore();else a.addEventListener("loadedmetadata",restore,{once:true});
  let last=0;const save=()=>{try{if(a.duration&&a.currentTime>a.duration-5)localStorage.removeItem(K);else if(a.currentTime>3)localStorage.setItem(K,String(Math.floor(a.currentTime)));}catch(err){}};SAVEPOS=save;
  a.addEventListener("timeupdate",()=>{const n=Date.now();if(n-last>4000){last=n;save();msPos(a);}});
  a.addEventListener("pause",()=>{save();if("mediaSession" in navigator)navigator.mediaSession.playbackState="paused";});
  a.addEventListener("play",()=>{msMeta(a);msPos(a);if("mediaSession" in navigator)navigator.mediaSession.playbackState="playing";});
  a.addEventListener("seeked",()=>{save();msPos(a);});a.addEventListener("ratechange",()=>msPos(a));
  a.addEventListener("ended",()=>{try{localStorage.removeItem(K);}catch(err){}if("mediaSession" in navigator)navigator.mediaSession.playbackState="none";});}
window.addEventListener("pagehide",()=>{if(SAVEPOS)SAVEPOS();});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"&&SAVEPOS)SAVEPOS();});
/* ===== /B ===== */
/* 오너 지시 21:11: 새봄묵상 로고(머리글, 설정 화면에서도 보임)를 누르면 오늘 묵상 화면으로 */
document.addEventListener("click",ev=>{const h=ev.target.closest("a.home");if(!h)return;ev.preventDefault();if(location.hash&&location.hash!=="#"){NAVDIR="";location.hash="";}else{window.scrollTo(0,0);}});
/* ===== v2.0.3 자동 업데이트 (worker-8, 2026-11-21 · 오너 「설정에 업데이트 여부 알리고 자동업데이트 되도록 해라」) =====
   새 서비스워커는 받자마자 자리를 잡고(skipWaiting·clients.claim), 이 화면은 안전한 때 조용히 다시 열린다:
   음성이 재생 중이면 절대 다시 열지 않는다. 적용하는 때 = ①앱을 연 직후·돌아온 직후 15초 안 ②20초 동안 손대지 않음 ③화면이 가려짐(듣다 멈춘 중간이 아니면)
   ④재생이 끝남·■(처음으로) ⑤설정의 「지금 확인」. 다시 열기 전에 날짜(#주소)·스크롤·들은 위치·고른 목소리를 남기고, 열린 뒤 「새 버전으로 업데이트되었습니다」를 한 번 띄운다.
   새 판 확인 = 열 때·돌아올 때(checkNew)·열려 있는 동안 30분마다·「지금 확인». */
var UPD={pending:false,shown:Date.now(),input:0,user:0,checking:false,err:false,found:false,drag:false};
const UPD_KEY="saebom:updRestore";
function updPlaying(){const a=document.getElementById("player");return !!(a&&!a.paused&&!a.ended);}
function updMidway(){const a=document.getElementById("player");return !!(a&&a.paused&&!a.ended&&a.currentTime>0);}
["pointerdown","keydown","touchstart","wheel"].forEach(n=>document.addEventListener(n,()=>{UPD.input=Date.now();},{passive:true,capture:true}));
["pointerup","pointercancel","touchend","touchcancel"].forEach(n=>document.addEventListener(n,()=>{if(UPD.drag){UPD.drag=false;UPD.input=Date.now();}},{passive:true,capture:true})); /* r2: 재생 막대 밖에서 손을 떼도 끌기 끝 */
try{const m=JSON.parse(sessionStorage.getItem(UPD_KEY)||"null");if(m&&Date.now()-m.t<120000){UPD.restore=m;if(m.vc)VCLICK=true;}else sessionStorage.removeItem(UPD_KEY);}catch(err){}
function updApply(){if(UPD.applied)return;UPD.applied=true;
  try{sessionStorage.setItem(UPD_KEY,JSON.stringify({t:Date.now(),y:Math.round(window.scrollY||0),h:location.hash,vc:VCLICK,from:VERSION}));}catch(err){}
  try{if(SAVEPOS)SAVEPOS();}catch(err){}
  location.reload();}
function updTry(why){if(!UPD.pending||UPD.applied)return;updUI();if(updPlaying())return; /* 듣는 중에는 다시 열지 않는다 */
  const sk=document.getElementById("seek");if(UPD.drag||(sk&&sk.matches(":active")))return; /* 재생 위치를 끄는 중 (r2 Gemini m1: :active 만으로는 iOS 터치 끌기를 못 잡음) */
  if(PENDING!==null)return; /* 다른 날·목소리를 불러오는 중 (r2 Gemini M2) */
  const t=Date.now(),hid=document.visibilityState==="hidden";
  /* r2 (Gemini M2): 열기·돌아온 직후 15초 창은 그 뒤로 아직 아무것도 만지지 않았을 때만. 한 번이라도 만졌으면 20초 동안 손대지 않을 때까지 기다린다 */
  if(why==="user"||why==="stop"||(hid&&!updMidway())||(!hid&&((t-UPD.shown<15000&&UPD.input<UPD.shown)||t-UPD.input>20000)))updApply();}
function updFound(){UPD.pending=true;UPD.err=false;updTry(Date.now()-UPD.user<60000?"user":"ctl");}
function updCheck(user){if(!("serviceWorker" in navigator))return Promise.resolve();if(user)UPD.user=Date.now();UPD.checking=true;updUI();
  /* r2 (Gemini M1): 처음 연 화면은 sw.js 등록(window load) 전에 여기 올 수 있다 - 등록을 기다린다(15초까지), 「확인하지 못했습니다」로 단정하지 않는다 */
  /* WebKit(r2 gate): 첫 SW 가 설치 중일 때 update() 가 실패한다 - 늘 ready(활성 SW 있음)를 기다린 뒤 확인 */
  const regP=Promise.race([navigator.serviceWorker.ready,new Promise((_,no)=>setTimeout(()=>no(new Error("no sw")),15000))]);
  return regP.then(r=>{REG=r||null;if(!r)throw new Error("no sw");return r.update().then(()=>r);}).then(r=>{UPD.checking=false;UPD.err=false;
    try{localStorage.setItem("updChk",String(Date.now()));}catch(err){}
    if(r.waiting&&!r.installing)r.waiting.postMessage({type:"saebom:skip"});
    /* r2 (Gemini M1): 「적용 중」은 이 화면을 이미 맡은 SW 가 있고 새 SW 가 설치·대기 중일 때만(처음 설치는 새 판이 아님). 새 SW 가 실패(redundant)하면 다시 지운다 */
    const nw=r.installing||r.waiting;UPD.found=!!(nw&&navigator.serviceWorker.controller&&!UPD.pending);
    if(nw&&UPD.found)nw.addEventListener("statechange",()=>{if(nw.state==="redundant"&&!UPD.pending){UPD.found=false;updUI();}});
    updUI();}).catch(()=>{UPD.checking=false;UPD.err=true;if(!UPD.pending)UPD.found=false;updUI();});}
function updUI(){const $=id=>document.getElementById(id);if(!$("upd-st"))return;
  $("ver").textContent="v"+APP_VER;$("build").innerHTML=esc(BUILT)+'<br><span class="bc">'+esc(VERSION)+'</span>';
  let c=0;try{c=parseInt(localStorage.getItem("updChk"),10)||0;}catch(err){}
  let ct="아직 확인하지 않았습니다";if(c){try{ct=new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"long",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(c));}catch(err){ct=new Date(c).toLocaleString();}}
  $("upd-chk").textContent=ct;
  $("upd-st").textContent=!("serviceWorker" in navigator)?"이 브라우저는 자동 업데이트를 지원하지 않습니다":(UPD.pending||UPD.found)?(updPlaying()?"새 버전 적용 중… (재생이 멈추면 적용됩니다)":"새 버전 적용 중…"):UPD.checking?"확인 중…":UPD.err?"확인하지 못했습니다 (인터넷 연결을 확인해 주세요)":"최신 버전입니다";
  $("upd-btn").disabled=UPD.checking||!("serviceWorker" in navigator);} /* r2 (Gemini m2) */
function updAfterBoot(){const m=UPD.restore;UPD.restore=null;try{sessionStorage.removeItem(UPD_KEY);}catch(err){}
  if(m&&m.h===location.hash&&m.y>0){const go=()=>window.scrollTo(0,m.y);go();setTimeout(go,300);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>setTimeout(go,50));}
  let last=null;try{last=localStorage.getItem("appBuild");}catch(err){}
  if(last!==VERSION){if(last||HAD_CTL)toast("새 버전으로 업데이트되었습니다 (v"+APP_VER+")");try{localStorage.setItem("appBuild",VERSION);}catch(err){}} /* 판마다 한 번 */
  UPD.shown=Date.now();updCheck();}
document.addEventListener("click",ev=>{if(ev.target.closest("#upd-btn"))updCheck(true).then(()=>{if(UPD.pending)updTry("user");});
  if(ev.target.closest("#st"))setTimeout(()=>updTry("stop"),0);});
document.addEventListener("ended",()=>updTry("stop"),true);document.addEventListener("pause",()=>setTimeout(()=>updTry("pause"),0),true);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")UPD.shown=Date.now();updTry("vis");});
setInterval(()=>{if(UPD.pending)updTry("tick");},5000);
setInterval(()=>{if(document.visibilityState==="visible")updCheck();},30*60e3);
/* ===== /v2.0.3 ===== */
/* ===== v2.1: 묵상 알림 숫자 (worker-9, 2026-11-21 · CEO 11-20 명세) — 아직 열어 보지 않은 묵상 날 수, 최대 7. 이 폰(localStorage "unread")에만 저장 · 서버·푸시 없음.
   센 날 = 목록(index.json)에 있는 묵상 날(달력 날 아님), 한국 시간 05:00 규칙으로 열린 날 중 가장 최근 7일. 이 폰에서 v2.1 을 처음 연 날(from)보다 앞선 날은 세지 않는다(새로 깔아도 0에서 시작).
   새로 세는 때: 그날 묵상이 그려질 때(=열기) · 앱으로 돌아올 때(visibilitychange) · 목록을 다시 받을 때 · 매일 05:00(한국 시간). 아이콘 숫자는 navigator.setAppBadge 가 있을 때만(안드로이드 크롬은 지원 안 함 — 앱 안 숫자만). ===== */
var UNREAD_MAX=7,UNREAD_N=-1;
function unreadSync(openedIso){if(!DATA_IDX)return;const t=todayKST();
  const days=(DATA_IDX.days||[]).map(x=>x.iso).filter((i,k,a)=>i&&i<=t&&a.indexOf(i)===k).sort().reverse(),win=days.slice(0,UNREAD_MAX);
  let s=null;try{s=JSON.parse(localStorage.getItem("unread")||"null");}catch(err){}
  if(!s||typeof s.from!=="string"||!Array.isArray(s.seen))s={from:days[0]||t,seen:[]};
  if(openedIso&&s.seen.indexOf(openedIso)<0)s.seen.push(openedIso);
  const lo=win.length?win[win.length-1]:t;s.seen=s.seen.filter(i=>typeof i==="string"&&i>=lo&&i>=s.from); /* 창(최근 7일) 밖은 지운다 — 저장이 늘지 않음 */
  const n=Math.min(UNREAD_MAX,win.filter(i=>i>=s.from&&s.seen.indexOf(i)<0).length);
  try{localStorage.setItem("unread",JSON.stringify(s));}catch(err){}
  unreadShow(n);return n;}
function unreadShow(n){const el=document.getElementById("unread");if(el){el.hidden=!n;el.innerHTML=n?'<b aria-hidden="true">'+n+'</b><span class="sr">안 읽은 묵상 '+n+'일</span>':"";}
  if(n===UNREAD_N)return;UNREAD_N=n;
  try{if("setAppBadge" in navigator){const p=n?navigator.setAppBadge(n):(navigator.clearAppBadge?navigator.clearAppBadge():navigator.setAppBadge(0));if(p&&p.catch)p.catch(()=>{});}}catch(err){}}
/* 아이콘에도 숫자가 보이는가 — 정직하게: API 가 있고, 홈 화면 앱으로 열렸고, 안드로이드·리눅스가 아니고, 아이폰이면 알림 허용까지 된 경우만 "icon". 나머지는 "app"(앱 안 숫자만) */
function badgeMode(){const ua=navigator.userAgent,api="setAppBadge" in navigator,inst=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  if(!api||!inst||/Android/i.test(ua)||(/Linux/i.test(ua)&&!IOS))return "app";
  if(IOS&&!(window.Notification&&Notification.permission==="granted"))return "app";
  return "icon";}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")unreadSync();});
function unreadAt0500(){const t=nowMs(),D=864e5,off=((t-20*3600e3)%D+D)%D;setTimeout(()=>{unreadSync();unreadAt0500();},D-off+2000);} /* 05:00 KST = 20:00 UTC, 목록 다시 받기(at0500, +3 s)보다 먼저 — 받아 둔 목록으로 센다 */
unreadAt0500();
/* ===== /v2.1 ===== */
