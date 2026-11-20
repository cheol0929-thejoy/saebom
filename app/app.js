/* 새봄묵상 앱 (MVP) — 정적 PWA. 데이터 = data/index.json + data/<날짜>.json (make_app_data.py 가 페이지 원본에서 만든다) */
(function(){
"use strict";
var VIEW=document.getElementById("view"), OFF=document.getElementById("offline");
var CARD_LINK="https://cheol0929-thejoy.github.io/saebom/";
var idx=null, cache={}, curIso=null;
/* 오늘 = 한국 시간 05:00 기준 (자정~05:00 은 전날). 시험용으로만 ?now=ISO 를 받는다 */
var LOCAL=/^(127\.0\.0\.1|localhost)$/.test(location.hostname);
function nowMs(){var q=LOCAL?new URLSearchParams(location.search).get("now"):null;var t=q?Date.parse(q):NaN;return isNaN(t)?Date.now():t;}   /* ?now= 는 내 PC 시험에서만 */
function todayIso(){return new Date(nowMs()+9*3600e3-5*3600e3).toISOString().slice(0,10);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function rich(s){return esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");}
function paras(a){return (a||[]).map(function(p){return "<p>"+rich(p)+"</p>";}).join("");}
function visible(){var t=todayIso();return idx?idx.days.filter(function(d){return d.iso<=t;}):[];}
function getJSON(u){return fetch(u,{cache:"no-cache"}).then(function(r){if(!r.ok)throw new Error(u+" "+r.status);if(r.headers.get("X-Saebom-Offline")==="1")OFF.hidden=false;return r.json();});}
function loadIndex(){net();return getJSON("data/index.json").then(function(j){idx=j;cache={};return j;});}   /* 목록이 새로 오면 날짜별 기억도 비운다(녹음·그림이 나중에 바뀌는 날) */
function loadDay(iso){if(cache[iso])return Promise.resolve(cache[iso]);return getJSON("data/"+iso+".json").then(function(j){cache[iso]=j;return j;});}
function setTab(t){[].forEach.call(document.querySelectorAll("nav.tabs a"),function(a){if(a.getAttribute("data-tab")===t)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});}
function show(h){VIEW.innerHTML=h;window.scrollTo(0,0);}
function listenBtn(e){
  if(e.hasPastorAudio)return '<a class="listen" id="listen" href="'+esc(e.listen)+'" target="_blank" rel="noopener">▶ 목사님 음성으로 듣기</a><p class="note">새봄묵상 페이지가 열리고 목사님 음성으로 재생됩니다.</p>';
  if(e.hasAiAudio)return '<a class="listen" id="listen" href="'+esc(e.listen)+'" target="_blank" rel="noopener">▶ AI 낭독 듣기</a><p class="note">새봄묵상 페이지가 열립니다(이 날은 목사님 녹음이 없습니다).</p>';
  return "";
}
function renderDay(e){
  var v=visible(), i=v.findIndex(function(d){return d.iso===e.iso;});
  var newer=i>0?v[i-1]:null, older=(i>=0&&i<v.length-1)?v[i+1]:null;
  curIso=e.iso;
  var h='<article id="day" data-iso="'+esc(e.iso)+'"><p class="date">'+esc(e.date)+'</p><h2 class="title">'+esc(e.title)+'</h2><p class="ref">'+esc(e.ref)+'</p>';
  if(e.image&&e.image.src)h+='<figure><img src="'+esc(e.image.src)+'" alt="'+esc(e.image.alt)+'" width="1200" height="675" loading="lazy"><figcaption>'+esc(e.image.caption)+'</figcaption></figure>';
  h+=listenBtn(e);
  h+='<section class="verses"><h3>오늘의 본문 · '+esc(e.ref)+'</h3>'+(e.verses||[]).map(function(x){return '<p><span class="n">'+esc(x[0])+'</span>'+esc(x[1])+'</p>';}).join("")+'</section>';
  h+='<section><h3>관찰</h3>'+paras(e.observe)+'</section>';
  h+='<section><h3>해석</h3>'+paras(e.interpret)+(e.key?'<p class="key">'+esc(e.key)+'</p>':"")+'</section>';
  if(e.applies&&e.applies.length){e.applies.forEach(function(a){h+='<section><h3>적용 · '+esc(a.label)+'</h3>'+paras(a.paras)+'</section>';});}
  else h+='<section><h3>적용</h3>'+paras(e.apply)+'</section>';
  if(e.practice)h+='<section><h3>오늘의 실천</h3><p>'+rich(e.practice)+'</p></section>';
  if(e.prayer&&e.prayer.length)h+='<section class="prayer"><h3>기도</h3>'+e.prayer.map(function(p){return "<p>"+esc(p)+"</p>";}).join("")+'</section>';
  if(e.requests&&e.requests.length)h+='<section><h3>함께 드리는 기도제목</h3><ol class="req">'+e.requests.map(function(r){return "<li>"+esc(r)+"</li>";}).join("")+'</ol></section>';
  if(e.verse)h+='<section class="verse1"><h3>오늘의 한 구절</h3><p>'+esc(e.verse)+'<span class="vr">'+esc(e.verseRef)+'</span></p></section>';
  h+='<div class="daynav"><a href="'+(older?"#/day/"+older.iso:"#")+'" aria-disabled="'+(!older)+'">‹ 전날</a><a href="'+(newer?"#/day/"+newer.iso:"#")+'" aria-disabled="'+(!newer)+'">다음날 ›</a></div></article>';
  show(h);
}
function viewToday(){setTab("today");var v=visible();if(!v.length)return show('<p class="empty">아직 공개된 묵상이 없습니다.</p>');return loadDay(v[0].iso).then(renderDay);}
function viewDay(iso){setTab(iso===(visible()[0]||{}).iso?"today":"list");
  if(!visible().some(function(d){return d.iso===iso;}))return show('<p class="empty">이 날의 묵상은 아직 공개되지 않았습니다.</p><a class="btn" href="#/today">오늘 묵상으로</a>');
  return loadDay(iso).then(renderDay);}
function viewList(){setTab("list");var v=visible();
  show('<h2 class="title">지난 묵상</h2><ul class="list">'+v.map(function(d){return '<li><a href="#/day/'+esc(d.iso)+'"><span class="d">'+esc(d.date)+(d.hasPastorAudio?" · 목사님 음성":"")+'</span><span class="t">'+esc(d.title)+'</span><span class="r">'+esc(d.ref)+'</span></a></li>';}).join("")+'</ul>');}
function viewShare(){setTab("share");var v=visible();if(!v.length)return show('<p class="empty">공유할 묵상이 없습니다.</p>');
  var iso=(curIso&&v.some(function(d){return d.iso===curIso;}))?curIso:v[0].iso;   /* 마지막으로 본 날(없으면 오늘) */
  return loadDay(iso).then(function(e){
    var mmdd=e.iso.slice(5,7)+e.iso.slice(8,10), link=CARD_LINK+mmdd+".html";
    var h='<h2 class="title">공유</h2><p class="date">'+esc(e.date)+'</p><p><strong>'+esc(e.title)+'</strong></p>';
    if(e.share){h+='<a class="btn primary" id="kakao" href="'+esc(e.share)+'" target="_blank" rel="noopener">카카오톡으로 보내기</a><button class="btn" id="copy" type="button" data-link="'+esc(link)+'">링크 복사</button>';
      if(navigator.share)h+='<button class="btn" id="native" type="button">다른 앱으로 공유</button>';
      h+='<p class="small" id="copied" aria-live="polite"></p>';}
    else h+='<p class="empty">이 날은 공유 카드가 없습니다.</p>';
    show(h);
    var c=document.getElementById("copy");if(c)c.onclick=function(){var l=c.getAttribute("data-link"),m=document.getElementById("copied");
      (navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(function(){m.textContent="복사했습니다: "+l;},function(){m.textContent=l;});};
    var n=document.getElementById("native");if(n)n.onclick=function(){navigator.share({title:"새봄묵상 · "+e.title,url:link}).catch(function(){});};
  });}
function pref(k,d){try{return localStorage.getItem(k)||d;}catch(_){return d;}}
function setPref(k,v){try{localStorage.setItem(k,v);}catch(_){} applyPrefs();}
function applyPrefs(){var r=document.documentElement;r.setAttribute("data-fs",pref("fs","1"));r.setAttribute("data-theme",pref("theme","auto"));}
function seg(name,cur,opts){return '<div class="seg" role="group" aria-label="'+name+'">'+opts.map(function(o){return '<button type="button" data-k="'+o[0]+'" data-v="'+o[1]+'" aria-pressed="'+(cur===o[1])+'">'+o[2]+'</button>';}).join("")+'</div>';}
function viewSettings(){setTab("settings");
  show('<h2 class="title">설정</h2><section><h3>글자 크기</h3>'+seg("글자 크기",pref("fs","1"),[["fs","1","보통"],["fs","2","크게"],["fs","3","아주 크게"]])+'</section>'+
  '<section><h3>화면</h3>'+seg("화면",pref("theme","auto"),[["theme","auto","기기 따라"],["theme","light","밝게"],["theme","dark","어둡게"]])+'</section>'+
  '<section><h3>홈 화면에 추가</h3><p><strong>아이폰</strong>: Safari 아래쪽 공유 버튼(□↑) → 「홈 화면에 추가」</p><p><strong>안드로이드</strong>: Chrome 오른쪽 위 ⋮ → 「앱 설치」 또는 「홈 화면에 추가」</p></section>'+
  '<section><h3>알림</h3><p>앱 알림은 아직 없습니다. 매일 새 묵상은 카카오톡 단톡방 링크로 안내해 드립니다. 새 묵상은 한국 시간 오전 5시에 열립니다.</p></section>'+
  '<section><h3>앱 정보</h3><p class="small">새봄교회 매일 묵상 · 신철 목사<br>성경: 개역개정판<br>버전 v1-41a50b7897</p></section>');
  [].forEach.call(VIEW.querySelectorAll(".seg button"),function(b){b.onclick=function(){setPref(b.getAttribute("data-k"),b.getAttribute("data-v"));viewSettings();};});}
function route(){var h=location.hash||"#/today",m;
  var p=(m=h.match(/^#\/day\/(\d{4}-\d{2}-\d{2})$/))?viewDay(m[1]):h==="#/list"?viewList():h==="#/share"?viewShare():h==="#/settings"?viewSettings():viewToday();
  Promise.resolve(p).catch(function(err){show('<p class="empty">묵상을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.</p><button class="btn" type="button" onclick="location.reload()">다시 시도</button>');});}
function net(){OFF.hidden=navigator.onLine!==false;}
applyPrefs();net();window.addEventListener("online",net);window.addEventListener("offline",net);
window.addEventListener("hashchange",route);
loadIndex().then(route,function(){show('<p class="empty">묵상을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.</p><button class="btn" type="button" onclick="location.reload()">다시 시도</button>');});
/* 05:00 이 지나면 화면이 열려 있어도 새 묵상으로 */
var lastDay=todayIso();setInterval(function(){var t=todayIso();if(t!==lastDay){lastDay=t;loadIndex().then(route).catch(function(){});}},60000);
var REG=null;
if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").then(function(r){REG=r;}).catch(function(){});});}
/* 앱으로 돌아오면: 목록·그날 묵상을 새로 받고(녹음·그림 교체 반영), 앱 껍데기 새 판이 있는지 확인 */
document.addEventListener("visibilitychange",function(){if(document.visibilityState!=="visible")return;
  if(REG)REG.update().catch(function(){});
  loadIndex().then(route).catch(function(){});});
})();
