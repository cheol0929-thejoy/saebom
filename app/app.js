/* 새봄묵상 앱 — 재작업 2026-11-20 (worker-2). 이 파일의 화면 코드(render·색인·재생기·글자 크기)는 새봄묵상 페이지 index.html(ver 1795058595-16e9)의 스크립트를 그대로 옮기고,
   데이터만 app/data(묶음 B: index.json + 날짜별 json)에서 읽도록 몇 줄 바꿨다. 앱에만 있는 것: 설정 화면(밝게/어둡게·홈 화면에 추가·알림·앱 정보), 인터넷 없음 표시, 아이폰 보조 링크. */
var VERSION="v1-28af2441e7";
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
  const ALL=[one("p","audio","dur","신철 목사 음성","목사"),one("f","audio_f","dur_f","여성 낭독","여"),one("m","audio_m","dur_m","남성 낭독","남")];
  const SRC=ALL.filter(x=>x[1]);
  const pick=(ALL[0][1]&&!VCLICK)?ALL[0]:(SRC.find(x=>x[0]===VOICE)||SRC[0]);
  const cur=pick?{src:pick[1],dur:pick[2]||"",kind:pick[0],fb:pick[5]||""}:null;
  const RL=[[0.9,"0.9배"],[1,"1.0배 (보통)"],[1.25,"1.25배"],[1.5,"1.5배"],[1.75,"1.75배"]]; /* 오너 지시 2026-11-20 21:21: 배속 0.9/1.0/1.25/1.5/1.75, 처음 = 1.0 (음성 파일 자체가 1.15배로 다듬어짐) */
  const audio=cur
    ? `<div class="tts"><span class="lab">듣기</span><button type="button" class="sk" id="sk-b" data-skip="-15" aria-label="15초 뒤로"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 4V1L7 5l5 4V6a7 7 0 1 1-7 7H3a9 9 0 1 0 9-9z"/></svg><span aria-hidden="true">15</span></button><button type="button" class="pp" id="pp" aria-label="재생">▶</button><button type="button" class="sk fw" id="sk-f" data-skip="15" aria-label="15초 앞으로"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 4V1l5 4-5 4V6a7 7 0 1 0 7 7h2a9 9 0 1 1-9-9z"/></svg><span aria-hidden="true">15</span></button><span class="brk" aria-hidden="true"></span><button type="button" class="st" id="st" aria-label="처음으로" disabled>■</button><select class="rate" id="rate" aria-label="읽는 속도">${RL.map(([r,l])=>`<option value="${r}"${r===RATE?" selected":""}>${l}</option>`).join("")}</select><span class="vsel" role="group" aria-label="목소리">${ALL.map(x=>`<button type="button" data-voice="${x[0]}" class="${pick&&x[0]===pick[0]?"on":""}" aria-pressed="${pick&&x[0]===pick[0]}"${x[1]?"":" disabled"} title="${x[3]}${x[1]?"":" · 아직 없습니다"}">${x[4]}</button>`).join("")}</span></div>
       <div class="bar"><span class="tm"><span id="cur">0:00</span> / <span id="tot">${esc(cur.dur?cur.dur.replace(/(\d+)분 (\d+)초/,(m,a,b)=>a+":"+b.padStart(2,"0")):"--:--")}</span></span><input type="range" id="seek" min="0" max="1000" value="0" aria-label="재생 위치"></div>
       <audio id="player" preload="${OFFLINE?"none":"metadata"}" src="${esc(cur.src)}" data-kind="${cur.kind}"${cur.fb&&cur.fb!==cur.src?` data-fb="${esc(cur.fb)}"`:""}></audio>
       ${cur.kind!=="p"?`<p class="aiNote">${cur.kind==="f"?"여성":"남성"} AI 음성으로 읽어 드립니다</p>`:""}
       ${IOS?'<p class="iosNote"><a href="'+esc(ARTIFACT+"#"+e.id)+'" target="_blank" rel="noopener">재생이 안 되면 묵상 페이지에서 듣기</a></p>':""}`
    : `<p class="aiNote">오늘 묵상 음성은 준비 중입니다.</p>`;
  document.getElementById("today").innerHTML=dayStrip(e)+`
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
  </div>`+pager(e);
  CURRENT=e.id;dayIn(dir);
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
var RATES=[0.9,1,1.25,1.5,1.75];
var RATE=1;
var BASE=1; /* 오너 지시 21:11: 고른 배속을 모든 목소리(목사님·AI)에 그대로 (페이지의 목사님 1.2배 기준은 쓰지 않음) */
try{let r=parseFloat(localStorage.getItem("rate2"));if(!isNaN(r)&&!RATES.includes(r)){r=RATES.reduce((a,b)=>Math.abs(b-r)<Math.abs(a-r)?b:a);localStorage.setItem("rate2",r);} /* 예전 0.8→0.9, 1.2→1.25 */if(RATES.includes(r))RATE=r;}catch(err){}
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
  seek.addEventListener("input",()=>{noRestore(a);if(a.duration)a.currentTime=seek.value/1000*a.duration;});
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
function boot(){loadIndex().then(route).catch(()=>{document.getElementById("today").innerHTML='<p class="loadmsg">인터넷이 없고 저장된 묵상도 없습니다. 인터넷에 연결한 뒤 다시 열어 주세요.</p>';});}
/* 앱으로 돌아올 때마다 목록을 다시 받는다 — 05:00 넘어 새 묵상, 나중에 붙은 녹음·그림 반영 */
var REG=null;if("serviceWorker" in navigator)navigator.serviceWorker.getRegistration().then(r=>{REG=r||null;}).catch(()=>{});
function checkNew(){if(document.visibilityState!=="visible")return;try{if(REG)REG.update();else if("serviceWorker" in navigator)navigator.serviceWorker.getRegistration().then(r=>{REG=r||null;if(REG)REG.update();});}catch(err){}const a=document.getElementById("player");if(a&&!a.paused)return;
  /* F36 (Gemini quick r1): 같은 날이고 그날 자료가 그대로면 다시 그리지 않는다 — 같은 <audio> 가 남아 멈춘 위치·상태가 그대로(음원 서버가 Range 를 안 받아 새 재생기에서는 위치를 되돌릴 수 없음). 날이 바뀌었거나 자료가 바뀌었을 때만 다시 그린다. */
  const was=CURRENT,top=VISIBLE[0]&&VISIBLE[0].id,old=VISIBLE.find(x=>x.id===was),oldTxt=old&&DAYS[old.iso]?JSON.stringify(DAYS[old.iso]):null;
  loadIndex().then(()=>{newDayNote(top);if(!document.getElementById("settings").hidden)return;const h=normId(location.hash.slice(1)),want=h&&h!==top?h:"",meta=VISIBLE.find(x=>x.id===want||x.iso===want)||VISIBLE[0];
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
let DEFER=null;window.addEventListener("beforeinstallprompt",ev=>{ev.preventDefault();DEFER=ev;const b=document.getElementById("inst-btn");if(b)b.hidden=false;});
document.getElementById("inst-btn").addEventListener("click",()=>{if(!DEFER)return;DEFER.prompt();DEFER.userChoice.finally(()=>{DEFER=null;document.getElementById("inst-btn").hidden=true;});});
function showSettings(top){applyTheme(THEME);
  const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;document.getElementById("inst-done").hidden=!standalone;
  const and=/Android/i.test(navigator.userAgent);document.getElementById("g-android").hidden=IOS;document.getElementById("g-ios").hidden=and;
  document.getElementById("ver").textContent=VERSION;
  const n=DATA_IDX&&DATA_IDX.days.length?DATA_IDX.days.length:0;document.getElementById("datainfo").textContent=VISIBLE[0]?(VISIBLE[0].short+" 묵상까지 · "+VISIBLE.length+"일"):"-";
  if(top!==false)window.scrollTo(0,0);}

/* ===== B: 재생기·탐색 (worker-5, 2026-11-20) — ±15초·날짜별 위치 기억·잠금화면(Media Session)·날짜 띠·좌우 넘기기·딥링크·새 묵상 알림 ===== */
const WD=["일","월","화","수","목","금","토"];
function nbr(iso){const i=VISIBLE.findIndex(x=>x.iso===iso);return {older:i>=0?VISIBLE[i+1]||null:null,newer:i>0?VISIBLE[i-1]:null};}
/* 월~토 날짜 띠: 그 주의 열린 날만 누를 수 있다 (주일 특별묵상은 ‹이전·다음›·넘기기·목록으로) */
function dayStrip(e){
  const d=new Date(e.iso+"T00:00:00Z"),mon=d.getTime()-((d.getUTCDay()+6)%7)*864e5;let h="";
  for(let k=0;k<6;k++){const c=new Date(mon+k*864e5),iso=c.toISOString().slice(0,10),m=VISIBLE.find(x=>x.iso===iso),on=iso===e.iso;
    const lab=(c.getUTCMonth()+1)+"월 "+c.getUTCDate()+"일 "+WD[c.getUTCDay()]+"요일";const inner='<i>'+WD[c.getUTCDay()]+'</i><b>'+c.getUTCDate()+'</b>'; /* 보이는 글 = 이름의 앞부분 (Lighthouse label-content-name-mismatch) */
    h+=m?'<a class="dc'+(on?' on':'')+'" href="#'+esc(m.id)+'"'+(on?' aria-current="date"':'')+'>'+inner+'<span class="sr"> '+lab+' 묵상'+(on?' (보는 중)':'')+'</span></a>':'<span class="dc off">'+inner+'<span class="sr"> '+lab+' 묵상 없음</span></span>';}
  return '<nav class="daystrip" aria-label="이번 주 묵상 날짜">'+h+'</nav>';}
function pager(e){const n=nbr(e.iso);const one=(x,cls,lab)=>x?'<a class="'+cls+'" href="#'+esc(x.id)+'" rel="'+(cls==="pv"?"prev":"next")+'"><small>'+lab+'</small><span>'+esc(x.short)+' '+esc(x.title)+'</span></a>':'<span class="'+cls+' none" aria-hidden="true"></span>';
  return '<nav class="pager" aria-label="앞뒤 묵상">'+one(n.older,"pv","‹ 이전 묵상")+one(n.newer,"nx","다음 묵상 ›")+'</nav>';}
let NAVDIR="";
function go(dir){if(!document.getElementById("settings").hidden)return false;const iso=(document.getElementById("day")||{dataset:{}}).dataset.iso;const n=nbr(iso),x=dir==="next"?n.newer:n.older;
  if(!x){toast(dir==="next"?"가장 최근 묵상입니다":"더 이전 묵상이 없습니다");return false;}NAVDIR=dir;location.hash=x.id;return true;}
function dayIn(dir){const d=document.getElementById("day");if(d&&dir)d.classList.add(dir==="next"?"in-next":"in-prev");}
function normId(h){return /^\d{4}-\d{2}-\d{2}$/.test(h)?"d"+h.replace(/-/g,""):h;}
function refreshNav(iso){const e={iso:iso},s=document.querySelector("#today .daystrip"),p=document.querySelector("#today .pager");if(s)s.outerHTML=dayStrip(e);if(p)p.outerHTML=pager(e);renderArchive();}
document.addEventListener("click",ev=>{const a=ev.target.closest(".pager a,.daystrip a");if(!a)return;const cur=(document.getElementById("day")||{dataset:{}}).dataset.iso||"",to=VISIBLE.find(x=>"#"+x.id===a.getAttribute("href"));if(to)NAVDIR=to.iso>cur?"next":"prev";});
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
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(had)toast("새 버전이 준비됐습니다","다시 열기",()=>location.reload());});}
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
