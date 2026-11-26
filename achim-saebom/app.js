/* 아침한권 성도판 앱 1.5.0 (댓글 켜짐 — 우리 Cloudflare Worker achim-saebom-comments) · 1.4.0 (지난 글 찾기 5탭·밑줄, 오너 지시 2026-11-23) · 1.3.0 (아이패드 설치 안내·색인·홈→설정 밀기, 오너 지시 2026-11-23) · 1.2.0 (머리줄 고정·탭 줄 삭제·한 줄 재생기·빨간 MORNING 아이콘, 오너 지시 2026-11-22) — 새봄묵상 앱(saebom/app)의 설치 배너·아이폰 안내·카카오톡 바깥 열기·글자 크기·서비스워커 방식을 따른다 */
"use strict";
var APP_VER="1.5.0";
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
  var VD=visDays(),i=VD.findIndex(function(x){return x.id===d.id;}),newer=i>0?VD[i-1]:null,older=i>=0?VD[i+1]:null;
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
  cmHTML()+
  '<div class="pager three"><a class="btn" '+(older?'href="#/'+older.id+'"':'aria-disabled="true"')+'>← 이전 글</a>'+
  (i>0?'<a class="btn" href="#/today">오늘 글</a>':'<span class="btn cur" aria-current="page">오늘 글</span>')+
  '<a class="btn" '+(newer?'href="#/'+newer.id+'"':'aria-disabled="true"')+'>다음 글 →</a></div>'+
  '<p class="hint">문장을 길게 누르거나 드래그하면 화면 아래에 ‘밑줄 긋기’ 버튼이 나타납니다. 밑줄 친 문장을 누르면 지울 수 있습니다.</p>'+
  archHTML();
  document.title="아침한권 · Day "+d.day+" "+d.book;CUR=d;fit();wirePlayer(d);applyHl();renderArch();wireCm(d);
  if(ARCH_JUMP){ARCH_JUMP=false;setTimeout(function(){var a=V.querySelector(".arch");if(a)a.scrollIntoView({block:"start"});},0);}
}
/* 듣기 — 새봄묵상 재생기 방식: 속도 0.8/1.0/1.2/1.5(처음 = 보통, 기기에 기억), 15초 앞뒤, 처음으로, 여성/남성, 이어 듣기(날·목소리마다 위치 기억) */
var RATES=[[0.8,"천천히"],[1,"보통"],[1.2,"조금 빠르게"],[1.5,"빠르게"]],RATE=1,VOICE="f";
try{var r0=parseFloat(localStorage.getItem("achim-saebom-rate"));if(RATES.some(function(x){return x[0]===r0;}))RATE=r0;var v0=localStorage.getItem("achim-saebom-voice");if(v0==="f"||v0==="m")VOICE=v0;}catch(e){}
function fmtT(t){t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+":"+String(t%60).padStart(2,"0");}
function pickVoice(d){var vs=d.voices||[];return vs.filter(function(v){return v.key===VOICE;})[0]||vs[0]||null;}
function posKey(d,v){return "achim-saebom-pos:"+d.id+":"+v.key;}
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
  document.getElementById("rate").addEventListener("change",function(ev){var r=parseFloat(ev.target.value);if(RATES.some(function(x){return x[0]===r;}))RATE=r;try{localStorage.setItem("achim-saebom-rate",String(RATE));}catch(e){}applyRate(a);});
  document.querySelectorAll(".vsel button[data-voice]").forEach(function(b){b.addEventListener("click",function(){if(b.dataset.voice===v.key)return;var was=!a.paused;a.pause();VOICE=b.dataset.voice;try{localStorage.setItem("achim-saebom-voice",VOICE);}catch(e){}
    renderDay(d);if(was){var n=document.getElementById("player");if(n)n.play().catch(function(){});}});});
}
/* ── 1.4.0 지난 글 찾기 (오너 지시 2026-11-23 「지난글 찾기 기능을 넣어라」 — claude.ai 아티팩트판과 같은 5탭) ──
   날짜순 = 최근 글부터 · 책별 = 책마다 묶음(지금 읽는 책 펼침) · 읽을 책 = 읽기 순서(누를 수 없음) · 내 밑줄 · 내 댓글 = 이 기기에서 남긴 것.
   목록은 data/index.json 에서만 만든다. 날짜가 오늘(한국 시각)보다 뒤인 글은 목록에 넣지 않는다 */
var ARCH_JUMP=false,CUR=null,TAB="date",TABS=[["date","날짜순"],["book","책별"],["queue","읽을 책"],["hl","내 밑줄"],["cm","내 댓글"]];
try{var t0=localStorage.getItem("achim-saebom-tab");if(TABS.some(function(x){return x[0]===t0;}))TAB=t0;}catch(e){}
function todayKST(){var n=new Date(Date.now()+9*3600e3);return n.toISOString().slice(0,10);}
function visDays(){var t=todayKST();return IDX.days.filter(function(x){return x.date<=t;});}
function latestVis(){var v=visDays();return v.length?v[0].id:null;}
function isVis(id){return visDays().some(function(x){return x.id===id;});}
function md(iso){var p=iso.split("-");return (+p[1])+"."+p[2];}
function archHTML(){return '<nav class="arch" aria-label="지난 글 찾기"><h3>지난 글 찾기</h3><div class="tabs" role="tablist">'+
  TABS.map(function(x){return '<button type="button" role="tab" id="tab-'+x[0]+'" data-tab="'+x[0]+'" aria-selected="'+(x[0]===TAB)+'" aria-controls="archive">'+x[1]+'</button>';}).join("")+
  '</div><div id="archive" role="tabpanel"></div></nav>';}
function itemHTML(x){var on=CUR&&CUR.id===x.id;return '<li><a class="item" href="#/'+x.id+'"'+(on?' aria-current="page"':'')+'><span class="d">'+md(x.date)+'</span><span class="t"><span class="tt">'+esc(x.theme||x.book)+'</span><small>'+esc(x.book)+(x.part_no?' · '+esc(x.part_no)+'회':'')+'</small></span><span class="tag">Day '+x.day+'</span></a></li>';}
function renderArch(){var box=document.getElementById("archive");if(!box||!IDX)return;
  document.querySelectorAll(".arch .tabs button").forEach(function(b){b.setAttribute("aria-selected",String(b.dataset.tab===TAB));if(!b.onclick)b.onclick=function(){TAB=b.dataset.tab;try{localStorage.setItem("achim-saebom-tab",TAB);}catch(e){}renderArch();};});
  var vd=visDays(),byId={};vd.forEach(function(x){byId[x.id]=x;});
  if(TAB==="date"){box.innerHTML=vd.length?'<ul>'+vd.map(itemHTML).join("")+'</ul>':'<p class="empty">아직 쌓인 글이 없습니다.</p>';}
  else if(TAB==="book"){var gs=IDX.queue.filter(function(b){return b.days.some(function(id){return byId[id];});}).reverse();
    box.innerHTML=gs.length?gs.map(function(b){var its=b.days.filter(function(id){return byId[id];}).map(function(id){return byId[id];}).reverse();
      return '<details'+(CUR&&CUR.book===b.book?' open':'')+'><summary><span>'+esc(b.book)+' <span class="n">'+esc(b.author)+' · '+its.length+'편</span></span></summary><ul>'+its.map(itemHTML).join("")+'</ul></details>';}).join(""):'<p class="empty">아직 쌓인 글이 없습니다.</p>';}
  else if(TAB==="queue"){var s=IDX.queue.filter(function(q){return (q.status||"upcoming")==="upcoming";}).sort(function(a,b){return a.order-b.order;}),last=null,n=0,h='<p class="msg">다음에 읽을 책 '+s.length+'권 · 읽는 순서대로 하루 한 편씩 이어집니다.</p>';
    s.forEach(function(q){n++;var g=q.series||q.recommender||"";if(g!==last){h+=(last===null?"":"</ul>")+'<p class="grp">'+esc(g)+'</p><ul>';last=g;}
      var st="upcoming",mk=n,rt=q.S+"회";
      h+='<li class="q '+st+'"><span class="m">'+mk+'</span><span class="b">'+esc(q.book)+'<small>'+esc(q.author||"")+'</small></span><span class="s">'+esc(rt)+'</span></li>';});
    box.innerHTML=s.length?h+"</ul>":'<p class="empty">다음에 읽을 책이 아직 정해지지 않았습니다.</p>';}
  else if(TAB==="hl"){var hs=vd.map(function(x){return [x,hlGet(x.id)];}).filter(function(p){return p[1].length;});
    box.innerHTML=hs.length?hs.map(function(p){var x=p[0];return '<div class="hlg"><a class="item" href="#/'+x.id+'"><span class="d">'+md(x.date)+'</span><span class="t"><span class="tt">'+esc(x.book)+'</span><small>Day '+x.day+(x.theme?' · '+esc(x.theme):'')+'</small></span><span class="tag">'+p[1].length+'줄</span></a><ul class="hll">'+p[1].map(function(it){return '<li>'+esc(it.q)+'</li>';}).join("")+'</ul></div>';}).join("")
      :'<p class="empty">아직 밑줄이 없습니다. 글을 읽다가 마음에 남는 문장을 길게 누르거나 드래그하면 ‘밑줄 긋기’ 버튼이 나타납니다. 밑줄은 이 기기에만 저장됩니다.</p>';}
  else{renderMyCm(box,byId);}
}
/* ── 밑줄 (아티팩트판과 같은 최소 기능): 글 안 문장을 고르면 화면 맨 아래 띠에 「밑줄 긋기」 · 밑줄 친 문장을 누르면 「밑줄 지우기」.
   이 기기에만 저장(localStorage "achim-saebom-hl:<글 id>") — 서버로 보내지 않는다 */
function hlGet(id){try{var a=JSON.parse(localStorage.getItem("achim-saebom-hl:"+id)||"[]");return Array.isArray(a)?a.filter(function(i){return i&&typeof i.q==="string";}):[];}catch(e){return [];}}
function hlSet(id,a){try{if(a.length)localStorage.setItem("achim-saebom-hl:"+id,JSON.stringify(a));else localStorage.removeItem("achim-saebom-hl:"+id);return true;}catch(e){return false;}}
var HLB=document.createElement("div");HLB.className="hlbar";HLB.hidden=true;HLB.setAttribute("role","region");HLB.setAttribute("aria-label","밑줄");
HLB.innerHTML='<div class="pv"></div><button type="button" class="hlbtn"></button><button type="button" class="hlx" aria-label="닫기">✕</button>';
document.body.appendChild(HLB);
var HLPV=HLB.querySelector(".pv"),HLBTN=HLB.querySelector(".hlbtn"),HLMODE="",HLQ=[];
var HLBLK="article p,article li,article .chal div";
function hlHide(){HLB.hidden=true;HLMODE="";HLQ=[];}
function hlShow(mode,qs,extra){HLMODE=mode;HLQ=qs;HLBTN.textContent=mode==="add"?"밑줄 긋기":"밑줄 지우기";var q=(qs[0]&&qs[0].q)||"";HLPV.innerHTML="";var b=document.createElement("b");b.textContent=q.length>70?q.slice(0,70)+"…":q;HLPV.appendChild(b);if(extra)HLPV.appendChild(document.createTextNode(" "+extra));HLB.hidden=false;}
function leafBlocks(art){return Array.prototype.filter.call(art.querySelectorAll("p,li,.chal div"),function(bl){return !bl.querySelector("p,li,.chal div");});}
/* 밑줄 위치 = 문단 번호(b) + 그 문단 안 글자 위치(o) — 같은 낱말이 여러 문단에 있어도 고른 그 자리에 긋는다(리뷰 R1-1) */
function sq(s){return String(s).replace(/\s+/g," ");}
function selPieces(sel,art){var r=sel.getRangeAt(0),out=[];leafBlocks(art).forEach(function(bl,bi){if(!r.intersectsNode(bl))return;var sub=document.createRange();sub.selectNodeContents(bl);
  if(sub.compareBoundaryPoints(Range.START_TO_START,r)<0)sub.setStart(r.startContainer,r.startOffset);if(sub.compareBoundaryPoints(Range.END_TO_END,r)>0)sub.setEnd(r.endContainer,r.endOffset);
  var pre=document.createRange();pre.selectNodeContents(bl);pre.setEnd(sub.startContainer,sub.startOffset);
  var ps=sq(pre.toString()),raw=sq(sub.toString()),t=raw.trim(),o=ps.length;if(ps.slice(-1)===" "&&raw.charAt(0)===" ")o-=1;if(raw.charAt(0)===" ")o+=1;
  if(t.length>=2&&t.length<=600)out.push({q:t,b:bi,o:o});});return out;}
var HLGUARD=0;
function onSel(){var sel=window.getSelection&&window.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount){if(HLMODE!=="remove"&&Date.now()-HLGUARD>800)hlHide();return;}
  var art=V.querySelector("article");if(!art||!CUR||!art.contains(sel.anchorNode)||!art.contains(sel.focusNode)){hlHide();return;}
  var ps=selPieces(sel,art);if(!ps.length){hlHide();return;}hlShow("add",ps,ps.length>1?"외 "+(ps.length-1)+"문단":"");}
document.addEventListener("selectionchange",function(){clearTimeout(onSel.t);onSel.t=setTimeout(onSel,250);});
HLB.addEventListener("mousedown",function(ev){ev.preventDefault();});
/* 아이폰: 띠를 누르는 순간 선택이 풀려도 띠를 지우지 않는다(리뷰 R1-2) · 손가락은 떼는 순간(touchend/pointerup) 실행, 마우스·키보드는 click */
function hlGuard(){HLGUARD=Date.now();}
HLB.addEventListener("touchstart",hlGuard,{passive:true});HLB.addEventListener("pointerdown",hlGuard);
var HLDONE=0;function hlAct(ev){if(Date.now()-HLDONE<700)return;HLDONE=Date.now();if(ev&&ev.cancelable)ev.preventDefault();hlRun();}
function inBtn(ev){var t=ev.changedTouches&&ev.changedTouches[0];if(!t||t.clientX==null)return true;var el=document.elementFromPoint(t.clientX,t.clientY);return !el||HLBTN.contains(el);}
HLBTN.addEventListener("touchend",function(ev){if(inBtn(ev))hlAct(ev);});
/* 띠를 눌렀다가 「밑줄 긋기」 밖에서 손을 떼었고 선택도 풀렸으면 띠를 닫는다(리뷰 R2-4) */
HLB.addEventListener("touchend",function(ev){if(inBtn(ev))return;setTimeout(function(){var s=window.getSelection&&window.getSelection();if(HLMODE==="add"&&(!s||s.isCollapsed))hlHide();},60);},{passive:true});HLBTN.addEventListener("pointerup",function(ev){if(ev.pointerType&&ev.pointerType!=="mouse")hlAct(ev);});
var TOAST=document.createElement("p");TOAST.className="hltoast";TOAST.setAttribute("role","status");TOAST.hidden=true;document.body.appendChild(TOAST);
function toast(t){TOAST.textContent=t;TOAST.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){TOAST.hidden=true;},1800);}
HLB.querySelector(".hlx").onclick=function(){hlHide();try{window.getSelection().removeAllRanges();}catch(e){}};
HLBTN.onclick=function(){if(Date.now()-HLDONE<700)return;HLDONE=Date.now();hlRun();};
function hlRun(){var m=HLMODE,qs=HLQ.slice();hlHide();try{window.getSelection().removeAllRanges();}catch(e){}if(!CUR||!qs.length)return;
  /* 같은 밑줄 = 같은 글귀·같은 문단·같은 자리(예전 글귀만 저장된 밑줄은 글귀로) — 한 문단에 같은 낱말 두 번도 따로 저장·따로 지운다(리뷰 R2-2) */
  var a=hlGet(CUR.id),at=new Date().toISOString(),n0=a.length,same=function(i,p){if(i.q!==p.q)return false;if(i.b==null||p.b==null)return true;return i.b===p.b&&(i.o==null||p.o==null||i.o===p.o);};
  if(m==="add")qs.forEach(function(p){if(!a.some(function(i){return same(i,p);}))a.push({q:p.q,b:p.b,o:p.o,at:at});});
  else{var p=qs[0],best=-1,bd=1e9;a.forEach(function(i,k){if(i.q!==p.q||(i.b!=null&&p.b!=null&&i.b!==p.b))return;var d=(i.o==null||p.o==null)?0:Math.abs(i.o-p.o);if(d<bd){bd=d;best=k;}});if(best>=0)a.splice(best,1);}
  if(a.length===n0){toast(m==="add"?"이미 밑줄이 있습니다":"지울 밑줄을 찾지 못했습니다");return;}
  if(!hlSet(CUR.id,a)){hlShow(m,qs,"— 저장하지 못했습니다(기기 저장 공간)");return;}applyHl();if(TAB==="hl")renderArch();toast(m==="add"?"밑줄을 그었습니다":"밑줄을 지웠습니다");}
document.addEventListener("click",function(ev){if(HLB.contains(ev.target))return;var m=ev.target.closest&&ev.target.closest("mark.hl");if(!m){if(HLMODE==="remove")hlHide();return;}hlShow("remove",[{q:m.dataset.q,b:m.dataset.b===""||m.dataset.b==null?null:+m.dataset.b,o:m.dataset.o===""||m.dataset.o==null?null:+m.dataset.o}]);});
function applyHl(){var art=V.querySelector("article");if(!art||!CUR)return;art.querySelectorAll("mark.hl").forEach(function(m){var p=m.parentNode;while(m.firstChild)p.insertBefore(m.firstChild,m);p.removeChild(m);});art.normalize();
  var bl=leafBlocks(art);hlGet(CUR.id).forEach(function(it){var hb=typeof it.b==="number"?it.b:null;if(hb!=null&&bl[hb]&&wrapText(bl[hb],it.q,it.o,hb))return;for(var k=0;k<bl.length;k++){if(wrapText(bl[k],it.q,null,hb))break;}});}
/* 자리는 문단의 전체 글(이미 그은 밑줄 안 글 포함)로 센다 — 한 문단 여러 밑줄도 제자리(리뷰 R2-3). 이미 그은 밑줄과 겹치면 긋지 않는다 */
function wrapText(root,q,want,bi){var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[],n;while((n=w.nextNode()))nodes.push(n);
  var full="",map=nodes.map(function(nd){var s=full.length;full+=nd.nodeValue;return {node:nd,start:s};}),norm=[],ix=[],sp=false;
  for(var i=0;i<full.length;i++){var ch=full[i];if(/\s/.test(ch)){if(sp)continue;norm.push(" ");ix.push(i);sp=true;}else{norm.push(ch);ix.push(i);sp=false;}}
  var ns=norm.join(""),pos=ns.indexOf(q);if(pos<0)return false;
  if(typeof want==="number"){var best=pos,p=pos;while(p>=0){if(Math.abs(p-want)<Math.abs(best-want))best=p;p=ns.indexOf(q,p+1);}pos=best;}var s=ix[pos],e=ix[pos+q.length-1]+1;
  function find(o){for(var i=map.length-1;i>=0;i--){if(o>=map[i].start)return {node:map[i].node,off:Math.min(o-map[i].start,map[i].node.nodeValue.length)};}return null;}
  var a=find(s),b=find(e);if(!a||!b)return false;
  try{var r=document.createRange();r.setStart(a.node,a.off);r.setEnd(b.node,b.off);
    var marks=root.querySelectorAll("mark.hl");for(var mi=0;mi<marks.length;mi++){if(r.intersectsNode(marks[mi]))return false;}
    var mk=document.createElement("mark");mk.className="hl";mk.dataset.q=q;mk.dataset.b=bi==null?"":String(bi);mk.dataset.o=String(pos);mk.appendChild(r.extractContents());r.insertNode(mk);return true;}catch(err){return false;}}
/* ── 1.4.0 댓글 (오너 지시 2026-11-23 「댓글 기능을 넣어라」): 우리 Cloudflare Worker(제3자 스크립트 아님) · 로그인 없음 · 별명(없으면 익명)·글(500자)·날짜만.
   기기 표시 = 이 기기에서 만든 무작위 값(서버는 그 해시만 저장) — 「내 댓글」과 내가 쓴 글 지우기에만 쓴다. COMMENTS_API 가 비어 있으면 댓글 칸을 숨긴다 */
var COMMENTS_API="https://achim-saebom-comments.saebom-achim.workers.dev";
var CM_MAX=500,CM_NICK=20;
function devId(){var k="achim-saebom-dev",v=null;try{v=localStorage.getItem(k);}catch(e){}if(v&&/^[0-9a-f]{32}$/.test(v))return v;var b=new Uint8Array(16);crypto.getRandomValues(b);v=Array.prototype.map.call(b,function(x){return ("0"+x.toString(16)).slice(-2);}).join("");try{localStorage.setItem(k,v);}catch(e){}return v;}
function adminTok(){try{return localStorage.getItem("achim-saebom-admin")||"";}catch(e){return "";}}
/* 관리자 주소: …/achim-saebom/#admin=<비밀값> 으로 한 번 열면 이 기기가 관리자 모드(모든 댓글에 삭제). 비밀값은 서버로만 간다 */
(function(){if(!COMMENTS_API)return;var m=/^#admin=([A-Za-z0-9_-]{16,128})$/.exec(location.hash||"");if(m){try{localStorage.setItem("achim-saebom-admin",m[1]);}catch(e){}history.replaceState(null,"",location.pathname+location.search+"#/today");}})();
function api(path,opt){opt=opt||{};var h={"X-Achim-Device":devId()};if(opt.body)h["Content-Type"]="application/json";if(opt.admin)h["Authorization"]="Bearer "+adminTok();
  return fetch(COMMENTS_API+path,{method:opt.method||"GET",headers:h,body:opt.body?JSON.stringify(opt.body):undefined,cache:"no-store",credentials:"omit",mode:"cors"}).then(function(r){return r.json().catch(function(){return {};}).then(function(j){j.status=r.status;return j;});});}
function fmtWhen(iso){var t=new Date(iso);if(isNaN(t))return "";return (t.getMonth()+1)+"."+String(t.getDate()).padStart(2,"0")+" "+String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0");}
var CM_ERR={rate_min:"조금 천천히 남겨 주세요. 1분에 5개까지 남길 수 있습니다.",rate_day:"오늘은 이 기기에서 더 남길 수 없습니다(하루 30개까지).",banned:"쓸 수 없는 낱말이 들어 있습니다. 고쳐서 다시 남겨 주세요.",empty:"댓글 내용을 적어 주세요.",too_long:"댓글은 500자까지 남길 수 있습니다.",bad_day:"이 글에는 댓글을 남길 수 없습니다.",link:"광고 방지를 위해 인터넷 주소는 남길 수 없습니다.",rate_busy:"지금은 댓글이 많이 몰려 있습니다. 잠시 후 다시 남겨 주세요."};
function cmHTML(){if(!COMMENTS_API)return "";var nick="";try{nick=localStorage.getItem("achim-saebom-nick")||"";}catch(e){}
  return '<section class="cm" id="cm" aria-label="댓글"><div class="hdrow"><h2>댓글 <span class="cnt" id="cmCount"></span></h2>'+(adminTok()?'<button type="button" class="mybtn" id="cmAdminOff">관리자 모드 끄기</button>':'')+'</div>'+
  '<ul id="cmList"></ul><p class="msg" id="cmEmpty">댓글을 불러오는 중…</p>'+
  '<form id="cmForm"><input id="cmNick" maxlength="'+CM_NICK+'" autocomplete="nickname" placeholder="별명 (비워 두면 익명)" aria-label="별명" value="'+esc(nick)+'">'+
  '<textarea id="cmText" maxlength="'+CM_MAX+'" placeholder="오늘 글에 대한 생각, 실천한 도전, 기도를 남겨 보세요." aria-label="댓글"></textarea>'+
  '<div class="row2"><span class="msg" id="cmMsg" role="status"></span><button class="go" type="submit" id="cmGo">댓글 남기기</button></div></form></section>';}
function cmList(d){var ul=document.getElementById("cmList"),em=document.getElementById("cmEmpty"),cnt=document.getElementById("cmCount");if(!ul)return;
  if(navigator.onLine===false){ul.innerHTML="";cnt.textContent="";em.hidden=false;em.textContent="인터넷 연결 후 표시됩니다.";return;}
  api("/v1/comments?day="+encodeURIComponent(d.id)).then(function(j){if(!CUR||CUR.id!==d.id)return;if(!j.ok)throw 0;var L=j.comments||[];
    cnt.textContent=L.length?String(L.length):"";em.hidden=L.length>0;em.textContent="아직 댓글이 없습니다. 오늘 글을 읽고 든 생각이나 실천한 것을 남겨 보세요.";ul.innerHTML="";
    L.forEach(function(c){var li=document.createElement("li"),hd=document.createElement("div"),who=document.createElement("span"),when=document.createElement("span"),tx=document.createElement("p");
      hd.className="hd";who.className="who";who.textContent=(c.nick||"익명")+(c.mine?" (나)":"");when.className="when";when.textContent=fmtWhen(c.at);hd.appendChild(who);hd.appendChild(when);
      if(c.mine||adminTok()){var del=document.createElement("button");del.type="button";del.className="del";del.textContent="삭제";
        del.onclick=function(){if(del.dataset.ok!=="1"){del.dataset.ok="1";del.textContent="삭제할까요? 한 번 더 누르기";setTimeout(function(){del.dataset.ok="";del.textContent="삭제";},4000);return;}
          del.disabled=true;var adm=!c.mine&&adminTok();api(adm?"/v1/admin/comments/"+encodeURIComponent(c.id):"/v1/comments/"+encodeURIComponent(c.id),{method:"DELETE",admin:adm}).then(function(r){if(!r.ok)throw 0;myCmDrop(c.id);cmList(d);if(TAB==="cm")renderArch();}).catch(function(){del.disabled=false;del.textContent="삭제하지 못했습니다";});};
        hd.appendChild(del);}
      tx.className="tx";tx.textContent=c.text;li.appendChild(hd);li.appendChild(tx);ul.appendChild(li);});
  }).catch(function(){if(!CUR||CUR.id!==d.id)return;ul.innerHTML="";cnt.textContent="";em.hidden=false;em.textContent=navigator.onLine===false?"인터넷 연결 후 표시됩니다.":"지금은 댓글을 불러올 수 없습니다. 잠시 후 다시 해 보세요.";});}
function wireCm(d){if(!COMMENTS_API)return;var f=document.getElementById("cmForm");if(!f)return;cmList(d);
  var off=document.getElementById("cmAdminOff");if(off)off.onclick=function(){try{localStorage.removeItem("achim-saebom-admin");}catch(e){}RENDERED=null;route();};
  f.addEventListener("submit",function(ev){ev.preventDefault();var ta=document.getElementById("cmText"),msg=document.getElementById("cmMsg"),go=document.getElementById("cmGo"),nk=document.getElementById("cmNick").value.trim().slice(0,CM_NICK),text=ta.value.trim();
    function say(t,err){msg.textContent=t;msg.classList.toggle("err",!!err);}
    if(!text){say(CM_ERR.empty,1);return;}if(text.length>CM_MAX){say(CM_ERR.too_long,1);return;}
    try{localStorage.setItem("achim-saebom-nick",nk);}catch(e){}
    go.disabled=true;say("남기는 중입니다…");
    api("/v1/comments",{method:"POST",body:{day:d.id,nick:nk,text:text}}).then(function(j){if(j.ok){ta.value="";say("댓글을 남겼습니다.");myCmAdd(j.comment);cmList(d);if(TAB==="cm")renderArch();}else say(CM_ERR[j.error]||"남기지 못했습니다. 잠시 후 다시 해 보세요.",1);})
      .catch(function(){say(navigator.onLine===false?"인터넷에 연결된 뒤 다시 남겨 주세요.":"지금은 댓글을 남길 수 없습니다. 잠시 후 다시 해 보세요.",1);}).then(function(){go.disabled=false;});});}
/* 내 댓글: 서버의 이 기기 댓글(GET /v1/mine) — 인터넷이 없으면 마지막으로 받은 목록(이 기기 저장) */
function myCmGet(){try{var a=JSON.parse(localStorage.getItem("achim-saebom-mycm")||"[]");return Array.isArray(a)?a:[];}catch(e){return [];}}
function myCmPut(a){try{localStorage.setItem("achim-saebom-mycm",JSON.stringify(a.slice(0,300)));}catch(e){}}
function myCmAdd(c){if(!c||!c.id)return;var a=myCmGet().filter(function(x){return x.id!==c.id;});a.unshift({id:c.id,day:c.day,nick:c.nick,text:c.text,at:c.at});myCmPut(a);}
function myCmDrop(id){myCmPut(myCmGet().filter(function(x){return x.id!==id;}));}
function renderMyCm(box,byId){if(!COMMENTS_API){box.innerHTML='<p class="empty">댓글 기능은 준비 중입니다.</p>';return;}
  function draw(L,note){var mine=L.filter(function(c){return byId[c.day];}).sort(function(a,b){return String(b.at).localeCompare(String(a.at));});
    if(!mine.length){box.innerHTML='<p class="empty">'+(note||"아직 남긴 댓글이 없습니다. 글 아래 댓글 칸에 생각을 남겨 보세요.")+'</p>';return;}
    box.innerHTML='<p class="msg">이 기기에서 남긴 댓글 '+mine.length+'개 · 누르면 그 글로 갑니다.'+(note?' '+esc(note):'')+'</p>'+mine.map(function(c){var x=byId[c.day];
      return '<div class="cmg"><a class="item" href="#/'+x.id+'"><span class="d">'+esc(fmtWhen(c.at))+'</span><span class="t"><span class="tt">'+esc(x.book)+'</span><small>Day '+x.day+(x.theme?' · '+esc(x.theme):'')+'</small></span><span class="tag">글 보기</span></a><p class="tx2">'+esc(c.text)+'</p></div>';}).join("");}
  draw(myCmGet(),navigator.onLine===false?"(인터넷 연결 후 새로 고칩니다)":"");
  if(navigator.onLine===false)return;
  api("/v1/mine").then(function(j){if(!j.ok)throw 0;myCmPut(j.comments||[]);if(TAB==="cm"&&document.getElementById("archive")===box)draw(j.comments||[]);}).catch(function(){});}
/* 탭 줄이 없어졌으므로 목록 위에 오늘 글로 돌아가는 링크 */
var BACK='<a class="back" href="#/today">← 오늘 글로</a>';
function renderDate(){
  var vd=visDays();V.innerHTML=BACK+'<h1 class="ptitle">날짜순</h1><p class="small">모두 '+vd.length+'편 · 최근 글부터</p><ul class="list">'+vd.map(function(x){
    return '<li><a href="#/'+x.id+'"><span class="d">'+sdate(x.date)+'<br>Day '+x.day+'</span><span class="t"><small>'+esc(x.book)+' ('+esc(x.part_no)+')</small><span>'+esc(x.theme)+'</span></span></a></li>';}).join("")+'</ul>';
}
function prog(b){var p=b.S?Math.round(100*b.j/b.S):0;return '<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="'+b.S+'" aria-valuenow="'+b.j+'" aria-label="'+esc(b.book)+' '+b.j+'/'+b.S+'"><i style="width:'+p+'%"></i></div>';}
var ST={reading:"읽는 중",upcoming:"읽을 책",done:"다 읽음"};
function renderBook(){
  var groups=[],seen={};
  IDX.queue.filter(function(b){return b.days.length;}).forEach(function(b){if(!seen[b.series]){seen[b.series]=[];groups.push([b.series,seen[b.series]]);}seen[b.series].push(b);});
  V.innerHTML=BACK+'<h1 class="ptitle">책별</h1><p class="small">읽은 책과 읽는 중인 책 · 회차를 누르면 그날 글이 열립니다</p>'+groups.map(function(g){
    return '<p class="series">'+esc(g[0])+'</p>'+g[1].map(function(b){return '<div class="card book"><div class="bt"><b>'+esc(b.book)+'</b><em>'+b.j+'/'+b.S+'</em></div><div class="by">'+esc(b.author)+' · '+esc(b.recommender)+' 추천 · <span class="tag '+b.status+'">'+ST[b.status]+'</span></div>'+prog(b)+
      '<div class="chips">'+b.days.filter(isVis).map(function(id,k){var x=IDX.days.find(function(y){return y.id===id;});return '<a href="#/'+id+'">'+esc(x?x.part_no:(k+1))+'</a>';}).join("")+'</div></div>';}).join("");}).join("");
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
    if(IDX&&!RENDERED&&latestVis()){RENDERED="today";loadDay(latestVis()).then(renderDay).catch(function(){});}return Promise.resolve();}
  SET_FROM=null;hlHide();
  if(!IDX)return Promise.resolve();
  /* 설정을 닫고 같은 화면으로 돌아오면 다시 그리지 않는다(듣던 음성·읽던 자리 그대로) */
  if(prev==="settings"&&h===RENDERED)return Promise.resolve();
  RENDERED=h;
  var p;
  if(h!=="today"&&!/^d\d{4}$/.test(h))CUR=null;
  if(h==="date"){renderDate();p=Promise.resolve();}
  else if(h==="book"){renderBook();p=Promise.resolve();}
  else if(h==="queue"){TAB="queue";try{localStorage.setItem("achim-saebom-tab",TAB);}catch(e){}ARCH_JUMP=true;RENDERED=null;location.replace("#/today");return Promise.resolve();}
  else{var vd=visDays(),lt=vd.length?vd[0].id:null,id=/^d\d{4}$/.test(h)&&vd.some(function(x){return x.id===h;})?h:lt;
    if(!id){V.innerHTML='<p class="loadmsg">아직 공개된 글이 없습니다.</p>';window.scrollTo(0,0);return Promise.resolve();}
    p=loadDay(id).then(renderDay).catch(function(){V.innerHTML='<p class="loadmsg">이 글은 아직 이 기기에 저장되어 있지 않습니다. 인터넷에 연결한 뒤 다시 열어 주세요.</p>';});}
  window.scrollTo(0,0);return p;
}
var RENDERED=null;
/* 밀기 안내(R1-11): 톱니 단추가 없어졌으므로 터치 기기의 홈 아래에 한 줄 — 설정을 한 번 열면 다시 안 보인다(이 기기에 기억) */
var HINT_KEY="achim-saebom-swhint";
function hintDone(){try{localStorage.setItem(HINT_KEY,"1");}catch(e){}var n=document.getElementById("swhint");if(n)n.hidden=true;}
(function(){var seen=false;try{seen=localStorage.getItem(HINT_KEY)==="1";}catch(e){}var touch=("ontouchstart" in window)||navigator.maxTouchPoints>0;document.getElementById("swhint").hidden=seen||!touch;})();
window.addEventListener("hashchange",route);
/* 색인 (오너 지시 2026-11-22/23): data/index.json 의 index (make_achim_data.py 가 매일 만든다) — 가나다·A-Z 건너뛰기 줄, 책은 회차로 펼침, 읽을 책은 누를 수 없음 */
var IDX_OPEN={},IDX_FAIL=false;
/* 고정된 건너뛰기 줄 아래로 맞춰 스크롤(R1-9) */
function ixScroll(el){var j=document.querySelector("#idx .jump"),off=(parseFloat(getComputedStyle(SET).paddingTop)||0)+(j?j.offsetHeight:0)+8;SET.scrollTop+=el.getBoundingClientRect().top-SET.getBoundingClientRect().top-off;}
function VS(it){return (it.sessions||[]).filter(function(s){return isVis(s.id);});}
function renderIndex(){var box=document.getElementById("idx");if(!box)return;var X=IDX&&IDX.index;if(!X){box.innerHTML='<p class="small">'+(IDX||!IDX_FAIL?'색인을 불러오는 중…':'색인을 불러오지 못했습니다. 인터넷에 연결한 뒤 다시 열어 주세요.')+'</p>';return;}
  var act={};X.active.forEach(function(g){act[g]=1;});
  var jump='<nav class="jump" aria-label="첫 글자로 건너뛰기">'+X.jump.map(function(g){return act[g]?'<a href="#" data-jump="'+esc(g)+'">'+esc(g)+'</a>':'<span aria-disabled="true">'+esc(g)+'</span>';}).join("")+'</nav>';
  var gid=function(g){return "ix-g-"+X.jump.indexOf(g);},bid=function(q){return "ix-b-"+q;};
  var tag='<span class="tag upcoming">읽을 책</span>';
  var body=X.groups.map(function(G){return '<section class="ixg" id="'+gid(G.g)+'" tabindex="-1"><h3>'+esc(G.g)+'</h3><ul class="ixl">'+G.items.map(function(it){
    if(it.t==="book"){
      if(it.status==="upcoming")return '<li class="ixb up" id="'+bid(it.q)+'"><span class="ixt">'+esc(it.label)+'</span> '+tag+'</li>';
      if(!VS(it).length)return '<li class="ixb" id="'+bid(it.q)+'"><span class="ixt">'+esc(it.label)+'</span></li>';
      var open=!!IDX_OPEN[it.q];
      return '<li class="ixb" id="'+bid(it.q)+'"><button type="button" class="ixt" data-q="'+esc(it.q)+'" aria-expanded="'+open+'">'+esc(it.label)+' <em>'+VS(it).length+'회</em></button>'+
        '<ol class="ixs"'+(open?'':' hidden')+'>'+VS(it).map(function(s){return '<li><a href="#/'+esc(s.id)+'">Day '+s.day+' · '+esc(s.part_no)+' · '+esc(s.theme)+'</a></li>';}).join("")+'</ol></li>';}
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
  var SKIP=".player,.bar,button,input,select,textarea,label,summary,audio,[contenteditable],.jump,.ib-steps,.hlbar,.tabs,.cm form";
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
var fs=19;try{var s0=parseInt(localStorage.getItem("achim-saebom-fs"),10);if(s0>=15&&s0<=27)fs=s0;}catch(e){}
function applyFs(){document.documentElement.style.setProperty("--fs",fs+"px");try{localStorage.setItem("achim-saebom-fs",fs);}catch(e){}var n=document.getElementById("fs-now");if(n)n.textContent=fs+"px";setTimeout(fit,0);}
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
var IB_KEY="achim-saebom-ib",IB_DAYS=7;
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
document.getElementById("ver").textContent="아침한권 성도판 앱 "+APP_VER;document.getElementById("priv-cm").hidden=!COMMENTS_API;
instUI();applyFs();boot();
/* 서비스워커: 껍데기 저장 + 최근 14일 글 저장(오프라인). 앱으로 돌아올 때마다 목록을 다시 받는다 */
if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});
  navigator.serviceWorker.addEventListener("message",function(ev){if(ev.data&&ev.data.type==="achim-saebom:new-day")loadIndex().then(function(){RENDERED=null;return route();}).catch(function(){});});}
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible"&&IDX){var was=latestVis();loadIndex().then(function(j){var h=(location.hash||"#/today").replace(/^#\/?/,"")||"today";
    /* 자정이 지나 날짜가 바뀌었거나 새 글이 오면 오늘 글 화면을 새로 그린다(리뷰 R2-5) */
    if(latestVis()!==was||(h==="today"&&CUR&&CUR.id!==latestVis())){RENDERED=null;route();}}).catch(function(){});}});
window.addEventListener("online",function(){if(CUR&&COMMENTS_API)cmList(CUR);});
