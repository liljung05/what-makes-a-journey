'use strict';
let artSequence=0, inspection=null, inspectionOrigin=null, connectionFrame=0;
const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function partPoints(part,size){return part.points?.map(([x,y])=>[x*size[0],y*size[1]]);}
function partBounds(part,size){
 if(part.ellipse){const [x,y,rx,ry]=part.ellipse;return [(x-rx)*size[0],(y-ry)*size[1],rx*2*size[0],ry*2*size[1]];}
 const p=partPoints(part,size),xs=p.map(v=>v[0]),ys=p.map(v=>v[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];
}
function partShape(part,size,attributes=''){
 if(part.ellipse){const [x,y,rx,ry]=part.ellipse;return `<ellipse cx="${x*size[0]}" cy="${y*size[1]}" rx="${rx*size[0]}" ry="${ry*size[1]}" ${attributes}/>`;}
 return `<polygon points="${partPoints(part,size).map(p=>p.join(',')).join(' ')}" ${attributes}/>`;
}
function compositionHTML(scene,selectedPart=null,interactive=true){
 const native=NATIVE_SCENES[scene.id], [w,h]=native.size,uid=`art-${++artSequence}`,src=`${native.asset}.webp`;
 if(selectedPart){const part=native.parts.find(p=>p.id===selectedPart),bounds=partBounds(part,native.size),pad=Math.max(bounds[2],bounds[3])*.025;
 return `<svg class="cutout-view" viewBox="${bounds[0]-pad} ${bounds[1]-pad} ${bounds[2]+pad*2} ${bounds[3]+pad*2}" role="img" aria-label="${escapeText(part.title)}"><defs><clipPath id="${uid}-cut">${partShape(part,native.size)}</clipPath></defs><g clip-path="url(#${uid}-cut)"><image href="${src}" width="${w}" height="${h}"/></g></svg>`;}
 return `<svg class="composition" data-art-scene="${scene.id}" viewBox="0 0 ${w} ${h}" role="group" aria-label="${escapeText(scene.alt)}">
 <defs>${native.parts.map(p=>`<clipPath id="${uid}-${p.id}">${partShape(p,native.size)}</clipPath>`).join('')}</defs>
 <image class="composition-base" href="${src}" width="${w}" height="${h}"/>
 ${interactive?`<rect class="composition-hit" width="${w}" height="${h}" fill="transparent" role="button" tabindex="0" data-stage="${scene.id}" aria-label="${escapeText(scene.title)} 단계 해설과 세 지표 평가 열기"/>`:''}
 ${interactive?native.parts.map(p=>{const [x,y,pw,ph]=partBounds(p,native.size);return `<g class="photo-lift photo-visual" data-part-visual="${p.id}" style="transform-origin:${x+pw/2}px ${y+ph/2}px" clip-path="url(#${uid}-${p.id})" aria-hidden="true"><image href="${src}" width="${w}" height="${h}"/></g>`;}).join(''):''}
 ${interactive?native.parts.map(p=>`<g class="photo-target" data-part="${p.id}" data-stage="${scene.id}" role="button" tabindex="0" aria-label="${escapeText(p.title)} 사진 해설 열기"><title>${escapeText(p.title)}</title>${partShape(p,native.size,'class="photo-hit" fill="transparent"')}</g>`).join(''):''}
 </svg>`;
}
function nativeSceneHTML(scene,index){
 const n=NATIVE_SCENES[scene.id],r=STAGE_RECORDS[n.record];
 return `<section class="scene" data-scene="${scene.id}" data-event="${scene.event}" style="--scene-color:${scene.color}" aria-labelledby="title-${scene.id}">
 <div class="scene-art">${compositionHTML(scene)}${emotionSceneHTML(scene)}</div>
 <div class="scene-caption"><span class="scene-number">0${index+1}</span><div><h2 id="title-${scene.id}">${scene.title}</h2><p>${r.caption}</p><button class="stage-read" data-inspect-stage="${scene.id}">단계 해설 읽기 ↗</button></div><img class="stage-rating" src="rating-${r.rating}.svg" alt="${r.title}의 통제력, 예상 밖 데이터, 정보 수용성 평가" width="176" height="56"></div>
 ${scene.subevent?'<div class="event-subrecord" data-event="station-confirmed"><button data-inspect-stage="scene-03" data-record="confirmed" data-inspect-event="station-confirmed"><strong>집_오이도역의 보관 확인 ↗</strong>선분이 물리적으로만 멀어진 시기.</button></div>':''}
 </section>`;
}
function nativePassageHTML(p){return `<section class="passage native-passage" data-scene="${p.id}" data-event="${p.event}" style="--passage-width:${p.width}px;--passage-height:${p.height}px;--passage-offset:${p.offset}px"><figure class="record-cluster"><div class="record-photos" style="aspect-ratio:${p.width}/${p.height}">${p.photos.map((photo,i)=>{const [x,y,w,h]=photo.rect;return `<button class="record-photo" data-passage="${p.id}" data-photo="${i}" aria-label="${escapeText(photo.title)} 사진 해설 열기" style="left:${x*100}%;top:${y*100}%;width:${w*100}%;height:${h*100}%"><img src="${photo.asset}.webp" alt="${escapeText(photo.title)}" loading="lazy" decoding="async"></button>`;}).join('')}</div>${emotionPassageHTML(p)}<figcaption>${escapeText(p.caption)}<button class="record-stage-read" data-inspect-passage="${p.id}">이 단계의 해설 ↗</button></figcaption></figure></section>`;}
function queueConnections(){if(connectionFrame)return;connectionFrame=requestAnimationFrame(()=>{connectionFrame=0;drawConnections();});}
function drawConnections(){
 const canvas=$('story-canvas'),svg=$('connections');if(!canvas||!svg||state.screen!=='story')return;
 const c=canvas.getBoundingClientRect();if(!c.width)return;const width=canvas.clientWidth,height=canvas.offsetHeight;
 const box=el=>{const r=el.getBoundingClientRect();return {x:r.left-c.left,y:r.top-c.top,w:r.width,h:r.height};};
 const ports=SCENES.map((scene,i)=>{const b=box(canvas.querySelector(`[data-scene="${scene.id}"] .scene-art`));return {incoming:[b.x+b.w*(i%2?.74:.22),b.y+b.h*.12],outgoing:[b.x+b.w*(i%2?.23:.14),b.y+b.h*.84]};});
 let paths='';
 function elbow(a,b){const mid=a[1]+(b[1]-a[1])*.5;return `M${a[0]} ${a[1]}V${mid}H${b[0]}V${b[1]}`;}
 PASSAGES.forEach((p,i)=>{const photos=[...canvas.querySelectorAll(`[data-scene="${p.id}"] .record-photo`)];if(!photos.length)return;const points=photos.map(el=>{const b=box(el);return [b.x+b.w*.5,b.y+b.h*.5];});
 const nodes=[ports[i].outgoing,...points,ports[i+1].incoming];for(let j=0;j<nodes.length-1;j++)paths+=`<path data-from-y="${nodes[j][1]}" data-to-y="${nodes[j+1][1]}" d="${elbow(nodes[j],nodes[j+1])}"/>`;
 });
 svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);svg.innerHTML=paths;if(typeof MotionPoster!=='undefined')MotionPoster.registerPaths();
}
function ratingHTML(record){return `<div class="inspection-rating"><img src="rating-${record.rating}.svg" alt="이 단계의 원본 세 지표 평가"><div class="rating-labels"><span>통제력</span><span>예상 밖 데이터</span><span>정보 과잉성 ↔ 수용성</span></div></div><dl class="criteria-reading">${['통제력','예상 밖 데이터','정보 과잉성 ↔ 데이터 수용성'].map((label,i)=>`<div><dt>${label}</dt><dd>${record.criteria[i]}</dd></div>`).join('')}</dl>`;}
function openInspection(payload,origin){
 if(state.screen!=='story'||state.transition)return;
 const isAlreadyOpen=!!inspection;
 const originalRect=origin?.getBoundingClientRect();
 cancelSnap();setMenu(false);interact();inspectionOrigin=origin||inspectionOrigin;inspection=payload;state.inspection=payload;
 const scene=SCENES.find(s=>s.id===payload.sceneId),passage=PASSAGES.find(p=>p.id===payload.passageId);
 let visual,title,body,recordKey,eventId,photo=null;
 if(scene){const n=NATIVE_SCENES[scene.id];photo=payload.partId?n.parts.find(p=>p.id===payload.partId):null;const sceneDefault=scene.id==='scene-03'&&state.eventId==='station-confirmed'?'confirmed':n.record;recordKey=payload.record||photo?.record||sceneDefault;eventId=payload.eventId||photo?.event||(recordKey==='confirmed'?'station-confirmed':scene.event);visual=state.view==='emotion'&&!payload.partId?emotionSceneHTML(scene,scene.id==='scene-03'?eventId:null):compositionHTML(scene,payload.partId,false);title=photo?.title||STAGE_RECORDS[recordKey].title;body=photo?.body||STAGE_RECORDS[recordKey].body;}
 else {photo=payload.photoIndex!==undefined?passage.photos[payload.photoIndex]:null;recordKey=passage.record;eventId=passage.event;visual=photo?`<img class="inspection-photo" src="${photo.asset}.webp" alt="${escapeText(photo.title)}">`:`<div class="inspection-records">${passage.photos.map(p=>`<img src="${p.asset}.webp" alt="${escapeText(p.title)}">`).join('')}</div>`;title=photo?.title||EVENTS.find(e=>e.id===eventId).label;body=photo?.body||passage.caption;}
 const record=STAGE_RECORDS[recordKey],panel=$('stage-inspector'),copy=$('inspection-copy');
 $('inspection-visual').innerHTML=visual;
 copy.innerHTML=`<div class="inspection-eyebrow">${photo?'사진을 읽다':'단계를 읽다'}</div><h2 id="inspection-title" tabindex="-1">${escapeText(title)}</h2><p class="inspection-main-text">${escapeText(body)}</p>${photo?`<button class="inspection-to-stage" data-inspector-parent>${escapeText(record.title)} 전체 해설 ↗</button>`:record.narrative?`<p class="inspection-narrative">${escapeText(record.narrative)}</p>`:''}<div class="inspection-phase"><h3>${photo?'이 자료가 속한 단계의 평가':'세 가지 기준으로 읽기'}</h3>${ratingHTML(record)}${photo?`<p class="phase-original">${escapeText(record.body)}</p>`:''}</div>`;
 story.inert=true;menuZone.inert=true;$('view-tools').inert=true;panel.hidden=false;panel.dataset.kind=photo?'photo':'stage';experience.classList.add('inspecting');copy.scrollTop=0;
 if(scene&&!photo){const sourceWidth=story.querySelector(`[data-scene="${scene.id}"] .scene-art`).getBoundingClientRect().width;const svg=$('inspection-visual').firstElementChild;svg.style.maxWidth=`${sourceWidth*.84}px`;svg.style.height='auto';}
 renderEvent(EVENTS.find(e=>e.id===eventId),scene?.id||passage.id);
 if(!reduced.matches){
 const visualTarget=$('inspection-visual').firstElementChild;
 const fromRect=scene&&!photo&&!isAlreadyOpen?story.querySelector(`[data-scene="${scene.id}"] .scene-art`).getBoundingClientRect():originalRect;
 const toRect=visualTarget.getBoundingClientRect();
 const dx=fromRect?fromRect.left+fromRect.width/2-toRect.left-toRect.width/2:36;
 const dy=fromRect?fromRect.top+fromRect.height/2-toRect.top-toRect.height/2:12;
 const scale=fromRect&&toRect.width?Math.min(2.6,Math.max(.25,fromRect.width/toRect.width)):1.045;
 visualTarget.animate([{opacity:isAlreadyOpen?0:1,transform:`translate(${dx}px,${dy}px) scale(${scale})`},{opacity:1,transform:'none'}],{duration:460,easing:'cubic-bezier(.22,.7,.2,1)'});copy.animate([{opacity:0,transform:'translateX(25px)'},{opacity:1,transform:'none'}],{duration:420,easing:'ease-out'});}
 $('inspection-title').focus({preventScroll:true});scheduleIdle();
}
function closeInspection(restoreFocus=true){
 if(!inspection)return;const origin=inspectionOrigin;inspection=null;state.inspection=null;story.inert=false;menuZone.inert=false;$('view-tools').inert=false;$('stage-inspector').hidden=true;experience.classList.remove('inspecting');syncCurrent();interact();if(restoreFocus&&origin?.isConnected)origin.focus({preventScroll:true});
}
function jumpToEvent(id){
 if(state.screen!=='story'||state.transition)return;
 closeInspection(false);cancelSnap();updateMeasurements();const point=eventPoints.find(p=>p.id===id);if(!point)return;
 const anchor=anchors.find(a=>a.id===point.sceneId),scene=SCENES.find(s=>s.event===id),reading=story.clientHeight-(narrow.matches?$('context').getBoundingClientRect().height:0);
 const target=Math.max(0,Math.min(story.scrollHeight-story.clientHeight,scene&&anchor?anchor.y:point.y-reading*.52));
 activeAnchor=scene&&anchor?anchor.id:null;releasedAnchor=activeAnchor?null:point.sceneId;scrollAccum=0;
 snapTo(target);interact();story.focus({preventScroll:true});
}
function initArtInteractions(){
 function highlight(root,part){
 if(!root)return;root.classList.toggle('photo-focused',!!part);root.classList.toggle('stage-hover',!part);
 root.querySelectorAll('.photo-visual').forEach(el=>el.classList.toggle('active',el.dataset.partVisual===part));
 }
 story.addEventListener('pointerover',e=>{const root=e.target.closest('.composition');if(root&&e.pointerType==='mouse')highlight(root,e.target.closest('.photo-target')?.dataset.part);});
 story.addEventListener('pointerout',e=>{const root=e.target.closest('.composition');if(root&&!root.contains(e.relatedTarget)){highlight(root,null);root.classList.remove('stage-hover');}});
 story.addEventListener('focusin',e=>{const root=e.target.closest('.composition');if(root)highlight(root,e.target.closest('.photo-target')?.dataset.part);});
 story.addEventListener('focusout',e=>{const root=e.target.closest('.composition');if(root&&!root.contains(e.relatedTarget)){highlight(root,null);root.classList.remove('stage-hover');}});
 function activate(target){
 const item=target.closest('[data-part],[data-inspect-stage],[data-stage],[data-passage],[data-inspect-passage]');if(!item)return;
 if(item.dataset.passage)openInspection({passageId:item.dataset.passage,photoIndex:Number(item.dataset.photo)},item);
 else if(item.dataset.inspectPassage)openInspection({passageId:item.dataset.inspectPassage},item);
 else openInspection({sceneId:item.dataset.inspectStage||item.dataset.stage,partId:item.dataset.part,record:item.dataset.record,eventId:item.dataset.inspectEvent},item);
 }
 story.addEventListener('click',e=>activate(e.target));
 story.addEventListener('keydown',e=>{if(e.target.matches('.photo-target,.composition-hit')&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();activate(e.target);}});
 $('inspection-close').addEventListener('click',()=>closeInspection());
 $('inspection-copy').addEventListener('click',e=>{if(e.target.closest('[data-inspector-parent]')&&inspection){openInspection({...inspection,partId:undefined,photoIndex:undefined},inspectionOrigin);}});
 $('timeline').addEventListener('click',e=>{const button=e.target.closest('[data-event-jump]');if(button)jumpToEvent(button.dataset.eventJump);});
 new ResizeObserver(()=>queueConnections()).observe($('story-canvas'));
 for(const img of story.querySelectorAll('img'))img.addEventListener('load',queueConnections);
}
