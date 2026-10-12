'use strict';
const Immersion=(()=>{
 const root=$('immersion'),scroll=$('im-scroll'),canvas=$('im-canvas'),ctx=canvas.getContext('2d',{alpha:false});
 const images=new Map(),cuts=new Map(),imagePromises=new Map(),touched=new Set();
 const names=['home-start','home-location','home-end','cafe','oido','subway-people','subway-empty','subway-phone','landscape-mint','voice-mint','sky-drive','sea-return','helicopter'];
 let opened=false,saved=null,origin=null,frame=0,lastFrame=0,start=0,W=1,H=1,dpr=1,chapter=-1,position=0,held=false,quiet=false,actionTime=-1000,actionStage=-1,windowOpen=.12,look=0,memory='',audio=null,sound=false,audioGeneration=0,pointer={x:.65,y:.45},drag=null,ignoreClickUntil=0;
 const span=1.7,N=IMMERSIVE_CHAPTERS.length;
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));const ease=x=>x*x*(3-2*x);const lerp=(a,b,t)=>a+(b-a)*t;
 function load(name){
  if(imagePromises.has(name))return imagePromises.get(name);
  const im=new Image();im.src=name==='panorama'?'panorama-depth.svg':`${name}.webp`;images.set(name,im);
  const promise=im.decode().then(()=>true).catch(()=>false);imagePromises.set(name,promise);return promise;
 }
 function crop(sceneId,partId){
  const key=`${sceneId}:${partId}`;if(cuts.has(key))return cuts.get(key);
  const n=NATIVE_SCENES[sceneId],src=images.get(n.asset);if(!src?.complete||!src.naturalWidth)return null;
  const part=n.parts.find(p=>p.id===partId);if(!part)return null;
  const b=partBounds(part,n.size),scale=Math.min(1,1000/Math.max(b[2],b[3])),c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(b[2]*scale));c.height=Math.max(1,Math.ceil(b[3]*scale));
  const g=c.getContext('2d');g.scale(scale,scale);g.translate(-b[0],-b[1]);g.beginPath();
  if(part.ellipse){const [x,y,rx,ry]=part.ellipse;g.ellipse(x*n.size[0],y*n.size[1],rx*n.size[0],ry*n.size[1],0,0,Math.PI*2);}else{part.points.forEach(([x,y],i)=>i?g.lineTo(x*n.size[0],y*n.size[1]):g.moveTo(x*n.size[0],y*n.size[1]));g.closePath();}
  g.clip();g.drawImage(src,0,0,n.size[0],n.size[1]);cuts.set(key,c);return c;
 }
 function source(key){if(key.includes(':'))return crop(...key.split(':'));const im=images.get(key);return im?.complete&&im.naturalWidth?im:null;}
 function photo(key,x,y,width,opts={}){
  const im=source(key);if(!im)return;const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,height=width*ih/iw;
  ctx.save();ctx.globalAlpha*=opts.alpha??1;ctx.translate(x,y);ctx.rotate(opts.angle||0);
  if(opts.filter)ctx.filter=opts.filter;
  if(opts.shadow&&!isQuiet()){ctx.shadowColor=opts.shadow;ctx.shadowBlur=Math.min(W*.035,45);ctx.shadowOffsetY=12;}
  ctx.drawImage(im,-width/2,-height/2,width,height);ctx.restore();
 }
 function cover(key,x,y,w,h,alpha=.5){const im=source(key);if(!im)return;const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,ratio=Math.max(w/iw,h/ih);ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(im,x+(w-iw*ratio)/2,y+(h-ih*ratio)/2,iw*ratio,ih*ratio);ctx.restore();}
 function isQuiet(){return quiet||reduced.matches;}
 function syncMotion(){const b=$('im-motion');b.setAttribute('aria-pressed',isQuiet());b.textContent=isQuiet()?'움직임 줄임':'움직임';b.title=reduced.matches?'기기의 동작 줄이기 설정을 따릅니다':'떠다니는 움직임을 줄이거나 다시 켭니다';}
 function mobile(){return W<700;}
 function word(text,x,y,size,color,alpha=1,angle=0){ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.font=`400 ${size}px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;ctx.fillText(text,0,0);ctx.restore();}
 function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
 function ring(x,y,r,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,Math.max(1,r),0,Math.PI*2);ctx.stroke();ctx.restore();}
 function paths(p,merge=false){
  const x=W*(mobile()?.52:.67),y=H*.43,separation=(merge?1-ease(p):.8+.2*Math.sin(p*Math.PI))*W*.19;
  const colors=['#a4a1de','#d35d9b','#6ba6c5'];
  colors.forEach((color,i)=>{const sy=H*(.27+i*.18),ey=y+(i-1)*separation*.58;ctx.save();ctx.strokeStyle=color;ctx.globalAlpha*=.65;ctx.lineWidth=mobile()?1:1.2;ctx.beginPath();ctx.moveTo(W*.11,sy);ctx.bezierCurveTo(W*.38,sy,W*.42,ey,x+(i-1)*separation,ey);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+(i-1)*separation,ey,4,0,7);ctx.fill();ctx.restore();});
 }
 function constellation(words,t,p,color,scatter=1){
  const spread=held?.35:1;
  words.forEach((s,i)=>{
   const angle=i*2.399+t*.045;const radius=(mobile()?.26:.31)*Math.min(W,H)*scatter*spread;
   const x=W*(mobile()?.52:.68)+Math.cos(angle)*radius,y=H*.4+Math.sin(angle)*radius*.8;
   word(s,x,y,mobile()?12:16,color,.2+.4*(.5+.5*Math.sin(i+t*.7)),Math.sin(i)*.06);
  });
 }
 function fragments(keys,t,p,centerX=W*.7){
  const s=mobile()?W*.37:W*.2;
  keys.forEach((key,i)=>{const phase=i*2.4+t*.06,rx=Math.cos(phase)*W*(mobile()?.22:.19),ry=Math.sin(phase)*H*.18;photo(key,centerX+rx+look*W*.14,H*.43+ry,s*(.7+i%2*.22),{angle:Math.sin(phase)*.08,alpha:.85,shadow:'#091d1740'});});
 }
 function scene(index,p,t){
  const c=IMMERSIVE_CHAPTERS[index],m=mobile(),cx=W*(m?.5:.69),cy=H*(m?.33:.45),unit=Math.min(W,H*1.5),drift=isQuiet()?0:Math.sin(t*.5)*8,pan=isQuiet()?0:(pointer.x-.5)*28;
  const act=actionStage===index?Math.exp(-Math.max(0,t-actionTime)*.9):0;
  if(index===0){
   glow(cx,cy,W*.5,'#cbd9c010');photo('home-start',cx+pan,H*.46+drift,unit*(m?1.05:.96),{filter:'grayscale(1) brightness(.75)',alpha:.65});
   photo('scene-01:bag',cx+W*.035,cy+H*.03,unit*(m?.31:.20)*(1+act*.25),{angle:-.09+Math.sin(t*.35)*.02,shadow:'#00000099'});
   photo('scene-01:clock',W*.83,H*.22,unit*.13,{alpha:.7,angle:.05});
   for(let i=0;i<4;i++)word(c.words[i%3],W*(.46+i*.12),H*(.18+(i%2)*.15),m?11:15,'#e8e4d6',.13);
   ring(cx,cy+H*.02,unit*(.14+act*.18),'#dce7d0',act*.45);
  }else if(index===1){
   cover('subway-empty',W*.25,-H*.12,W*.8,H*1.2,.28);
   for(let i=0;i<5;i++){ctx.save();ctx.beginPath();ctx.rect(W*(.27+i*.155)-p*W*.24,0,W*.14,H);ctx.clip();cover(i%2?'subway-people':'subway-phone',W*.2-p*W*.24,0,W*.82,H,.28+i*.08);ctx.restore();}
   photo('scene-01:bag',cx-W*(p*.6+act*.25),cy+H*p*.16,unit*.24*(1-p*.7),{angle:-p*.8,alpha:1-p});
   ctx.strokeStyle='#dbe2dd30';for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(W*(i*.2-p*.15),0);ctx.lineTo(W*(i*.2-p*.15),H);ctx.stroke();}
   word('아직 모른다.',W*.72,H*.52,m?14:19,'#eae6d7',ease(clamp((p-.3)/.4))*.55);
  }else if(index===2){
   const jitter=isQuiet()||held?0:(Math.sin(t*9)+Math.sin(t*13))*(2+act*3);
   glow(cx,cy,W*.62,'#e93b291c');photo('cafe',cx+pan+jitter,cy,unit*1.12,{alpha:.16,filter:'grayscale(1)'});
   photo('scene-02:back',cx+W*.02+jitter,cy+drift,unit*(m?.48:.38),{angle:.05+jitter*.002,shadow:'#00000066'});
   photo('scene-02:location',cx-W*.22-jitter,H*.32,unit*.22,{angle:-.17,alpha:.8});
   photo('scene-02:route',cx+W*.20+jitter,H*.47,unit*.21,{angle:.19,alpha:.7});
   constellation(c.words,t,p,'#f17668',1.4);if(held)ring(cx,cy,unit*.25,'#c1cab3',.6);
  }else if(index===3){
   paths(p);photo('home-location',cx+pan,cy,unit*1.05,{alpha:.10,filter:'grayscale(1)'});
   photo('scene-03:oido-map',cx+W*.04+Math.sin(t*.4)*W*.06,cy-H*.05,unit*.32,{angle:.08,shadow:'#2e000070'});
   photo('scene-03:calls',cx-W*.22,H*.5,unit*.23,{alpha:.65,angle:-.18});
   photo('scene-03:bed',cx+W*.20,H*.3,unit*.24,{alpha:.38,angle:.15});
   for(let i=0;i<4;i++)ring(cx+W*.035,cy,unit*(.07+((t*.12+i*.23+act*.1)%1)*.42),'#ed6252',.32*(1-((t*.12+i*.23)%1)));
   constellation(c.words,t,p,'#f27970',1.25);
  }else if(index===4){
   const lock=touched.has(4)?1:Math.max(ease(clamp(p*1.6)),act);glow(cx,cy,unit*.7,`rgba(121,199,174,${.1+lock*.08})`);paths(lock,true);
   photo('scene-03:message',cx+pan*.25,cy,unit*(m?.60:.37)*(1+lock*.1),{angle:(1-lock)*-.12,shadow:'#80e9c624'});
   ring(cx,cy,unit*(.3+act*.16),'#8bdfbf',.12+act*.4);
   word('확인했다',cx-unit*.18,H*.22,m?13:19,'#b2e8d1',.75);
  }else if(index===5){
   const opening=clamp(touched.has(5)?windowOpen:Math.max(p*.85,windowOpen));
   cover('sky-drive',0,0,W,H,.38);cover('landscape-mint',W*.05,H*.32,W*.95,H*.43,.28);
   photo('helicopter',cx+pan*2,H*.29+drift,unit*(m?.58:.47),{alpha:.75,angle:-.07});
   ctx.save();ctx.fillStyle='#091516';ctx.globalAlpha*=.78;ctx.fillRect(W*opening,0,W*(1-opening),H);ctx.strokeStyle='#c6e6d78c';ctx.beginPath();ctx.moveTo(W*opening,0);ctx.lineTo(W*opening,H);ctx.stroke();ctx.restore();
   for(let i=0;i<24;i++){const u=(i*.137+t*(.08+opening*.14))%1,y=H*(.12+(i%11)*.055);ctx.strokeStyle=`rgba(185,231,215,${opening*.23})`;ctx.beginPath();ctx.moveTo(W*u,y);ctx.quadraticCurveTo(W*u+W*.05,y-8,W*u+W*.11,y+3);ctx.stroke();}
   photo('voice-mint',W*.83,H*.59,unit*.20,{alpha:opening*.32,angle:.06});
  }else if(index===6){
   const join=touched.has(6)?1:Math.max(ease(clamp(p*1.7)),act);paths(join,true);
   photo('oido',cx+pan,cy+H*.07,unit*1.10,{alpha:.18+join*.27,filter:'grayscale(1)'});
   photo('scene-05:station',cx+W*.19*(1-join),cy-H*.12,unit*.28,{angle:.05*(1-join),alpha:.8});
   photo('scene-05:bag',cx,cy+H*.05,unit*(m?.33:.24)*(1+join*.13),{angle:-.1*(1-join),shadow:'#1c5b4430'});
   for(let i=0;i<3;i++)ring(cx,cy,unit*(.11+i*.035+act*.22),'#46896e',.3*(1-i*.2));
   if(act>.1)glow(cx,cy,unit*.5,`rgba(243,255,239,${act*.4})`);
  }else if(index===7){
   cover('sea-return',0,H*.08,W,H*.65,.33);photo('panorama',W*.55+look*W*.2,H*.62,W*1.7,{alpha:.25});
   photo('oido',cx+look*W*.24,H*.51,unit*1.13,{alpha:.38});
   const keys=['scene-05:family','scene-05:food','scene-05:shell','scene-05:sea'];
   keys.forEach((key,i)=>{const a=i*1.95+t*.027+p*.6;photo(key,cx+Math.cos(a)*W*(m?.24:.24)+look*W*.19,H*.36+Math.sin(a)*H*.20,unit*(i===0?.30:.24),{angle:Math.sin(a)*.09,shadow:'#234e361a',alpha:.91});});
   for(let i=0;i<6;i++){ctx.strokeStyle='#477b6718';ctx.beginPath();for(let x=0;x<=W;x+=12){const y=H*.68+i*13+Math.sin(x/W*8+t*.6+i)*5;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
  }else{
   photo('home-end',cx+pan*.35,cy+H*.05,unit*(1.01-p*.14),{alpha:.30,filter:'grayscale(1)'});
   fragments(['scene-06:photos','scene-05:family','scene-05:shell','scene-05:sea'],t,p,cx);
   const fade=ease(clamp((p-.35)/.65));ctx.save();ctx.globalAlpha*=fade*.6;ctx.fillStyle='#0f1e1d';ctx.fillRect(0,0,W,H);ctx.restore();
   if(memory)word(memory,cx-unit*.12,H*.35,m?25:46,'#c8ebd5',.9);else word('여운이남다',cx-unit*.1,H*.35,m?18:29,'#a7d2bb',.65);
   ring(cx,cy,unit*(.25+p*.1),'#a3c4b1',.13);
  }
 }
 function frameDraw(now){
  frame=0;if(!opened||document.hidden)return;
  const still=isQuiet(),interval=mobile()?42:33;
  if(!still&&now-lastFrame<interval){frame=requestAnimationFrame(frameDraw);return;}lastFrame=now;
  const t=still?0:(now-start)/1000;position=scroll.scrollTop/(Math.max(1,H)*span);
  const index=Math.min(N-1,Math.floor(position)),p=clamp(position-index),cross=index<N-1?ease(clamp((p-.85)/.15)):0;
  if(chapter!==index)changeChapter(index);
  const bg=IMMERSIVE_CHAPTERS[index].bg,next=IMMERSIVE_CHAPTERS[Math.min(N-1,index+1)].bg;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.fillStyle=`rgb(${bg.map((v,i)=>Math.round(lerp(v,next[i],cross))).join(',')})`;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=1-cross;scene(index,p,t);ctx.restore();
  if(cross>0){ctx.save();ctx.globalAlpha=cross;scene(index+1,0,t);ctx.restore();}
  // A soft veil keeps the narrative readable while photographs fill the entire field.
  const veil=ctx.createLinearGradient(0,0,W,0),light=index===6||index===7;
  veil.addColorStop(0,light?'rgba(207,226,216,.94)':'rgba(5,9,10,.86)');veil.addColorStop(.36,light?'rgba(207,226,216,.68)':'rgba(5,9,10,.50)');veil.addColorStop(mobile()?.85:.65,'transparent');ctx.fillStyle=veil;ctx.fillRect(0,0,W,H);
  if(mobile()){const v=ctx.createLinearGradient(0,H*.35,0,H*.92);v.addColorStop(0,'transparent');v.addColorStop(.42,light?'rgba(207,226,216,.87)':'rgba(8,16,17,.87)');v.addColorStop(1,light?'rgba(207,226,216,.98)':'rgba(8,16,17,.98)');ctx.fillStyle=v;ctx.fillRect(0,H*.35,W,H*.65);}
  root.style.setProperty('--im-progress',clamp(position/N));root.style.setProperty('--im-local',p);root.dataset.light=light?'true':'false';
  if(sound&&audio){if(audio.lastIndex!==index){audio.gain.gain.setTargetAtTime((index===2||index===3) ? .043 : .026,audio.context.currentTime,.6);audio.lastIndex=index;}const frequency=Math.round(index===5?600+(touched.has(5)?windowOpen:Math.max(p*.85,windowOpen))*1800:index===7?1800:700);if(audio.lastFrequency!==frequency){audio.filter.frequency.setTargetAtTime(frequency,audio.context.currentTime,.7);audio.lastFrequency=frequency;}}
  if(!still)frame=requestAnimationFrame(frameDraw);
 }
 function requestDraw(){if(opened&&!frame)frame=requestAnimationFrame(frameDraw);}
 function resize(){
  if(!opened)return;const old=H>1?scroll.scrollTop/(H*span):0;
  W=root.clientWidth;H=root.clientHeight;dpr=Math.min(devicePixelRatio||1,mobile()?1.25:1.5);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);canvas.style.width=`${W}px`;canvas.style.height=`${H}px`;
  $('im-track').style.height=`${(N*span+1)*H}px`;scroll.scrollTop=old*H*span;requestDraw();
 }
 function changeChapter(index){
  chapter=index;held=false;drag=null;const c=IMMERSIVE_CHAPTERS[index];
  if(audio){const base=[55,49,55,55,55,65,73,82,55][index];audio.oscillators.forEach((o,i)=>o.frequency.setTargetAtTime(base*(index===2||index===3?[1,1.037,2.02][i]:[1,1.498,2.004][i]),audio.context.currentTime,1.2));}
  root.dataset.chapter=c.id;root.style.setProperty('--im-accent',c.color);$('im-place').textContent=c.place;$('im-counter').textContent=`${String(index+1).padStart(2,'0')} / 09`;
  $('im-title').textContent=c.title;$('im-copy-text').textContent=c.copy;$('im-help').textContent=c.hint;$('im-action').textContent=c.action;$('im-action').setAttribute('aria-pressed',index===5?touched.has(5)&&windowOpen>.8:touched.has(index));if(index===5&&windowOpen>.8)$('im-action').textContent='창문을 닫다';
  $('im-live').textContent=`${c.place}. ${c.title.replace('\n',' ')}`;
  $('im-previous').disabled=index===0;$('im-next').hidden=index===N-1;$('im-restart').hidden=index!==N-1;$('im-memories').hidden=index!==N-1;
  document.querySelectorAll('[data-im-chapter]').forEach((b,i)=>{b.classList.toggle('current',i===index);b.setAttribute('aria-current',i===index?'step':'false');});
  if(!isQuiet())$('im-copy').animate([{opacity:0,translate:'0 14px'},{opacity:1,translate:'0 0'}],{duration:550,easing:'ease-out'});
 }
 function seek(index){scroll.scrollTo({top:clamp(index,0,N-1)*H*span+H*.13,behavior:isQuiet()?'auto':'smooth'});requestDraw();}
 function trigger(){
  const t=(performance.now()-start)/1000;actionStage=chapter;actionTime=t;touched.add(chapter);
  if(chapter===5){windowOpen=windowOpen>.8?.16:1;$('im-action').textContent=windowOpen>.8?'창문을 닫다':'창문을 열다';}
  if(chapter===7)look=look>.1?-.6:.6;
  if(chapter===8){memory=memory||'여운이남다';document.querySelector('[data-im-memory="여운이남다"]').setAttribute('aria-pressed','true');}
  $('im-action').setAttribute('aria-pressed',chapter===5?windowOpen>.8:true);requestDraw();
 }
 async function open(button){
  if(opened||state.transition)return;origin=button;saved={screen:state.screen,view:state.view,scrollTop:story.scrollTop,anchor:activeAnchor,released:releasedAnchor,accum:scrollAccum,event:state.eventId,width:story.clientWidth,height:story.clientHeight};
  closeInspection(false);cancelSnap();setMenu(false);clearTimeout(idleTimer);hint.classList.remove('visible');$('art-cursor').hidden=true;
  $('immersive-view').setAttribute('aria-pressed','true');state.screen='immersive';intro.hidden=true;experience.hidden=true;detail.hidden=true;root.hidden=false;document.body.classList.add('immersing');opened=true;chapter=-1;held=false;touched.clear();memory='';windowOpen=.12;look=0;actionTime=-1000;actionStage=-1;root.dataset.assetsReady='false';start=performance.now();lastFrame=0;scroll.scrollTop=0;
  document.querySelectorAll('[data-im-memory]').forEach(b=>b.setAttribute('aria-pressed','false'));$('im-loading').hidden=false;resize();syncMotion();changeChapter(0);$('im-title').focus({preventScroll:true});requestDraw();
  const essential=['home-start','subway-empty','subway-phone','cafe'];await Promise.all(essential.map(load));
  $('im-loading').hidden=true;requestDraw();Promise.all([...names,'panorama'].map(load)).then(results=>{root.dataset.assetsReady=results.every(Boolean)?'true':'partial';requestDraw();});
 }
 function close(target=null){
  if(!opened)return;opened=false;$('immersive-view').setAttribute('aria-pressed','false');cancelAnimationFrame(frame);frame=0;held=false;drag=null;stopAudio();root.hidden=true;document.body.classList.remove('immersing');
  const url=new URL(location.href);if(url.searchParams.get('mode')==='immersive'){url.searchParams.delete('mode');history.replaceState(null,'',url);}
  state.screen=saved.screen;state.view=saved.view;intro.hidden=saved.screen!=='intro';experience.hidden=saved.screen!=='story';detail.hidden=true;
  if(saved.screen==='story'){story.scrollTop=saved.scrollTop;lastScrollTop=saved.scrollTop;activeAnchor=saved.anchor;releasedAnchor=saved.released;scrollAccum=saved.accum;updateMeasurements();if(Math.abs(story.clientWidth-saved.width)>2||Math.abs(story.clientHeight-saved.height)>2)jumpToEvent(saved.event);}
  if(target){if(state.screen==='intro')enterStory();setView(target);$('data-view').setAttribute('aria-pressed',target==='data');$('emotion-view').setAttribute('aria-pressed',target==='emotion');}
  interact();(target?story:origin)?.focus({preventScroll:true});
 }
 function stopAudio(){audioGeneration++;if(!audio)return;audio.gain.gain.setTargetAtTime(0,audio.context.currentTime,.03);const old=audio;audio=null;sound=false;$('im-sound').setAttribute('aria-pressed','false');$('im-sound').textContent='소리 꺼짐';setTimeout(()=>old.context.close().catch(()=>{}),160);}
 async function toggleAudio(){
  if(sound){stopAudio();return;}const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){$('im-sound').textContent='소리 지원 없음';return;}
  const generation=++audioGeneration;let pendingAudio=null;
  try{const a=new Audio(),gain=a.createGain(),oscillators=[];pendingAudio=a;gain.gain.value=0;gain.connect(a.destination);[55,82.4,110.2].forEach((hz,i)=>{const oscillator=a.createOscillator(),g=a.createGain();oscillator.type='sine';oscillator.frequency.value=hz;g.gain.value=.26/(i+1);oscillator.connect(g);g.connect(gain);oscillator.start();oscillators.push(oscillator);});
   const buffer=a.createBuffer(1,a.sampleRate*3,a.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.35;
   const noise=a.createBufferSource(),filter=a.createBiquadFilter();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=700;noise.connect(filter);filter.connect(gain);noise.start();await a.resume();if(!opened||generation!==audioGeneration){a.close().catch(()=>{});return;}audio={context:a,gain,filter,oscillators};sound=true;const base=[55,49,55,55,55,65,73,82,55][Math.max(0,chapter)];oscillators.forEach((o,i)=>o.frequency.setTargetAtTime(base*((chapter===2||chapter===3)?[1,1.037,2.02][i]:[1,1.498,2.004][i]),a.currentTime,1.2));gain.gain.setTargetAtTime(.026,a.currentTime,.5);$('im-sound').setAttribute('aria-pressed','true');$('im-sound').textContent='소리 켜짐';
  }catch{pendingAudio?.close().catch(()=>{});$('im-sound').textContent='소리 지원 없음';}
 }
 function init(){
  $('immersive-view').addEventListener('click',e=>open(e.currentTarget));
  $('im-exit').addEventListener('click',()=>close());$('im-data').addEventListener('click',()=>close('data'));$('im-emotion').addEventListener('click',()=>close('emotion'));
  $('im-previous').addEventListener('click',()=>seek(chapter-1));$('im-next').addEventListener('click',()=>seek(chapter+1));$('im-restart').addEventListener('click',()=>{memory='';windowOpen=.12;look=0;touched.clear();actionTime=-1000;actionStage=-1;start=performance.now();scroll.scrollTo({top:0,behavior:'auto'});chapter=-1;requestDraw();document.querySelectorAll('[data-im-memory]').forEach(b=>b.setAttribute('aria-pressed','false'));});
  $('im-chapters').innerHTML=IMMERSIVE_CHAPTERS.map((c,i)=>`<button data-im-chapter="${i}" aria-label="${i+1}. ${c.place} 장면으로 이동"><span>${String(i+1).padStart(2,'0')}</span></button>`).join('');
  $('im-chapters').addEventListener('click',e=>{const b=e.target.closest('[data-im-chapter]');if(b)seek(Number(b.dataset.imChapter));});
  $('im-action').addEventListener('click',()=>{if(performance.now()>=ignoreClickUntil)trigger();});
  $('im-action').addEventListener('pointerdown',e=>{if(chapter===2||chapter===3){held=true;e.currentTarget.setAttribute('aria-pressed','true');e.currentTarget.setPointerCapture(e.pointerId);requestDraw();}if(chapter===5||chapter===7){if(chapter===5)touched.add(5);drag={x:e.clientX,base:chapter===5?windowOpen:look,stage:chapter,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}});
  $('im-action').addEventListener('pointermove',e=>{if(!drag)return;const delta=(e.clientX-drag.x)/Math.max(120,W*.4);if(Math.abs(e.clientX-drag.x)>6)drag.moved=true;if(drag.stage===5)windowOpen=clamp(drag.base+delta,.08,1);else look=clamp(drag.base+delta,-1,1);if(chapter===5){$('im-action').textContent=windowOpen>.8?'창문을 닫다':'창문을 열다';$('im-action').setAttribute('aria-pressed',windowOpen>.8);}requestDraw();});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])$('im-action').addEventListener(name,()=>{if(drag?.moved)ignoreClickUntil=performance.now()+220;held=false;drag=null;requestDraw();});
  $('im-action').addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)&&(chapter===2||chapter===3)){held=true;requestDraw();}});$('im-action').addEventListener('keyup',()=>{held=false;requestDraw();});
  $('im-memories').addEventListener('click',e=>{const b=e.target.closest('[data-im-memory]');if(!b)return;memory=b.dataset.imMemory;document.querySelectorAll('[data-im-memory]').forEach(el=>el.setAttribute('aria-pressed',el===b));requestDraw();});
  $('im-motion').addEventListener('click',()=>{quiet=!quiet;syncMotion();if(frame){cancelAnimationFrame(frame);frame=0;}requestDraw();});$('im-sound').addEventListener('click',toggleAudio);
  root.addEventListener('pointerdown',e=>{if(chapter===7&&e.pointerType!=='mouse'&&e.target.closest('#im-scroll')){drag={x:e.clientX,base:look,stage:7,surface:true};e.currentTarget.setPointerCapture(e.pointerId);}});
  root.addEventListener('pointermove',e=>{if(drag?.surface){look=clamp(drag.base+(e.clientX-drag.x)/Math.max(120,W*.4),-1,1);requestDraw();}},{passive:true});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(event,()=>{if(drag?.surface)drag=null;});
  scroll.addEventListener('scroll',requestDraw,{passive:true});root.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&!drag){pointer={x:e.clientX/Math.max(1,W),y:e.clientY/Math.max(1,H)};if(chapter===7)look=(pointer.x-.5)*1.2;requestDraw();}},{passive:true});
  document.addEventListener('keydown',e=>{if(!opened)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}if(e.target.closest('button,a')&&['Enter',' '].includes(e.key))return;
   if(['ArrowDown','PageDown',' ','ArrowUp','PageUp','ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(e.key==='ArrowRight')seek(chapter+1);else if(e.key==='ArrowLeft')seek(chapter-1);else if(e.key==='Home')seek(0);else if(e.key==='End')seek(N-1);else scroll.scrollBy({top:H*(e.key.startsWith('Page')?.8:.3)*(['ArrowUp','PageUp'].includes(e.key)?-1:1),behavior:isQuiet()?'auto':'smooth'});}
  },true);
  window.addEventListener('resize',resize);window.addEventListener('blur',()=>{held=false;drag=null;});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;if(audio)audio.context.suspend();}else{if(audio&&sound)audio.context.resume();requestDraw();}});reduced.addEventListener('change',()=>{syncMotion();if(frame){cancelAnimationFrame(frame);frame=0;}requestDraw();});
 }
 init();if(new URLSearchParams(location.search).get('mode')==='immersive')requestAnimationFrame(()=>open($('start-immersion')));return {open,close};
})();
