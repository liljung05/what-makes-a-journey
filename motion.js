'use strict';
/* Optional interactions, isolated from the poster's source and v3 baseline. */
const MotionPoster=(()=>{
 const defaults={reveal:true,lines:true,depth:true,cursor:true,words:true,pulse:true};
 let options={...defaults},nodes=[],paths=[],frame=0,previousTop=0,velocity=0,pointerArt=null,observer=null,peek=false,initialized=false;
 const seen=new Set();
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 function active(key){return !!options[key]&&!reduced.matches;}
 function mark(el){
  const section=el.closest('[data-scene]');if(!section||seen.has(section.dataset.scene))return;
  seen.add(section.dataset.scene);section.classList.add('motion-entered');section.inert=false;
 }
 function apply(reset=false){
  document.body.classList.toggle('motion-enabled',Object.values(options).some(Boolean));
  for(const key of Object.keys(defaults)){document.body.classList.toggle(`motion-${key}`,active(key));}
  if(reset){if(frame){cancelAnimationFrame(frame);frame=0;}document.body.classList.add('motion-resetting');seen.clear();nodes.forEach(n=>n.classList.remove('motion-entered'));}
  nodes.forEach(n=>n.inert=active('reveal')&&!seen.has(n.dataset.scene));
  if(!active('depth')){nodes.forEach(n=>{n.style.setProperty('--scroll-drift','0px');n.style.setProperty('--record-lean','0deg');});clearTilt();}
  if(!active('cursor'))$('art-cursor').hidden=true;
  if(!active('words'))clearWords();
  if(!active('pulse'))document.querySelectorAll('.event-arrived').forEach(e=>e.classList.remove('event-arrived'));
  if(reset){void story.offsetWidth;requestAnimationFrame(()=>{document.body.classList.remove('motion-resetting');queue();});}else queue();
 }
 function queue(){if(frame)return;frame=requestAnimationFrame(update);}
 function update(){
  frame=0;if(state.screen!=='story'||experience.hidden||inspection)return;
  const r=story.getBoundingClientRect(),reading=story.clientHeight-(narrow.matches?$('context').offsetHeight:0),lineY=story.scrollTop+reading*.77;
  const currentTop=story.scrollTop;velocity=clamp(currentTop-previousTop,-40,40);previousTop=currentTop;
  nodes.forEach(n=>{
   const target=n.querySelector('.scene-art,.record-photos'),b=target.getBoundingClientRect(),y=b.top-r.top;
   if(y<reading*.88&&y+b.height>0)mark(target);
   if(active('depth')&&y<reading+100&&y+b.height>-100){const distance=(y+b.height/2-reading*.5)/Math.max(1,reading);n.style.setProperty('--scroll-drift',`${clamp(-distance*24,-16,16).toFixed(2)}px`);n.style.setProperty('--record-lean',`${(velocity*.022).toFixed(2)}deg`);}
  });
  paths.forEach(p=>{
   const a=Number(p.dataset.fromY),b=Number(p.dataset.toY),progress=clamp((lineY-a)/Math.max(1,b-a));
   p.style.strokeDashoffset=active('lines')?String(1-progress):'0';
  });
  const progress=clamp(currentTop/Math.max(1,story.scrollHeight-story.clientHeight));$('journey-progress').style.setProperty('--journey-progress',progress);
 }
 function registerPaths(){paths=[...$('connections').querySelectorAll('path')];paths.forEach(p=>{p.setAttribute('pathLength','1');p.style.strokeDasharray='1';});queue();}
 function eventChanged(event){
  document.documentElement.style.setProperty('--journey-tone',event.color);
  const item=$('timeline').querySelector(`[data-id="${event.id}"]`);item?.classList.add('motion-visited');
  if(active('pulse')){const panel=$('context');panel.classList.remove('event-arrived');void panel.offsetWidth;panel.classList.add('event-arrived');}
  queue();
 }
 function clearTilt(){if(pointerArt){pointerArt.style.setProperty('--pointer-rx','0deg');pointerArt.style.setProperty('--pointer-ry','0deg');pointerArt=null;}}
 function pointerMove(e){
  if(state.screen!=='story'||inspection||e.pointerType!=='mouse')return;
  const art=e.target.closest('.scene-art'),photo=e.target.closest('.record-photo'),target=art||photo;
  if(pointerArt!==art)clearTilt();
  if(art&&active('depth')){const b=art.getBoundingClientRect();pointerArt=art;art.style.setProperty('--pointer-rx',`${clamp(-(e.clientY-b.top-b.height/2)/b.height*3,-1.5,1.5)}deg`);art.style.setProperty('--pointer-ry',`${clamp((e.clientX-b.left-b.width/2)/b.width*3,-1.5,1.5)}deg`);}
  const cursor=$('art-cursor');if(!target||!active('cursor')){cursor.hidden=true;return;}
  cursor.hidden=false;cursor.style.transform=`translate(${e.clientX+17}px,${e.clientY+18}px)`;cursor.querySelector('span').textContent=e.target.closest('.photo-target')||photo?'사진 읽기':'단계 읽기';
 }
 function setPeek(on){peek=on&&state.view==='emotion'&&state.screen==='story';experience.classList.toggle('source-peek',peek);$('source-peek').setAttribute('aria-pressed',peek);}
 function clearWords(){document.querySelectorAll('.word-lit,.word-dim').forEach(el=>el.classList.remove('word-lit','word-dim'));document.querySelectorAll('[data-emotion-word]').forEach(el=>el.setAttribute('aria-pressed','false'));}
 function highlightWord(target,pin=false){
  if(!active('words'))return;
  const section=target.closest('.scene,.native-passage,.panorama-section,#inspection-visual');if(!section)return;
  const word=target.textContent.trim(),was=target.getAttribute('aria-pressed')==='true';clearWords();if(pin&&was)return;
  section.querySelectorAll('.emotion-ink text,.panorama-complete text,[data-emotion-word]').forEach(el=>el.classList.add(el.textContent.trim()===word?'word-lit':'word-dim'));
  if(pin)target.setAttribute('aria-pressed','true');
 }
 function init(){
  if(initialized)return;initialized=true;
  nodes=[...story.querySelectorAll('.scene,.native-passage')];
  for(const node of nodes){
   const art=node.querySelector('.scene-art');if(art){const wrapper=document.createElement('div');wrapper.className='motion-art';while(art.firstChild)wrapper.append(art.firstChild);art.append(wrapper);}
   node.querySelectorAll('.record-photo').forEach((el,i)=>el.style.setProperty('--reveal-index',i));
  }
  $('replay-scene').addEventListener('click',()=>{
   const node=story.querySelector(`[data-scene="${state.sceneId}"]`);if(!node)return;
   closeInspection(false);seen.delete(node.dataset.scene);node.classList.add('motion-replay-reset');node.classList.remove('motion-entered');node.inert=active('reveal');void node.offsetWidth;
   requestAnimationFrame(()=>{node.classList.remove('motion-replay-reset');requestAnimationFrame(()=>{mark(node.querySelector('.scene-art,.record-photos'));queue();});});interact();
  });
  observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)mark(e.target);});queue();},{root:story,rootMargin:'0px 0px -20% 0px',threshold:.08});
  nodes.forEach(n=>observer.observe(n.querySelector('.scene-art,.record-photos')));
  story.addEventListener('scroll',queue,{passive:true});story.addEventListener('pointermove',pointerMove,{passive:true});story.addEventListener('pointerleave',()=>{clearTilt();$('art-cursor').hidden=true;});
  $('source-peek').addEventListener('pointerdown',e=>{e.currentTarget.setPointerCapture(e.pointerId);setPeek(true);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])$('source-peek').addEventListener(event,()=>setPeek(false));
  window.addEventListener('blur',()=>{setPeek(false);clearTilt();$('art-cursor').hidden=true;});
  document.addEventListener('pointerover',e=>{const t=e.target.closest('[data-emotion-word]');if(t)highlightWord(t);});
  document.addEventListener('focusin',e=>{if(inspection)$('art-cursor').hidden=true;const t=e.target.closest('[data-emotion-word]');if(t)highlightWord(t);});
  document.addEventListener('pointerdown',()=>{$('art-cursor').hidden=true;},{passive:true});
  document.addEventListener('focusout',e=>{if(e.target.closest('[data-emotion-word]')&&!document.querySelector('[data-emotion-word][aria-pressed="true"]'))clearWords();});
  document.addEventListener('pointerout',e=>{if(e.target.closest('[data-emotion-word]')&&!document.querySelector('[data-emotion-word][aria-pressed="true"]'))clearWords();});
  document.addEventListener('click',async e=>{
   const word=e.target.closest('[data-emotion-word]');if(word){highlightWord(word,true);interact();}
   const jump=e.target.closest('[data-panorama-event]');if(jump){const id=jump.dataset.panoramaEvent;await closeDetail();setView('emotion');jumpToEvent(id);}
  });
  document.addEventListener('keydown',e=>{
   if(e.key.toLowerCase()==='p'&&state.screen==='story'&&state.view==='emotion'&&!e.repeat&&!e.target.matches('input,textarea')){e.preventDefault();setPeek(true);}
  });
  document.addEventListener('keyup',e=>{if(e.key.toLowerCase()==='p')setPeek(false);});
  reduced.addEventListener('change',()=>apply());apply();
 }
 return {init,queue,registerPaths,eventChanged,setPeek,clearWords,getOptions:()=>({...options}),getSeen:()=>[...seen]};
})();
MotionPoster.init();
