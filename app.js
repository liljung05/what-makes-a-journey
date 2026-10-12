'use strict';

// Interaction values are deliberately separate from source content.
const CONFIG = Object.freeze({idleDelay:5000, snapWait:180, captureRange:140, escapeRatio:.25, snapDuration:420, horizontalThreshold:64, axisRatio:1.65, menuLeaveDelay:360, irisDuration:440, introInputLock:650});
const EVENTS = [
 {id:'prepare',label:'집 · 회의 준비',color:'#8b9390',graph:[8,107,107,107]},
 {id:'lost-subway',label:'지하철 · 가방 분실',color:'#c77b7b',graph:[52,73,73,73]},
 {id:'locate-buramsan',label:'카페 · 불암산 위치 확인',color:'#d73630',graph:[86,104,48,63]},
 {id:'return-home',label:'버스 · 집으로',color:'#d73630',graph:[110,103,43,60]},
 {id:'locate-oido',label:'집 · 오이도 위치 확인',color:'#d73630',graph:[162,104,39,49]},
 {id:'station-confirmed',label:'집 · 역 보관 확인',color:'#d73630',graph:[180,90,34,34]},
 {id:'leave-family',label:'가족과 함께 출발',color:'#74b8a9',graph:[185,78,38,40]},
 {id:'drive-oido',label:'고속도로 · 오이도로',color:'#87a69f',graph:[196,44,37,44]},
 {id:'approach-oido',label:'오이도에 가까워지다',color:'#58c6aa',graph:[209,30,29,30]},
 {id:'reunite',label:'오이도 · 완전한 여행',color:'#58c6aa',graph:[224,22,22,22]},
 {id:'drive-home',label:'고속도로 · 집으로',color:'#9adacb',graph:[253,58,58,58]},
 {id:'home-end',label:'집 · 여행의 끝',color:'#3c786a',graph:[254,108,108,108]}
];
const SCENES = [
 {id:'scene-01',event:'prepare',asset:'home-start',size:[1784,1187],title:'집_회의 준비',caption:'이야기가 시작되는 곳.',color:'#8b9390',alt:'흑백 아파트와 가방, 시계, 얼굴을 결합한 회의 준비 콜라주'},
 {id:'scene-02',event:'locate-buramsan',asset:'cafe',size:[2000,1080],title:'카페_불암산 위치 확인',caption:'물리적·인지적 거리가 다소 멀어지는 시기.',color:'#d73630',alt:'카페와 맥북 위치 화면, 붉은 옷을 겹친 분실 위치 확인 콜라주'},
 {id:'scene-03',event:'locate-oido',asset:'home-location',size:[2000,1327],title:'집_오이도 위치 확인',caption:'세 선분이 가장 멀어지는 시기.',color:'#d73630',alt:'아파트, 오이도 위치 지도, 침대와 대화 기록을 결합한 콜라주',subevent:'station-confirmed'},
 {id:'scene-04',event:'drive-oido',asset:'highway',size:[1326,896],title:'고속도로_오이도로 가는 길',caption:'물리적으로 점점 가까워지는 시기.',color:'#87bdb0',alt:'차창 밖 하늘을 지나는 헬리콥터 사진'},
 {id:'scene-05',event:'reunite',asset:'oido',size:[2000,1320],title:'오이도_완전한 여행',caption:'세 점이 완벽히 일치되는 시기.',color:'#58c6aa',alt:'오이도역, 바다, 등대, 음식과 가족이 민트색으로 이어지는 여행 콜라주'},
 {id:'scene-06',event:'home-end',asset:'home-end',size:[2000,1359],title:'집_여행의 끝',caption:'여운만이 남은 시기.',color:'#3c786a',alt:'집과 여행 사진이 담긴 휴대폰, 음식과 시계의 귀가 콜라주'}
];
const PASSAGES = NATIVE_PASSAGES;
SCENES.forEach(scene=>Object.assign(scene,NATIVE_SCENES[scene.id]));
const state = {screen:'intro',sceneId:'scene-01',eventId:'prepare',view:'data',scrollTop:0,menu:false,snap:'settled',transition:false,lastInteraction:performance.now(),hintVisible:false,hintTarget:null};
const $ = id => document.getElementById(id);
const intro=$('intro'), experience=$('experience'), story=$('story'), detail=$('detail'), menuZone=$('menu-zone'), nav=$('navigation'), hint=$('hint');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const narrow=window.matchMedia('(max-width: 800px), (max-height: 500px) and (max-width: 1000px)');
let idleTimer,menuTimer,snapTimer,snapFrame,irisAnimation,entryLockedUntil=0;
let activeAnchor=SCENES[0].id, releasedAnchor=null, scrollAccum=0, wheelAxis=null, axisTimer, wheelX=0;
let anchors=[],eventPoints=[],snapshot=null,lastFocus=null,scrollTick=false,lastPointer=null,firstIdle=true,gesture=null,lastScrollTop=0,programmaticScroll=false,ready=false;

function icon(type,variant=1){
 if(type==='control') return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19" fill="none" stroke="#abb6ae" stroke-width="1"/><path d="M24 5v14m0 10v14M5 24h14m10 0h14" stroke="#353c37" stroke-width="${variant===2?2:1.5}"/><circle cx="24" cy="24" r="${variant===2?4:2}" fill="#353c37"/></svg>`;
 if(type==='unexpected')return `<svg viewBox="0 0 48 48" aria-hidden="true">${[10,24,38].map((x,i)=>`<path d="M${x} ${9+i*7}v${22-i*3}" stroke="#94a89b"/><circle cx="${x}" cy="${variant===0?24:9+i*9}" r="2.5" fill="#626f66"/><circle cx="${x}" cy="${variant===0?24:33+i*3}" r="1.5" fill="#b8c4bc"/>`).join('')}</svg>`;
 return `<svg viewBox="0 0 48 48" aria-hidden="true">${[10,17,24,31,38].map((y,i)=>`<path d="M3 ${y}h${19+variant*2}m4 0h${11+(i%2)*5}" stroke="${i<3?'#48594d':'#a9b5ac'}" stroke-width="1.3"/>`).join('')}</svg>`;
}
story.innerHTML=`<div id="story-canvas"><svg id="connections" aria-hidden="true"></svg>${SCENES.map((scene,i)=>nativeSceneHTML(scene,i)+(PASSAGES[i]?nativePassageHTML(PASSAGES[i]):'')).join('')}<div class="end-note">가방을 찾으러 간 길은<br><em>여행</em>으로 남았다.<button id="read-overview">작품의 개요 읽기 ↗</button></div></div>`;
$('timeline').innerHTML=EVENTS.map(e=>`<li data-id="${e.id}" style="--event-color:${e.color}"><button data-event-jump="${e.id}" aria-label="${e.label} 지점으로 이동"><span>${e.label}</span></button></li>`).join('');
initArtInteractions();

function scheduleIdle(){
 clearTimeout(idleTimer);
 if(!ready||document.hidden||state.screen==='immersive'||state.transition||state.snap==='returning')return;
 idleTimer=setTimeout(showHint,CONFIG.idleDelay);
}
function interact(){state.lastInteraction=performance.now();state.hintVisible=false;hint.classList.remove('visible');hint.setAttribute('aria-hidden','true');scheduleIdle();}
function showHint(){
 if(document.hidden||!ready||state.screen==='immersive'||state.transition||state.snap==='returning')return;
 let label;
 if(state.screen==='intro'){label=intro.classList.contains('modes-revealed')?'자료 · 감정 · 몰입, 여정을 고르세요':'화면을 한 번 클릭해 세 가지 모드를 만나세요';state.hintTarget='start';}
 else if(state.screen==='detail'){label='← 이야기로 돌아가기';state.hintTarget='back';}
 else if(inspection){label='이야기로 돌아가려면 닫기 또는 Escape';state.hintTarget='inspection';}
 else if(state.menu){label='글자를 선택해 이야기를 더 살펴보기';state.hintTarget='menu';}
 else if(firstIdle){label='아래로 스크롤해 사건을 따라가기';state.hintTarget='scroll';firstIdle=false;}
 else if(state.view==='emotion'){label='← 자료 보기로 돌아가기';state.hintTarget='view';}
 else {label=narrow.matches?'감정을 터치하면 같은 장면의 다른 보기를 만납니다':'→ 가로 스크롤 또는 오른쪽 방향키로 감정 보기';state.hintTarget='view';}
 hint.textContent=label;hint.setAttribute('aria-hidden','false');hint.classList.add('visible');state.hintVisible=true;
}
function updateMeasurements(){
 if(state.screen!=='story')return;
 const top=story.getBoundingClientRect().top;
 const offset=el=>el.getBoundingClientRect().top-top+story.scrollTop;
 const readingHeight=story.clientHeight-(narrow.matches?$('context').getBoundingClientRect().height:0);
 anchors=[...story.querySelectorAll('.scene')].map(el=>({id:el.dataset.scene,y:Math.max(0,offset(el)+(el.offsetHeight-readingHeight)/2)}));
 eventPoints=[...story.querySelectorAll('[data-event]')].map(el=>({id:el.dataset.event,sceneId:el.dataset.scene||el.closest('[data-scene]')?.dataset.scene, y:offset(el)+(el.classList.contains('scene')?el.offsetHeight*.46:el.offsetHeight/2)})).sort((a,b)=>a.y-b.y);
 queueConnections();
 syncCurrent();
}
function syncCurrent(){
 if(state.screen!=='story'||inspection)return;
 state.scrollTop=story.scrollTop;
 const readingY=story.scrollTop+(story.clientHeight-(narrow.matches?$('context').getBoundingClientRect().height:0))*.52;
 let nearest=eventPoints[0];
 for(const point of eventPoints)if(Math.abs(point.y-readingY)<Math.abs(nearest.y-readingY))nearest=point;
 if(!nearest)return;
 const event=EVENTS.find(e=>e.id===nearest.id);
 if(!event)return;
 renderEvent(event,nearest.sceneId);
}
function renderEvent(event,sceneId){
 if(!event)return;
 const changed=state.eventId!==event.id;
 state.eventId=event.id;state.sceneId=sceneId;
 updateEmotionContext();
 const index=EVENTS.indexOf(event);
 [...$('timeline').children].forEach((el,i)=>{el.classList.toggle('active',i===index);el.classList.toggle('passed',i<index);if(i===index)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
 $('event-counter').textContent=`${String(index+1).padStart(2,'0')} / ${EVENTS.length}`;
 $('scene-location').textContent=event.label;
 const major=SCENES.findIndex(s=>s.id===sceneId);
 const passage=PASSAGES.findIndex(s=>s.id===sceneId);
 $('story-progress').textContent=major>=0?`${String(major+1).padStart(2,'0')} — 06`:`${String(passage+1).padStart(2,'0')} · 이동`;
 const [x,me,laptop,imagined]=event.graph;
 for(const key of ['x1','x2'])$('graph-guide').setAttribute(key,x);
 for(const [name,y] of [['me',me],['laptop',laptop],['imagined',imagined]]){const marker=$(`marker-${name}`);marker.setAttribute('cx',x);marker.setAttribute('cy',y);}
 $('distance-graph').setAttribute('aria-label',`${event.label} — 나, 맥북, 내가 생각한 맥북의 개념적 거리 관계`);
 if(changed){if(typeof MotionPoster!=='undefined')MotionPoster.eventChanged(event);$('event-live').textContent=event.label;if(narrow.matches){const item=$('timeline').children[index];$('timeline').scrollTo({left:Math.max(0,item.offsetLeft-$('timeline').clientWidth/2),behavior:reduced.matches?'auto':'smooth'});}}
}
function cancelSnap(){
 if(snapFrame)cancelAnimationFrame(snapFrame);snapFrame=null;
 if(state.snap==='returning'){state.snap='candidate';programmaticScroll=false;}
 clearTimeout(snapTimer);
}
function escapeDistance(){return Math.max(130,Math.min(300,story.clientHeight*CONFIG.escapeRatio));}
function scrollIntent(dy){
 interact();cancelSnap();
 if(activeAnchor){scrollAccum+=dy;const anchor=anchors.find(a=>a.id===activeAnchor);if(Math.abs(scrollAccum)>=escapeDistance()||(anchor&&Math.abs(story.scrollTop-anchor.y)>escapeDistance())){releasedAnchor=activeAnchor;activeAnchor=null;state.snap='free';}}
}
function considerSnap(){
 if(state.screen!=='story'||state.transition||inspection||programmaticScroll)return;
 let anchor=activeAnchor?anchors.find(a=>a.id===activeAnchor):null;
 if(anchor&&Math.abs(story.scrollTop-anchor.y)>escapeDistance()){releasedAnchor=activeAnchor;activeAnchor=null;anchor=null;state.snap='free';}
 if(releasedAnchor){const released=anchors.find(a=>a.id===releasedAnchor);if(released&&Math.abs(story.scrollTop-released.y)>escapeDistance()+CONFIG.captureRange)releasedAnchor=null;}
 if(!anchor){anchor=anchors.filter(a=>a.id!==releasedAnchor).find(a=>Math.abs(story.scrollTop-a.y)<=CONFIG.captureRange);if(anchor){activeAnchor=anchor.id;scrollAccum=0;state.snap='candidate';}}
 if(anchor){const target=anchor.y;if(Math.abs(story.scrollTop-target)<1){state.snap='settled';return;}snapTo(target);}
}
function snapTo(target){
 cancelSnap();state.snap='returning';clearTimeout(idleTimer);hint.classList.remove('visible');hint.setAttribute('aria-hidden','true');state.hintVisible=false;programmaticScroll=true;
 const from=story.scrollTop,started=performance.now();
 if(reduced.matches){story.scrollTop=target;programmaticScroll=false;state.snap='settled';scrollAccum=0;scheduleIdle();syncCurrent();return;}
 const frame=now=>{const t=Math.min(1,(now-started)/CONFIG.snapDuration);story.scrollTop=from+(target-from)*(1-Math.pow(1-t,3));if(t<1){snapFrame=requestAnimationFrame(frame);}else{snapFrame=null;programmaticScroll=false;state.snap='settled';scrollAccum=0;scheduleIdle();syncCurrent();}};
 snapFrame=requestAnimationFrame(frame);
}
story.addEventListener('scroll',()=>{
 if(!scrollTick){scrollTick=true;requestAnimationFrame(()=>{syncCurrent();scrollTick=false;});}
 if(!programmaticScroll&&!inspection){interact();
 // Also handles scrollbar and native touch scroll, without trapping either.
 const dy=story.scrollTop-lastScrollTop;
 if(gesture&&gesture.axis==='y'&&activeAnchor){scrollAccum+=dy;if(Math.abs(scrollAccum)>escapeDistance()){releasedAnchor=activeAnchor;activeAnchor=null;state.snap='free';}}
 clearTimeout(snapTimer);snapTimer=setTimeout(considerSnap,CONFIG.snapWait);
 }
 lastScrollTop=story.scrollTop;
},{passive:true});
function enterStory(){
 if(state.transition||state.screen!=='intro')return;
 state.screen='story';intro.hidden=true;experience.hidden=false;detail.hidden=true;story.scrollTop=0;lastScrollTop=0;activeAnchor=SCENES[0].id;releasedAnchor=null;scrollAccum=0;state.snap='settled';entryLockedUntil=performance.now()+CONFIG.introInputLock;interact();story.focus({preventScroll:true});requestAnimationFrame(()=>{updateMeasurements();if(anchors[0]){story.scrollTop=anchors[0].y;lastScrollTop=story.scrollTop;syncCurrent();}});
}
function returnIntro(){
 if(state.transition)return;
 closeInspection(false);cancelSnap();state.screen='intro';intro.hidden=false;experience.hidden=true;detail.hidden=true;setMenu(false);interact();$('start').focus({preventScroll:true});
}
$('brand').addEventListener('click',returnIntro);
function setView(view){
 if(state.screen!=='story'||state.transition||state.view===view)return;
 closeInspection(false);if(typeof MotionPoster!=='undefined'){MotionPoster.setPeek(false);MotionPoster.clearWords();}state.view=view;experience.classList.toggle('emotion-on',view==='emotion');
 $('data-view').setAttribute('aria-pressed',view==='data');$('emotion-view').setAttribute('aria-pressed',view==='emotion');
 $('event-live').textContent=view==='emotion'?'감정 보기. 원본 파노라마의 감정어와 검은 콜라주.':'자료 보기';interact();
}
$('data-view').addEventListener('click',()=>setView('data'));
$('emotion-view').addEventListener('click',()=>setView('emotion'));
window.addEventListener('wheel',e=>{
 if(state.transition){e.preventDefault();return;}
 if(inspection){interact();if(!e.target.closest('.inspection-copy'))e.preventDefault();return;}
 if(state.screen==='intro'){if(Math.abs(e.deltaY)>5&&e.deltaY>0){e.preventDefault();IntroGateway.reveal();}return;}
 if(state.screen!=='story'){interact();return;}
 if(performance.now()<entryLockedUntil){e.preventDefault();return;}
 if(e.target.closest('#context,#header,#view-tools')){interact();return;}
 const unit=e.deltaMode===1?16:e.deltaMode===2?story.clientHeight:1, dx=e.deltaX*unit,dy=e.deltaY*unit;
 clearTimeout(axisTimer);axisTimer=setTimeout(()=>{wheelAxis=null;wheelX=0;},140);
 if(!wheelAxis){if(Math.abs(dx)>Math.abs(dy)*CONFIG.axisRatio&&Math.abs(dx)>3)wheelAxis='x';else if(Math.abs(dy)>3)wheelAxis='y';}
 if(wheelAxis==='x'){e.preventDefault();interact();wheelX+=dx;if(Math.abs(wheelX)>CONFIG.horizontalThreshold){setView(wheelX>0?'emotion':'data');wheelX=0;}}
 else if(wheelAxis==='y'){scrollIntent(dy);}
},{passive:false});
window.addEventListener('keydown',e=>{
 if(state.transition){if(['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','PageDown','PageUp',' ','Tab','Enter'].includes(e.key))e.preventDefault();return;}
 if(inspection){if(e.key==='Escape'){e.preventDefault();closeInspection();}else interact();return;}
 if(e.key==='Tab'){interact();return;}
 if(e.target.matches('input,textarea,select')||e.metaKey||e.ctrlKey||e.altKey)return;
 if(state.screen==='intro'&&e.target.closest('#intro-modes button,#intro-reveal')&&['Enter',' '].includes(e.key))return;
 if(state.screen==='intro'&&['ArrowDown','PageDown',' ','Enter'].includes(e.key)){e.preventDefault();IntroGateway.reveal(true);return;}
 if(e.key==='Escape'){if(state.screen==='detail'){closeDetail();e.preventDefault();}else if(state.menu){setMenu(false);$('menu-toggle').focus({preventScroll:true});}else if(state.view==='emotion')setView('data');interact();return;}
 if(state.screen!=='story'){interact();return;}
 if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setView(e.key==='ArrowRight'?'emotion':'data');return;}
 if(['ArrowDown','ArrowUp','PageDown','PageUp',' ','Home','End'].includes(e.key)&&!e.target.closest('button')){
 e.preventDefault();const step=(e.key==='ArrowDown'||e.key==='ArrowUp')?65:story.clientHeight*.7;
 const y=e.key==='Home'?0:e.key==='End'?story.scrollHeight-story.clientHeight:story.scrollTop+step*(['ArrowUp','PageUp'].includes(e.key)||e.key===' '&&e.shiftKey?-1:1);
 scrollIntent(y-story.scrollTop);story.scrollTop=y;return;
 }
 if(e.key.toLowerCase()==='m'){e.preventDefault();setMenu(!state.menu);if(state.menu)nav.querySelector('button').focus({preventScroll:true});}
 else if(e.key==='Enter'||e.key===' ')interact();
});
window.addEventListener('touchstart',e=>{
 if(state.screen==='immersive'){gesture=null;return;}
 if(inspection||e.touches.length!==1||e.target.closest('#context,#header,#view-tools,#stage-inspector,input')){gesture=null;interact();return;}
 const t=e.touches[0];gesture={x:t.clientX,y:t.clientY,lastY:t.clientY,axis:null,intro:state.screen==='intro',locked:performance.now()<entryLockedUntil};interact();cancelSnap();
},{passive:true});
window.addEventListener('touchmove',e=>{
 if(state.transition){e.preventDefault();return;}
 if(inspection){interact();return;}
 if(!gesture||e.touches.length!==1)return;
 const t=e.touches[0],dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;
 if(gesture.intro){if(dy < -18){e.preventDefault();IntroGateway.reveal();gesture.locked=true;}return;}
 if(state.screen!=='story')return;
 if(gesture.locked){e.preventDefault();return;}
 if(!gesture.axis){if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*CONFIG.axisRatio)gesture.axis='x';else if(Math.abs(dy)>12)gesture.axis='y';}
 if(gesture.axis==='x'){e.preventDefault();if(Math.abs(dx)>CONFIG.horizontalThreshold){setView(dx<0?'emotion':'data');}}
 interact();gesture.lastY=t.clientY;
},{passive:false});
window.addEventListener('touchend',()=>{const hadGesture=!!gesture;gesture=null;if(hadGesture&&state.screen==='story'){clearTimeout(snapTimer);snapTimer=setTimeout(considerSnap,CONFIG.snapWait);}},{passive:true});
function setMenu(open){
 clearTimeout(menuTimer);state.menu=open;menuZone.classList.toggle('open',open);$('menu-toggle').setAttribute('aria-expanded',open);$('menu-toggle').querySelector('span').textContent=open?'−':'＋';
 nav.inert=!open;interact();
}
$('menu-toggle').addEventListener('click',e=>setMenu(e.pointerType==='mouse'?true:!state.menu));
menuZone.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&state.screen==='story'&&!state.transition)setMenu(true);});
menuZone.addEventListener('pointerleave',()=>{menuTimer=setTimeout(()=>{if(!menuZone.contains(document.activeElement))setMenu(false);},CONFIG.menuLeaveDelay);});
menuZone.addEventListener('focusout',()=>{menuTimer=setTimeout(()=>{if(!menuZone.contains(document.activeElement)&&!menuZone.matches(':hover'))setMenu(false);},CONFIG.menuLeaveDelay);});
nav.addEventListener('pointerover',e=>{if(e.target.closest('button'))interact();});
nav.inert=true;
window.addEventListener('pointermove',e=>{
 if(inspection||state.screen!=='story'||e.pointerType!=='mouse'||state.transition)return;
 if(e.clientY<24&&e.clientX>(narrow.matches?0:$('context').getBoundingClientRect().right)){setMenu(true);}
 // Tiny pointer motion does not continually postpone contextual guidance.
 if(lastPointer&&Math.hypot(e.clientX-lastPointer.x,e.clientY-lastPointer.y)<12)return;
 lastPointer={x:e.clientX,y:e.clientY};
});

const detailTemplates={
 overview:()=>`<div class="detail-eyebrow">CONTROLLED LIBERATION / 01</div><h1 id="detail-title" tabindex="-1">개요</h1><p class="detail-lead">가방을 찾으러 가는 길은<br>언제부터 여행이 되었을까.</p><div class="overview-introduction"><p class="detail-body">지하철에 두고 내린 맥북 가방은 오이도역으로 향했다. 가족과 가방을 찾으러 가는 길은 뜻밖의 여행으로 바뀌었다.</p><p class="detail-body">이 포스터는 분실과 회수의 사건을 따라가며, 통제력과 예상 밖 데이터, 정보 과잉성과 데이터 수용성의 관계를 살핀다. 같은 풍경과 같은 목소리가 불안의 정보가 되기도, 여행의 경험이 되기도 한다.</p><div class="overview-steps">집 <span>→</span> 지하철 <span>→</span> 카페 <span>→</span> 집 <span>→</span> 고속도로 <span>→</span> 오이도 <span>→</span> 집</div></div>${panoramaHTML()}<details class="detail-poster"><summary>원본 포스터 전체 펼쳐 보기</summary><img class="detail-image" loading="lazy" src="original-poster.webp" alt="무엇이 여행을 여행으로 만드는가 원본 세로 포스터"></details>`,
 color:()=>`<div class="detail-eyebrow">COLOR / ATTENTION / 02</div><h1 id="detail-title" tabindex="-1">컬러시스템</h1><p class="detail-lead">시선을 붙잡는 색,<br>받아들이는 상태의 변화.</p><div class="color-spectrum" aria-label="불안의 레드에서 무채색을 거쳐 여행의 민트까지">${['#d7352e','#cc5554','#c37375','#a99193','#898f8e','#8aa7a2','#85beb3','#6ac4b0','#58c6aa'].map(c=>`<span style="background:${c}"></span>`).join('')}</div><div class="color-labels"><div class="red">불안<small>위치를 찾고, 통제하려는 시선</small></div><div>무감 · 지루함<small>무채색으로 남는 정보</small></div><div class="mint">여행 · 해방<small>풍경을 받아들이는 시선</small></div></div><div class="detail-two-col"><p class="detail-body">흑백의 건축과 사진 위에 레드와 민트가 놓인다. 색의 강도와 인지의 정도는 경험의 변화를 읽는 단서다. 불안했던 순간과 여행이 된 순간은 같은 사건의 흐름 안에 있다.</p><p class="detail-body">위 색상은 원본의 색 띠를 바탕으로 웹에서 재현했다. 감정을 수치로 측정하는 척도가 아닌, 포스터의 표현 체계다.</p></div>`,
 distance:()=>`<div class="detail-eyebrow">THREE LINES / 03</div><h1 id="detail-title" tabindex="-1">거리의 관계</h1><p class="detail-lead">나, 맥북,<br>내가 생각한 맥북.</p><div class="line-intro"><article><span class="line-sample me"></span><h3>나의 이동</h3><p>가방을 찾으러 움직이는 나의 경로.</p></article><article><span class="line-sample laptop"></span><h3>실제 맥북</h3><p>나와 다른 경로를 따라 이동한 가방.</p></article><article><span class="line-sample imagined"></span><h3>내가 생각한 맥북</h3><p>위치 정보와 확인을 통해 내가 이해한 가방의 위치.</p></article></div><img class="detail-image" src="distance-original.webp" alt="집, 지하철, 회의 장소, 오이도, 바다, 귀가의 세 선분이 멀어졌다 만나는 원본 그래프"><div class="detail-two-col"><p class="detail-body">오이도 위치 확인 때 세 선분은 가장 멀어진다. 역 보관을 확인하고 오이도로 향하면서 거리가 좁혀진다. 가방을 회수하는 순간, 세 경로는 합류한다.</p><p class="detail-body">실선은 확인된 위치, 점선은 이동 경로가 미확인인 구간을 나타낸다. 메인 화면의 마커는 현재 사건을 가리키며, 실제 이동 좌표나 새로운 위치 기록을 만들지 않는다.</p></div>`,
 indicators:()=>`<div class="detail-eyebrow">THREE INDICATORS / 04</div><h1 id="detail-title" tabindex="-1">3가지 지표</h1><p class="detail-lead">경험을 읽는 세 가지 시선.</p><div class="indicator-list"><article>${icon('control',2)}<div class="index">01 / CONTROL</div><h3>통제력</h3><p>내가 상황을 파악하고 바꿀 수 있다고 느끼는 정도. 가방의 위치와 보관을 확인하면서, 상황을 받아들이는 방식도 바뀐다.</p></article><article>${icon('unexpected')}<div class="index">02 / UNEXPECTED DATA</div><h3>예상 밖 데이터</h3><p>계획에 없던 위치 정보와 새로운 풍경. 예상하지 못한 정보는 불안을 만들기도 하고, 여행의 발견이 되기도 한다.</p></article><article>${icon('acceptance',2)}<div class="index">03 / RECEPTIVITY</div><h3>정보 과잉성과<br>데이터 수용성</h3><p>주변 정보의 양과 그것을 받아들이는 상태의 관계. 같은 정보를 마주해도, 인지적 여유에 따라 경험은 달라진다.</p></article></div><p class="indicator-note">세 지표는 각각 분리된 점수가 아니다. 통제력의 변화는 무엇을 바라보고, 어떤 정보를 받아들이는지와 함께 움직인다. 웹에서도 측정되지 않은 백분율이나 점수를 덧붙이지 않았다.</p><div class="detail-two-col"><img class="detail-image" src="indicators-original.webp" alt="원본 포스터의 통제력, 예상 밖 데이터, 정보 수용성을 표현한 기호"><p class="image-caption">원본 포스터의 지표 기호.<br>메인 장면에도 같은 표현 언어가 이어진다.</p></div>`,
 changes:()=>`<div class="detail-eyebrow">THE SAME, DIFFERENT / 05</div><h1 id="detail-title" tabindex="-1">달라지는것</h1><p class="detail-lead">풍경은 그대로여도,<br>받아들이는 나는 달라진다.</p><div class="changes-area">${comparisonHTML('landscape','풍경','풍경이 있어도, 통제력 없이는 보이지 않는다.','native/landscape-red','native/landscape-mint')}${comparisonHTML('voice','가족의 목소리','같은 소리도, 통제력에 따라 다르게 느낀다.','native/voice-red','native/voice-mint')}</div><p class="detail-body">무엇을 바라볼지, 그것을 긍정적으로 바라볼지는 무엇이 정하는가. 원본에 놓인 풍경과 가족의 사진을 나란히 겹쳐, 두 표현을 비교한다.</p><p class="detail-bottom">아래 슬라이더를 움직여 원본의 두 표현을 비교할 수 있습니다.</p>`
};
function comparisonHTML(id,label,caption,before,after){return `<article><div class="comparison" id="compare-${id}"><img src="${after}.webp" alt="${label}의 민트 표현"><div class="before"><img src="${before}.webp" alt="${label}의 레드 표현"></div><span class="divider" aria-hidden="true"></span></div><div class="comparison-labels"><span>불안의 시선</span><span>여행의 시선</span></div><input type="range" min="0" max="100" value="50" data-compare="${id}" aria-label="${label}의 두 표현 비교"><h3>${caption}</h3></article>`;}
async function preloadDetailImages(){const images=[...$('detail-content').querySelectorAll('img:not([loading="lazy"])')];await Promise.all(images.map(img=>img.decode().catch(()=>{})));}
async function irisTransition(button,label,swap){
 if(state.transition)return;
 state.transition=true;cancelSnap();hint.classList.remove('visible');hint.setAttribute('aria-hidden','true');state.hintVisible=false;clearTimeout(idleTimer);
 const rect=button.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
 const radius=Math.ceil(Math.max(Math.hypot(x,y),Math.hypot(innerWidth-x,y),Math.hypot(x,innerHeight-y),Math.hypot(innerWidth-x,innerHeight-y)))+4;
 const cover=$('iris'),word=$('iris-word');cover.style.background='#fff';word.style.color='#252525';word.textContent=label;word.style.left=`${x}px`;word.style.top=`${y}px`;cover.style.display='block';cover.style.pointerEvents='all';
 const duration=reduced.matches?1:CONFIG.irisDuration;
 try{
 irisAnimation=cover.animate([{clipPath:`circle(0px at ${x}px ${y}px)`},{clipPath:`circle(${radius}px at ${x}px ${y}px)`}],{duration,easing:'cubic-bezier(.6,0,.35,1)',fill:'forwards'});await irisAnimation.finished;
 await swap();
 irisAnimation=cover.animate([{clipPath:`circle(${radius}px at ${x}px ${y}px)`},{clipPath:`circle(0px at ${x}px ${y}px)`}],{duration,easing:'cubic-bezier(.3,0,.25,1)',fill:'forwards'});await irisAnimation.finished;
 }finally{irisAnimation?.cancel();cover.style.display='none';cover.style.pointerEvents='none';state.transition=false;interact();}
}
async function openDetail(key,button){
 if(state.transition||!detailTemplates[key])return;
 closeInspection(false);
 snapshot={scrollTop:story.scrollTop,sceneId:state.sceneId,eventId:state.eventId,view:state.view,activeAnchor,releasedAnchor,scrollAccum,snap:state.snap};lastFocus=button;
 await irisTransition(button,button.textContent.trim(),async()=>{
 state.screen='detail';experience.hidden=true;detail.hidden=false;$('detail-content').innerHTML=detailTemplates[key]();detail.scrollTop=0;setMenu(false);
 $('detail-title').focus({preventScroll:true});
 for(const input of detail.querySelectorAll('[data-compare]')){const frame=$(`compare-${input.dataset.compare}`);frame.style.setProperty('--frame-width',`${frame.clientWidth}px`);input.addEventListener('input',()=>{frame.style.setProperty('--split',`${input.value}%`);interact();});}
 await preloadDetailImages();
 });
}
async function closeDetail(){
 if(state.transition||!snapshot)return;
 const saved=snapshot;
 await irisTransition($('back'),'이야기',async()=>{
 state.screen='story';detail.hidden=true;experience.hidden=false;state.view=saved.view;experience.classList.toggle('emotion-on',saved.view==='emotion');story.scrollTop=saved.scrollTop;lastScrollTop=story.scrollTop;activeAnchor=saved.activeAnchor;releasedAnchor=saved.releasedAnchor;scrollAccum=saved.scrollAccum;state.snap=saved.snap==='returning'?'settled':saved.snap;updateMeasurements();
 if(lastFocus?.isConnected&&lastFocus.closest('#navigation')){setMenu(true);lastFocus.focus({preventScroll:true});}else story.focus({preventScroll:true});
 });
}
nav.addEventListener('click',e=>{const button=e.target.closest('[data-detail]');if(button)openDetail(button.dataset.detail,button);});
$('read-overview').addEventListener('click',e=>openDetail('overview',e.currentTarget));
$('back').addEventListener('click',closeDetail);
window.addEventListener('resize',()=>{
 if(state.screen==='story')updateMeasurements();
 for(const frame of detail.querySelectorAll('.comparison'))frame.style.setProperty('--frame-width',`${frame.clientWidth}px`);
});
document.addEventListener('visibilitychange',()=>{clearTimeout(idleTimer);hint.classList.remove('visible');hint.setAttribute('aria-hidden','true');state.hintVisible=false;if(!document.hidden)interact();});
document.addEventListener('click',interact,{passive:true});
for(const img of story.querySelectorAll('img'))img.addEventListener('load',()=>{if(state.screen==='story')updateMeasurements();});
(async()=>{const firstImage=new Image();firstImage.src='home-start.webp';await firstImage.decode().catch(()=>{});ready=true;scheduleIdle();})();
// Read-only diagnostic snapshot for validating interaction contracts.
window.poster={config:CONFIG,events:EVENTS,scenes:SCENES,getState:()=>({...state,scrollTop:story.scrollTop,activeAnchor,releasedAnchor,scrollAccum,anchors:anchors.map(a=>({...a}))})};

$("detail-content").addEventListener("click",e=>{if(e.target.closest("#panorama-zoom")){const section=e.target.closest(".panorama-section"),zoomed=section.classList.toggle("zoomed");e.target.setAttribute("aria-pressed",zoomed);e.target.textContent=zoomed?"전체 파노라마 보기 －":"감정어 확대해서 읽기 ＋";interact();}});
