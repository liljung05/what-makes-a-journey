'use strict';
const EMOTION_EVENT_RANGES={prepare:[899,940],'lost-subway':[940,990],'locate-buramsan':[990,1100],'return-home':[1100,1165],'locate-oido':[1165,1248],'station-confirmed':[1218,1248],'leave-family':[1248,1280],'drive-oido':[1280,1355],'approach-oido':[1355,1397],reunite:[1397,1490],'drive-home':[1490,1588],'home-end':[1588,1636]};
const EMOTION_COLORS={neutral:'#f5f5ef',anxiety:'#d73630',release:'#58c6aa'};
function emotionWords(eventIds){return EMOTION_WORDS.filter(w=>eventIds.includes(w.event));}
function emotionWordSVG(words,w,h){
 const lo=Math.min(...words.map(p=>p.x)),hi=Math.max(...words.map(p=>p.x)),top=Math.min(...words.map(p=>p.y)),bottom=Math.max(...words.map(p=>p.y));
 const desktop=`<g class="emotion-ink" aria-hidden="true">${words.map((p,i)=>{const x=w*(.19+(hi===lo ? .3 : (p.x-lo)/(hi-lo)*.57));const y=h*(.37+(bottom===top ? .2 : (p.y-top)/(bottom-top)*.30));return `<text x="${x}" y="${y}" fill="${EMOTION_COLORS[p.tone]}" font-size="${w*(words.length>9?.019:.026)}" style="--word-delay:${i*.06}s">${escapeText(p.text)}</text>`;}).join('')}</g>`;
 const strong=words.filter(p=>p.tone!=='neutral');const mobile=(strong.length?strong:words).slice(0,3);
 return desktop+`<g class="emotion-ink emotion-ink-mobile" aria-hidden="true">${mobile.map((p,i)=>`<text x="${w*.49}" y="${h*(.36+i*.14)}" text-anchor="middle" fill="${EMOTION_COLORS[p.tone]}" font-size="${w*.037}">${escapeText(p.text)}</text>`).join('')}</g>`;
}
function emotionSceneHTML(scene,eventOverride=null){
 const ids=eventOverride?[eventOverride]:scene.id==='scene-03'?['locate-oido']:scene.id==='scene-05'?['approach-oido','reunite']:[scene.event],words=emotionWords(ids),[w,h]=scene.size;
 return `<div class="emotion-layer" data-emotion-scene="${scene.id}"><svg class="emotion-composition" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeText(scene.title)}의 검은 콜라주와 원본 감정어"><image class="black-collage" href="${scene.asset}.webp" width="${w}" height="${h}"/>${emotionWordSVG(words,w,h)}</svg><div class="emotion-reading">${words.map(p=>`<button class="emotion-word ${p.tone}" data-emotion-word data-emotion-event="${p.event}" aria-pressed="false">${escapeText(p.text)}</button>`).join('')}</div></div>`;
}
function emotionPassageHTML(p){const words=emotionWords([p.event]);return `<div class="passage-emotions" aria-label="이 구간의 원본 감정어">${words.map(w=>`<button class="emotion-word ${w.tone}" data-emotion-word aria-pressed="false">${escapeText(w.text)}</button>`).join('')}</div>`;}
function panoramaHTML(){
 const labels=[['집',910,2270],['지하철',945,2287],['카페',1002,2274],['버스',1124,2274],['집',1185,2270],['고속도로',1249,2274],['오이도',1396,2287],['고속도로',1522,2280],['집',1602,2267]];
 return `<section class="panorama-section" aria-labelledby="panorama-title"><div class="panorama-heading"><h2 id="panorama-title">파노라마의 형식으로, 감정에 집중하여.</h2><button id="panorama-zoom" aria-pressed="false">감정어 확대해서 읽기 ＋</button></div><p class="image-caption">감정어를 중심으로 그때의 경험을 살펴보는 가이드라인이 된다.<br>확대 후 가로로 밀어 읽을 수 있습니다.</p><div class="panorama-scroll" tabindex="0" role="region" aria-label="원본 파노라마와 55개 감정어. 확대 후 가로 스크롤"><svg class="panorama-complete" viewBox="899 2128 737 165" role="img" aria-label="원본 파노라마: 집, 지하철, 카페, 버스, 집, 고속도로, 오이도, 고속도로, 집"><image href="panorama.svg" x="899" y="2128" width="737" height="132"/>${EMOTION_WORDS.map(w=>`<text x="${w.x}" y="${w.y+w.size*.84}" font-size="${w.size}" fill="${EMOTION_COLORS[w.tone]}">${escapeText(w.text)}</text>`).join('')}${labels.map(([label,x,y])=>`<text x="${x}" y="${y}" font-size="7" fill="#303530">${label}</text>`).join('')}</svg></div><div class="panorama-word-flow">${Object.entries(EMOTION_EVENT_RANGES).map(([event])=>`<div><h3><button data-panorama-event="${event}">${escapeText(EVENTS.find(e=>e.id===event).label)}</button></h3><p>${emotionWords([event]).map(w=>`<button class="emotion-word ${w.tone}" data-emotion-word aria-pressed="false">${escapeText(w.text)}</button>`).join('')}</p></div>`).join('')}</div></section>`;
}
function updateEmotionContext(){
 const layer=$('story').querySelector('[data-emotion-scene="scene-03"]');if(!layer)return;
 const event=state.eventId==='station-confirmed'?'station-confirmed':'locate-oido';
 if(layer.dataset.wordEvent===event)return;
 const words=emotionWords([event]),scene=SCENES.find(s=>s.id==='scene-03'),[w,h]=scene.size;
 const svg=layer.querySelector('.emotion-composition');svg.querySelectorAll('.emotion-ink').forEach(el=>el.remove());svg.insertAdjacentHTML('beforeend',emotionWordSVG(words,w,h));
 layer.querySelector('.emotion-reading').innerHTML=words.map(p=>`<button class="emotion-word ${p.tone}" data-emotion-word data-emotion-event="${p.event}" aria-pressed="false">${escapeText(p.text)}</button>`).join('');
 layer.dataset.wordEvent=event;
}
