/* 아침한권 앱 1.3.0 (아이패드 설치 안내·색인·홈→설정 밀기, 오너 지시 2026-11-23) · 1.2.0 (머리줄 고정·탭 줄 삭제·한 줄 재생기·빨간 MORNING 아이콘, 오너 지시 2026-11-22) — 새봄묵상 앱(saebom/app)의 설치 배너·아이폰 안내·카카오톡 바깥 열기·글자 크기·서비스워커 방식을 따른다 */
"use strict";
var APP_VER="1.3.0";
var IDX=null,CACHE={},OFF=false;
var V=document.getElementById("view"),SET=document.getElementById("settings");
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
var WD=["일","월","화","수","목","금","토"];
function kdate(iso){var p=iso.split("-").map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2]));return p[0]+"년 "+p[1]+"월 "+p[2]+"일 ("+WD[d.getUTCDay()]+")";}
function sdate(iso){var p=iso.split("-");return +p[1]+"월 "+(+p[2])+"일";}
function getJSON(u){return fetch(u,{cache:"no-cache"}).then(function(r){OFF=r.headers.get("X-Achim-Offline")==="1";document.getElementById("offline").hidden=!OFF;if(!r.ok)throw new Error(r.status);return r.json();});}
function loadIndex(){return getJSON("data/index.json").then(function(j){IDX=j;return j;});}
function loadDay(id){if(CACHE[id])return Promise.resolve(CACHE[id]);return getJSON("data/"+id+".json").then(function(d){CACHE[id]=d;return d;});}
function paras(a){return (Array.isArray(a)?a:[a]).map(function(t){return "<p>"+esc(t)+"</p>";}).join("");}
function verse(ref){var m=/^(.*?)\s*\((.*)\)\s*$/.exec(ref||"");return m?'<span>'+esc(m[1])+'</span><span>('+esc(m[2])+')</span>':'<span>'+esc(ref)+'</span>';}
/* 제목 한 줄 맞춤: 넘치면 글자를 줄여 한 줄에 맞춘다(최소 60%) */
function fit(){document.querySelectorAll(".fit").forEach(function(el){el.style.fontSize="";var w=el.clientWidth,s=el.scrollWidth;if(s>w&&w>0){var cur=parseFloat(getComputedStyle(el).fontSize);el.style.fontSize=Math.max(cur*0.6,cur*w/s*0.98)+"px";}});}
window.addEventListener("resize",fit);
function renderDay(d){
  var i=IDX.days.findIndex(function(x){return x.id===d.id;}),newer=IDX.days[i-1],older=IDX.days[i+1];
  var c=d.challenge||{};
  V.innerHTML=
  '<div class="hero"><p class="meta">아침한권 · Day '+d.day+' · '+esc(d.recommender)+' 추천 · '+esc(d.series)+'</p>'+
  '<p class="date">'+kdate(d.date)+'</p>'+
  '<h1 class="title fit">📖 '+esc(d.book)+' <small>('+esc(d.part_no)+')</small></h1>'+
  '<p class="byline">'+esc(d.author)+' · '+esc(d.part)+'</p>'+
  '<p class="theme">'+esc(d.theme)+'</p></div>'+playerHTML(d)+
  '<article>'+
  '<section><h2>🌅 오늘을 여는 이야기</h2>'+paras(d.hook)+'</section>'+
  '<section><h2>🏛️ 책과 저자 이야기</h2>'+paras(d.background)+'</section>'+
  '<section><h2>🎬 오늘의 장면</h2>'+paras(d.scene)+'</section>'+
  '<section><h2>💡 핵심 생각</h2>'+paras(d.insight)+'<p class="key">'+esc(d.key)+'</p></section>'+
  '<section><h2>🪞 오늘 내 삶에 비추면</h2>'+paras(d.life)+'</section>'+
  '<section><h2>🔥 오늘의 도전</h2><div class="chal"><div><b>아침</b>'+esc(c.morning)+'</div><div><b>점심</b>'+esc(c.noon)+'</div><div><b>저녁</b>'+esc(c.evening)+'</div></div></section>'+
  '<section><h2>❓ 생각해 볼 질문</h2><ol class="q">'+(d.questions||[]).map(function(q){return "<li>"+esc(q)+"</li>";}).join("")+'</ol></section>'+
  '<section><h2>✝️ 오늘의 말씀</h2><p class="verse">'+verse(d.verse_ref)+'</p>'+paras(d.verse_note)+'</section>'+
  '<section class="prayer"><h2>🙏 기도</h2>'+paras(d.prayer)+'</section>'+
  '<section><p class="src">'+esc(d.source_note)+'</p><p class="next"><b>다음 회</b> · '+esc(d.next)+'</p></section>'+
  '</article>'+
  '<div class="pager"><a class="btn" '+(older?'href="#/'+older.id+'"':'aria-disabled="true"')+'>← 지난 글</a>'+
  '<a class="btn" '+(newer?'href="#/'+newer.id+'"':'aria-disabled="true"')+'>다음 글 →</a></div>';
  document.title="아침한권 · Day "+d.day+" "+d.book;fit();wirePlayer(d);
}
/* 듣기 — 새봄묵상 재생기 방식: 속도 0.8/1.0/1.2/1.5(처음 = 보통, 기기에 기억), 15초 앞뒤, 처음으로, 여성/남성, 이어 듣기(날·목소리마다 위치 기억) */
var RATES=[[0.8,"천천히"],[1,"보통"],[1.2,"조금 빠르게"],[1.5,"빠르게"]],RATE=1,VOICE="f";
try{var r0=parseFloat(localStorage.getItem("achim-rate"));if(RATES.some(function(x){return x[0]===r0;}))RATE=r0;var v0=localStorage.getItem("achim-voice");if(v0==="f"||v0==="m")VOICE=v0;}catch(e){}
function fmtT(t){t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+":"+String(t%60).padStart(2,"0");}
function pickVoice(d){var vs=d.voices||[];return vs.filter(function(v){return v.key===VOICE;})[0]||vs[0]||null;}
function posKey(d,v){return "achim-pos:"+d.id+":"+v.key;}
function playerHTML(d){var v=pickVoice(d);if(!v)return "";var vs=d.voices;
  return '<div class="player" id="pl"><div class="tts"><button type="button" class="sk" id="sk-b" aria-label="15초 뒤로">−15</button><button type="button" class="pp" id="pp" aria-label="재생">▶</button><button type="button" class="sk" id="sk-f" aria-label="15초 앞으로">+15</button><button type="button" class="st" id="st" aria-label="처음으로" disabled>■</button>'+
   '<select class="rate" id="rate" aria-label="읽는 속도">'+RATES.map(function(r){return '<option value="'+r[0]+'"'+(r[0]===RATE?" selected":"")+' aria-label="'+r[1]+' '+r[0]+'배">'+r[0]+'x</option>';}).join("")+'</select>'+
   (vs.length>1?'<span class="vsel" role="group" aria-label="목소리">'+vs.map(function(x){return '<button type="button" data-voice="'+x.key+'" class="'+(x.key===v.key?"on":"")+'" aria-pressed="'+(x.key===v.key)+'" aria-label="'+esc(x.label)+'" title="'+esc(x.label)+'">'+esc(String(x.short).charAt(0))+'</button>';}).join("")+'</span>':"")+'</div>'+
   '<div class="bar"><input type="range" id="seek" min="0" max="1000" value="0" aria-label="재생 위치"><span class="tm"><span id="cur">0:00</span> / <span id="tot">'+fmtT(v.sec)+'</span></span></div>'+
   '<p class="aiNote" id="resume-note">'+esc(v.label)+'으로 읽어 드립니다</p>'+
   '<audio id="player" preload="metadata" src="'+esc(v.src)+'"'+(v.fallback&&v.fallback!==v.src?' data-fb="'+esc(v.fallback)+'"':"")+'></audio></div>';}
function applyRate(a){a.preservesPitch=true;a.webkitPreservesPitch=true;a.playbackRate=RATE;a.defaultPlaybackRate=RATE;}
function wirePlayer(d){var a=document.getElementById("player");if(!a)return;var v=pickVoice(d),K=posKey(d,v);
  var pp=document.getElementById("pp"),st=document.getElementById("st"),seek=document.getElementById("seek"),cur=document.getElementById("cur"),tot=document.getElementById("tot"),note=document.getElementById("resume-note");
  var saved=0;try{saved=parseFloat(localStorage.getItem(K))||0;}catch(e){}
  if(saved>5)note.textContent="지난번 "+fmtT(saved)+"까지 들으셨습니다 — ▶ 를 누르면 이어서 듣습니다";
  var restored=false,lastSave=0;
  function restore(){if(restored||!(saved>5)||!a.duration)return;restored=true;if(saved<a.duration-3){try{a.currentTime=saved;}catch(e){}}}
  function upd(){if(a.duration&&isFinite(a.duration)){tot.textContent=fmtT(a.duration);if(!seek.matches(":active"))seek.value=Math.round(a.currentTime/a.duration*1000);seek.style.setProperty("--p",(seek.value/10)+"%");}cur.textContent=fmtT(a.currentTime);st.disabled=a.paused&&a.currentTime===0;}
  a.addEventListener("loadedmetadata",function(){applyRate(a);restore();upd();});
  a.addEventListener("timeupdate",function(){upd();var n=Date.now();if(n-lastSave>2000&&a.currentTime>0){lastSave=n;try{localStorage.setItem(K,String(a.currentTime));}catch(e){}}});
  a.addEventListener("play",function(){applyRate(a);pp.textContent="❚❚";pp.setAttribute("aria-label","일시정지");st.disabled=false;});
  a.addEventListener("pause",function(){pp.textContent="▶";pp.setAttribute("aria-label","재생");upd();try{if(a.currentTime>0)localStorage.setItem(K,String(a.currentTime));}catch(e){}});
  a.addEventListener("ended",function(){pp.textContent="▶";pp.setAttribute("aria-label","재생");try{localStorage.removeItem(K);}catch(e){}note.textContent="끝까지 들으셨습니다";});
  /* 첫 주소가 안 되면 예비 주소(raw 사본)로 한 번 바꾼다 — 새봄묵상과 같음 */
  a.addEventListener("error",function(){var fb=a.dataset.fb;if(fb&&a.getAttribute("src")!==fb){var was=!a.paused||a.dataset.want==="1";delete a.dataset.fb;a.setAttribute("src",fb);a.load();if(was)a.play().catch(function(){});}else{note.textContent="음성을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.";}});
  pp.addEventListener("click",function(){if(a.paused){a.dataset.want="1";if(!restored&&saved>5&&a.readyState<1){a.addEventListener("loadedmetadata",function(){a.play().catch(function(){});},{once:true});a.load();return;}a.play().catch(function(){});}else{a.dataset.want="";a.pause();}});
  document.getElementById("sk-b").addEventListener("click",function(){a.currentTime=Math.max(0,a.currentTime-15);upd();});
  document.getElementById("sk-f").addEventListener("click",function(){if(a.duration)a.currentTime=Math.min(a.duration-0.5,a.currentTime+15);upd();});
  st.addEventListener("click",function(){a.pause();a.currentTime=0;try{localStorage.removeItem(K);}catch(e){}saved=0;upd();});
  seek.addEventListener("input",function(){restored=true;seek.style.setProperty("--p",(seek.value/10)+"%");if(a.duration)a.currentTime=seek.value/1000*a.duration;});
  document.getElementById("rate").addEventListener("change",function(ev){var r=parseFloat(ev.target.value);if(RATES.some(function(x){return x[0]===r;}))RATE=r;try{localStorage.setItem("achim-rate",String(RATE));}catch(e){}applyRate(a);});
  document.querySelectorAll(".vsel button[data-voice]").forEach(function(b){b.addEventListener("click",function(){if(b.dataset.voice===v.key)return;var was=!a.paused;a.pause();VOICE=b.dataset.voice;try{localStorage.setItem("achim-voice",VOICE);}catch(e){}
    renderDay(d);if(was){var n=document.getElementById("player");if(n)n.play().catch(function(){});}});});
}
/* 탭 줄이 없어졌으므로 목록 위에 오늘 글로 돌아가는 링크 */
var BACK='<a class="back" href="#/today">← 오늘 글로</a>';
function renderDate(){
  V.innerHTML=BACK+'<h1 class="ptitle">날짜순</h1><p class="small">모두 '+IDX.count+'편 · 최근 글부터</p><ul class="list">'+IDX.days.map(function(x){
    return '<li><a href="#/'+x.id+'"><span class="d">'+sdate(x.date)+'<br>Day '+x.day+'</span><span class="t"><small>'+esc(x.book)+' ('+esc(x.part_no)+')</small><span>'+esc(x.theme)+'</span></span></a></li>';}).join("")+'</ul>';
}
function prog(b){var p=b.S?Math.round(100*b.j/b.S):0;return '<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="'+b.S+'" aria-valuenow="'+b.j+'" aria-label="'+esc(b.book)+' '+b.j+'/'+b.S+'"><i style="width:'+p+'%"></i></div>';}
var ST={reading:"읽는 중",upcoming:"읽을 책",done:"다 읽음"};
function renderBook(){
  var groups=[],seen={};
  IDX.queue.filter(function(b){return b.days.length;}).forEach(function(b){if(!seen[b.series]){seen[b.series]=[];groups.push([b.series,seen[b.series]]);}seen[b.series].push(b);});
  V.innerHTML=BACK+'<h1 class="ptitle">책별</h1><p class="small">읽은 책과 읽는 중인 책 · 회차를 누르면 그날 글이 열립니다</p>'+groups.map(function(g){
    return '<p class="series">'+esc(g[0])+'</p>'+g[1].map(function(b){return '<div class="card book"><div class="bt"><b>'+esc(b.book)+'</b><em>'+b.j+'/'+b.S+'</em></div><div class="by">'+esc(b.author)+' · '+esc(b.recommender)+' 추천 · <span class="tag '+b.status+'">'+ST[b.status]+'</span></div>'+prog(b)+
      '<div class="chips">'+b.days.map(function(id,k){var x=IDX.days.find(function(y){return y.id===id;});return '<a href="#/'+id+'">'+esc(x?x.part_no:(k+1))+'</a>';}).join("")+'</div></div>';}).join("");}).join("");
}
function renderQueue(){
  var by={reading:[],upcoming:[],done:[]};IDX.queue.forEach(function(b){(by[b.status]||by.upcoming).push(b);});
  function card(b){var plan="";if(b.plan){var cur=b.status==="reading"?b.j:-1;plan='<details'+(b.status==="reading"?" open":"")+'><summary>읽기 계획 '+b.plan.length+'회</summary><ol>'+b.plan.map(function(p,k){return '<li class="'+(k===cur?"cur":"")+'">'+esc(p)+'</li>';}).join("")+'</ol></details>';}
    return '<div class="card book"><div class="bt"><b>'+esc(b.book)+'</b><em>'+(b.status==="upcoming"?b.S+"회":b.j+"/"+b.S)+'</em></div><div class="by">'+esc(b.author)+' · '+esc(b.recommender)+' 추천 · '+esc(b.series)+'</div>'+(b.status!=="upcoming"?prog(b):"")+plan+'</div>';}
  V.innerHTML=BACK+'<h1 class="ptitle">읽을 책</h1>'+
   '<p class="series">읽는 중</p>'+(by.reading.map(card).join("")||'<p class="small">없음</p>')+
   '<p class="series">다음에 읽을 책 · '+by.upcoming.length+'권</p>'+by.upcoming.map(card).join("")+
   '<p class="series">다 읽은 책 · '+by.done.length+'권</p>'+by.done.map(card).join("");
}
function route(){
  var h=(location.hash||"#/today").replace(/^#\/?/,"")||"today",prev=PREV_H;PREV_H=h;
  /* 설정 = 홈 위에 덮는 판(밀기 중에 아래 홈이 보여야 하므로 홈은 숨기지 않는다) */
  SET.hidden=h!=="settings";V.hidden=false;document.body.classList.toggle("setopen",h==="settings");
  if(h==="settings"){hintDone();if(SET_FROM===null)SET_FROM=prev||"";instUI();renderIndex();document.getElementById("fs-now").textContent=fs+"px";if(prev!=="settings")SET.scrollTop=0;slideReset();
    if(IDX&&!RENDERED){RENDERED="today";loadDay(IDX.latest).then(renderDay).catch(function(){});}return Promise.resolve();}
  SET_FROM=null;
  if(!IDX)return Promise.resolve();
  /* 설정을 닫고 같은 화면으로 돌아오면 다시 그리지 않는다(듣던 음성·읽던 자리 그대로) */
  if(prev==="settings"&&h===RENDERED)return Promise.resolve();
  RENDERED=h;
  var p;
  if(h==="date"){renderDate();p=Promise.resolve();}
  else if(h==="book"){renderBook();p=Promise.resolve();}
  else if(h==="queue"){renderQueue();p=Promise.resolve();}
  else{var id=/^d\d{4}$/.test(h)?h:IDX.latest;
    p=loadDay(id).then(renderDay).catch(function(){V.innerHTML='<p class="loadmsg">이 글은 아직 이 기기에 저장되어 있지 않습니다. 인터넷에 연결한 뒤 다시 열어 주세요.</p>';});}
  window.scrollTo(0,0);return p;
}
var RENDERED=null;
/* 밀기 안내(R1-11): 톱니 단추가 없어졌으므로 터치 기기의 홈 아래에 한 줄 — 설정을 한 번 열면 다시 안 보인다(이 기기에 기억) */
var HINT_KEY="achim-swhint";
function hintDone(){try{localStorage.setItem(HINT_KEY,"1");}catch(e){}var n=document.getElementById("swhint");if(n)n.hidden=true;}
(function(){var seen=false;try{seen=localStorage.getItem(HINT_KEY)==="1";}catch(e){}var touch=("ontouchstart" in window)||navigator.maxTouchPoints>0;document.getElementById("swhint").hidden=seen||!touch;})();
window.addEventListener("hashchange",route);
/* 색인 (오너 지시 2026-11-22/23): data/index.json 의 index (make_achim_data.py 가 매일 만든다) — 가나다·A-Z 건너뛰기 줄, 책은 회차로 펼침, 읽을 책은 누를 수 없음 */
var IDX_OPEN={},IDX_FAIL=false;
/* 고정된 건너뛰기 줄 아래로 맞춰 스크롤(R1-9) */
function ixScroll(el){var j=document.querySelector("#idx .jump"),off=(parseFloat(getComputedStyle(SET).paddingTop)||0)+(j?j.offsetHeight:0)+8;SET.scrollTop+=el.getBoundingClientRect().top-SET.getBoundingClientRect().top-off;}
function renderIndex(){var box=document.getElementById("idx");if(!box)return;var X=IDX&&IDX.index;if(!X){box.innerHTML='<p class="small">'+(IDX||!IDX_FAIL?'색인을 불러오는 중…':'색인을 불러오지 못했습니다. 인터넷에 연결한 뒤 다시 열어 주세요.')+'</p>';return;}
  var act={};X.active.forEach(function(g){act[g]=1;});
  var jump='<nav class="jump" aria-label="첫 글자로 건너뛰기">'+X.jump.map(function(g){return act[g]?'<a href="#" data-jump="'+esc(g)+'">'+esc(g)+'</a>':'<span aria-disabled="true">'+esc(g)+'</span>';}).join("")+'</nav>';
  var gid=function(g){return "ix-g-"+X.jump.indexOf(g);},bid=function(q){return "ix-b-"+q;};
  var tag='<span class="tag upcoming">읽을 책</span>';
  var body=X.groups.map(function(G){return '<section class="ixg" id="'+gid(G.g)+'" tabindex="-1"><h3>'+esc(G.g)+'</h3><ul class="ixl">'+G.items.map(function(it){
    if(it.t==="book"){
      if(it.status==="upcoming")return '<li class="ixb up" id="'+bid(it.q)+'"><span class="ixt">'+esc(it.label)+'</span> '+tag+'</li>';
      if(!it.sessions.length)return '<li class="ixb" id="'+bid(it.q)+'"><span class="ixt">'+esc(it.label)+'</span></li>';
      var open=!!IDX_OPEN[it.q];
      return '<li class="ixb" id="'+bid(it.q)+'"><button type="button" class="ixt" data-q="'+esc(it.q)+'" aria-expanded="'+open+'">'+esc(it.label)+' <em>'+it.sessions.length+'회</em></button>'+
        '<ol class="ixs"'+(open?'':' hidden')+'>'+it.sessions.map(function(s){return '<li><a href="#/'+esc(s.id)+'">Day '+s.day+' · '+esc(s.part_no)+' · '+esc(s.theme)+'</a></li>';}).join("")+'</ol></li>';}
    return '<li class="ixa"><span class="ixt">'+esc(it.label)+'</span> → '+it.books.map(function(b){return b.status==="upcoming"?'<span class="ixu">'+esc(b.book)+'</span> '+tag:b.read?'<a href="#" data-goto="'+esc(b.q)+'">'+esc(b.book)+'</a>':'<span class="ixu">'+esc(b.book)+'</span>';}).join(" · ")+'</li>';}).join("")+'</ul></section>';}).join("");
  box.innerHTML=jump+body;
  box.querySelectorAll("[data-jump]").forEach(function(a){a.addEventListener("click",function(ev){ev.preventDefault();var t=document.getElementById(gid(a.dataset.jump));if(t){ixScroll(t);t.focus({preventScroll:true});}});});
  box.querySelectorAll("button[data-q]").forEach(function(b){b.addEventListener("click",function(){var q=b.dataset.q,o=!IDX_OPEN[q];IDX_OPEN[q]=o;b.setAttribute("aria-expanded",String(o));b.nextElementSibling.hidden=!o;});});
  box.querySelectorAll("[data-goto]").forEach(function(a){a.addEventListener("click",function(ev){ev.preventDefault();var q=a.dataset.goto,li=document.getElementById(bid(q));if(!li)return;var b=li.querySelector("button[data-q]");if(b&&!IDX_OPEN[q])b.click();ixScroll(li);if(b)b.focus({preventScroll:true});});});
}
/* 홈 → 설정 밀기 (오너 지시 2026-11-23 "홈에서 설정으로 넘어갈때 왼쪽으로 밀기", 설정 버튼 대신):
   홈(글 화면·목록)에서 왼쪽으로 밀면 설정이 오른쪽에서 들어오고, 설정에서 오른쪽으로 밀면 돌아간다. 브라우저 뒤로 = 설정 닫기.
   60px 이상 · 가로가 세로의 1.5배 넘을 때만(세로 스크롤은 그대로) · 재생기·진행 막대·버튼·입력칸·선택한 글자에서 시작하면 무시. 날짜 넘기기 밀기는 없다 */
var PREV_H=null,SET_FROM=null,SW_MIN=60,SW_RATIO=1.5,EDGE=24;
function slideReset(){SET.style.transition="";SET.style.transform="";SET.classList.remove("peek");}
function closeSettings(){if(SET_FROM&&SET_FROM!=="settings"&&history.length>1){history.back();}else{location.replace("#/today");}}
document.getElementById("set-back").addEventListener("click",function(ev){ev.preventDefault();closeSettings();});
(function(){var sx=0,sy=0,on=false,dir=0,w=1,from="";
  var SKIP=".player,.bar,button,input,select,textarea,label,summary,audio,[contenteditable],.jump,.ib-steps";
  function selected(){var s=window.getSelection&&window.getSelection();return !!(s&&!s.isCollapsed&&String(s).length);}
  function inSet(){return !SET.hidden&&!SET.classList.contains("peek");}
  /* 두 번째 손가락이 닿으면 밀던 판을 제자리로(R1-1). 화면 양 끝 24px 에서 시작한 밀기는 사파리 뒤로/앞으로 몸짓이므로 무시(R1-10) */
  document.addEventListener("touchstart",function(e){if(on&&dir){slideReset();if(from==="home")SET.hidden=true;}on=false;dir=0;if(e.touches.length!==1||selected())return;var t=e.target;if(t.closest&&t.closest(SKIP))return;
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;w=window.innerWidth||1;if(sx<EDGE||sx>w-EDGE)return;from=inSet()?"set":"home";on=true;},{passive:true});
  document.addEventListener("touchmove",function(e){if(!on)return;if(e.touches.length!==1){on=false;if(dir){slideReset();if(from==="home")SET.hidden=true;}return;}var dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;
    if(!dir){if(Math.abs(dx)<10&&Math.abs(dy)<10)return;if(Math.abs(dx)>SW_RATIO*Math.abs(dy)&&(from==="home"?dx<0:dx>0)){dir=1;if(from==="home"){SET.hidden=false;SET.classList.add("peek");}}else{on=false;return;}}
    if(selected()){on=false;slideReset();if(from==="home")SET.hidden=true;return;}
    var x=from==="home"?Math.max(0,w+dx):Math.max(0,dx);SET.style.transition="none";SET.style.transform="translateX("+x+"px)";},{passive:true});
  function end(e){if(!on||!dir){on=false;return;}on=false;var t=e.changedTouches&&e.changedTouches[0],dx=t?t.clientX-sx:0,dy=t?t.clientY-sy:0;
    var ok=Math.abs(dx)>=SW_MIN&&Math.abs(dx)>SW_RATIO*Math.abs(dy)&&!selected();SET.style.transition="transform .22s ease-out";
    if(from==="home"){if(ok){SET.style.transform="translateX(0)";setTimeout(function(){SET.classList.remove("peek");location.hash="#/settings";},200);}else{SET.style.transform="translateX("+w+"px)";setTimeout(function(){slideReset();SET.hidden=true;},220);}}
    else{if(ok){SET.style.transform="translateX("+w+"px)";setTimeout(function(){closeSettings();},200);}else{SET.style.transform="translateX(0)";setTimeout(slideReset,220);}}}
  document.addEventListener("touchend",end,{passive:true});
  document.addEventListener("touchcancel",function(){if(on&&dir){on=false;slideReset();if(from==="home")SET.hidden=true;}on=false;},{passive:true});
})();
function boot(){loadIndex().then(route).catch(function(){IDX_FAIL=true;if(!SET.hidden)renderIndex();V.innerHTML='<p class="loadmsg">인터넷이 없고 저장된 글도 없습니다. 인터넷에 연결한 뒤 다시 열어 주세요.</p>';});}
/* 글자 크기: 이 기기에서만 기억 */
var fs=19;try{var s0=parseInt(localStorage.getItem("achim-fs"),10);if(s0>=15&&s0<=27)fs=s0;}catch(e){}
function applyFs(){document.documentElement.style.setProperty("--fs",fs+"px");try{localStorage.setItem("achim-fs",fs);}catch(e){}var n=document.getElementById("fs-now");if(n)n.textContent=fs+"px";setTimeout(fit,0);}
function bump(k){fs=Math.max(15,Math.min(27,fs+k));applyFs();}
document.getElementById("fs-up").onclick=function(){bump(2);};document.getElementById("fs-down").onclick=function(){bump(-2);};
document.querySelectorAll("[data-fs]").forEach(function(b){b.onclick=function(){bump(+b.getAttribute("data-fs"));};});
/* 설치 — 새봄묵상 v2.0.3/v2.2.0 방식: 안드로이드 = beforeinstallprompt 한 번 눌러 설치, 아이폰 = 그림 3장, 카카오톡 = 다른 브라우저로 */
var DEFER=null,INSTALLED=false,GUIDE=false;
var UA=navigator.userAgent,KAKAO=/KAKAOTALK/i.test(UA),IOS=/iPad|iPhone|iPod/.test(UA)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
/* 아이패드 (1.3.0): 사파리 공유 버튼이 화면 아래가 아니라 주소창 오른쪽 위(또는 「…」 안) — 아이폰 그림 대신 아이패드 글 안내. 아이패드 사파리는 데스크톱 모드에서 Macintosh 로 보이므로 터치 수로 가린다 */
var IPAD=IOS&&(/iPad/.test(UA)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1));
/* 사파리가 아닌 iOS 브라우저(크롬 CriOS·파이어폭스 FxiOS·엣지 EdgiOS·네이버·웨일·인스타·페이스북·라인 등) = 사파리로 열라고 알린다 */
var NOTSAFARI=IOS&&(/CriOS|FxiOS|EdgiOS|OPiOS|NAVER|Whale|Instagram|FBAN|FBAV|Line\//.test(UA)||!/Safari\//.test(UA));
function openExternal(){location.href="kakaotalk://web/openExternal?url="+encodeURIComponent(location.href);}
document.getElementById("inst-kakao-btn").addEventListener("click",openExternal);
var IB_KEY="achim-ib",IB_DAYS=7;
function ibDismissed(){try{var t=+localStorage.getItem(IB_KEY);return t>0&&Date.now()-t<IB_DAYS*864e5;}catch(e){return false;}}
function ibDismiss(){try{localStorage.setItem(IB_KEY,String(Date.now()));}catch(e){}instUI();}
document.getElementById("ib-x").addEventListener("click",ibDismiss);
function isStandalone(){return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;}
function prompt1(after){var e=DEFER;DEFER=null;try{e.prompt();}catch(err){}Promise.resolve(e.userChoice).then(function(c){if(c&&c.outcome==="accepted")INSTALLED=true;else if(after)after();},function(){}).then(instUI);}
document.getElementById("ib-go").addEventListener("click",function(){if(DEFER)prompt1(ibDismiss);});
window.addEventListener("beforeinstallprompt",function(ev){ev.preventDefault();DEFER=ev;instUI();});
window.addEventListener("appinstalled",function(){DEFER=null;INSTALLED=true;GUIDE=false;instUI();});
document.getElementById("inst-btn").addEventListener("click",function(){if(DEFER){prompt1();return;}GUIDE=!GUIDE;instUI();if(GUIDE){var g=document.getElementById(IPAD?"g-ipad":IOS?"g-ios":"g-android");setTimeout(function(){g.scrollIntoView({block:"nearest"});},30);}});
function instUI(){var sa=isStandalone(),done=sa||INSTALLED,b=document.getElementById("inst-btn"),d=document.getElementById("inst-done");
  d.hidden=!done;d.textContent=sa?"이미 설치되어 있습니다. 홈 화면 아이콘으로 열려 있습니다.":"설치되었습니다. 홈 화면의 아침한권 아이콘으로 여세요.";
  document.getElementById("inst-kakao").hidden=!KAKAO||done;b.hidden=done||KAKAO;b.setAttribute("aria-expanded",String(GUIDE));
  document.getElementById("g-android").hidden=!(GUIDE&&!IOS)||done;document.getElementById("g-ios").hidden=!(GUIDE&&IOS&&!IPAD)||done;document.getElementById("g-ipad").hidden=!(GUIDE&&IPAD)||done;
  var bn=document.getElementById("ibanner"),ios=IOS&&!done,and=!IOS&&!!DEFER&&!done;bn.hidden=!(!KAKAO&&!ibDismissed()&&(ios||and));
  document.getElementById("ib-go").hidden=!and;document.getElementById("ib-ios").hidden=!ios||IPAD||NOTSAFARI;document.getElementById("ib-ipad").hidden=!ios||!IPAD;document.getElementById("ib-ipad-steps").hidden=NOTSAFARI;document.getElementById("ib-notsafari").hidden=!ios||!NOTSAFARI;}
/* 사파리가 아닌 브라우저: 주소를 보여 주고 복사 단추(R1-5) */
var APP_URL=location.origin+location.pathname;document.getElementById("ib-url").textContent=APP_URL;
document.getElementById("ib-copy").addEventListener("click",function(){var b=this;function ok(){b.textContent="복사했습니다";}function fb(){var r=document.createRange();r.selectNodeContents(document.getElementById("ib-url"));var s=getSelection();s.removeAllRanges();s.addRange(r);try{if(document.execCommand("copy"))ok();else b.textContent="길게 눌러 복사하세요";}catch(e){b.textContent="길게 눌러 복사하세요";}}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(APP_URL).then(ok,fb);else fb();});
document.getElementById("ver").textContent="아침한권 앱 "+APP_VER;
instUI();applyFs();boot();
/* 서비스워커: 껍데기 저장 + 최근 14일 글 저장(오프라인). 앱으로 돌아올 때마다 목록을 다시 받는다 */
if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});
  navigator.serviceWorker.addEventListener("message",function(ev){if(ev.data&&ev.data.type==="achim:new-day")loadIndex().then(function(){RENDERED=null;return route();}).catch(function(){});});}
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible"&&IDX){var was=IDX.latest;loadIndex().then(function(j){if(j.latest!==was){RENDERED=null;route();}}).catch(function(){});}});
