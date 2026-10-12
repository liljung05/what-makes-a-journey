'use strict';
const IntroGateway=(()=>{
 const modes=$('intro-modes'),prompt=$('intro-reveal'),vortex=$('entry-vortex');
 let entering=false;
 function reveal(focus=false){
  if(state.screen!=='intro'||entering)return;
  if(modes.hidden){modes.hidden=false;prompt.hidden=true;prompt.setAttribute('aria-expanded','true');requestAnimationFrame(()=>intro.classList.add('modes-revealed'));$('event-live').textContent='자료, 감정, 몰입. 세 가지 방식 중 여정을 골라 주세요.';}
  if(focus)$('start').focus({preventScroll:true});interact();
 }
 async function animate(el,frames,options){const a=el.animate(frames,{fill:'both',...options});try{await a.finished;}catch{}return a;}
 async function enter(mode,button){
  if(entering||state.screen!=='intro'||state.transition)return;
  entering=true;state.transition=true;clearTimeout(idleTimer);hint.classList.remove('visible');intro.inert=true;
  const animations=[];let destination;
  try{
   if(!reduced.matches){
    vortex.hidden=false;vortex.dataset.mode=mode;vortex.classList.add('drawing-in');
    animations.push(await animate(intro,[{transform:'perspective(900px) translateZ(0) scale(1)',filter:'blur(0px)',opacity:1},{transform:'perspective(900px) translateZ(80px) scale(1.035)',filter:'blur(0px)',opacity:1,offset:.18},{transform:'perspective(900px) translateZ(-1000px) scale(.025)',filter:'blur(12px)',opacity:0}],{duration:850,easing:'cubic-bezier(.68,0,.72,.45)'}));
   }
   state.transition=false;
   if(mode==='immersive'){destination=$('immersion');Immersion.open(button);}else{enterStory();setView(mode);destination=experience;}
   state.transition=true;
   if(!reduced.matches){
    vortex.classList.remove('drawing-in');vortex.classList.add('opening-out');
    animations.push(await animate(destination,[{transform:'perspective(1100px) translateZ(-300px) scale(.72)',filter:'blur(9px)',opacity:.2},{transform:'perspective(1100px) translateZ(0) scale(1)',filter:'blur(0px)',opacity:1}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'}));
   }
  }finally{
   animations.forEach(a=>a.cancel());vortex.hidden=true;vortex.classList.remove('drawing-in','opening-out');intro.inert=false;state.transition=false;entering=false;
   if(state.screen==='story'){MotionPoster.queue();story.focus({preventScroll:true});}scheduleIdle();
  }
 }
 intro.addEventListener('click',e=>{const button=e.target.closest('[data-entry-mode]');if(button){enter(button.dataset.entryMode,button);return;}reveal(e.detail===0);});
 return {reveal,enter};
})();
