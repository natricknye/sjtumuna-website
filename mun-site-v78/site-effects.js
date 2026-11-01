(() => {
  'use strict';
  const body = document.body;
  const staticPort=Boolean(document.querySelector('#delegate-form, #president-form'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  body.classList.add('site-fx');
  if(staticPort)body.classList.add('fx-static');
  const ambient = document.createElement('div');
  ambient.className = 'site-ambient'; ambient.setAttribute('aria-hidden','true');
  body.prepend(ambient);
  const light = document.createElement('div');
  light.className = 'site-cursor-light'; light.setAttribute('aria-hidden','true');
  body.append(light);
  let frame=0,lastTime=0,level=0,target=0,scrollDirty=true,pointerDirty=false,x=0,y=0;
  let wheelTarget=null;
  const home=body.classList.contains('home-page');
  const forum=body.classList.contains('forum-page');
  const committeeAtlas=document.querySelector('.committee-atlas');
  const registration=forum?document.querySelector('#forum-registration'):null;
  const smoothstep=t=>{const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v);};
  const forumLevel=(position,total)=>{
    if(!registration||total<=0)return 0;
    const box=registration.getBoundingClientRect();
    const top=box.top+scrollY,bottom=box.bottom+scrollY;
    // Anchor the dark plateau to the form, not an arbitrary percentage.
    // The plateau expands automatically when selecting a role adds fields.
    const start=Math.min(total*.65,Math.max(1,top-innerHeight*.6));
    const end=Math.max(start,Math.min(total*.9,bottom-innerHeight*.35));
    if(position<start)return smoothstep(position/start);
    if(position<=end)return 1;
    return 1-smoothstep((position-end)/Math.max(1,total-end));
  };
  const slowScenes=home?[...document.querySelectorAll('[data-atlas-scene]')]:[];
  const globe=home?document.querySelector('.globe-frame'):null;
  const header=document.querySelector('.site-header');
  let cycleActive=false,cycleWeight=0,cyclePhase=0;
  const updateCycle=()=>{
    const box=globe?.getBoundingClientRect();
    const ceiling=Math.max(0,header?.getBoundingClientRect().bottom||0)+8;
    // The frame is rotated 14 degrees: its rectangular bounds are larger than
    // the visible circular globe. Test the disc rather than its empty corners.
    const radius=box?box.height/(Math.cos(14*Math.PI/180)+Math.sin(14*Math.PI/180))/2:0;
    const cy=box?(box.top+box.bottom)/2:0,cx=box?(box.left+box.right)/2:0;
    const full=Boolean(box&&radius>0&&cy-radius>=ceiling&&cy+radius<=innerHeight-8&&cx-radius>=0&&cx+radius<=innerWidth);
    const next=full&&!reduce.matches;
    // Enter at the current brightness, so activating never changes colour abruptly.
    if(next&&!cycleActive&&cycleWeight<.001)cyclePhase=Math.acos(Math.max(-1,Math.min(1,2*level-1)));
    cycleActive=next;
  };
  const mix=(a,b,t)=>`rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(' ')})`;
  const palettes={
    '--fx-surface':[[245,236,230],[22,10,17]],
    '--fx-header-start':[[245,236,230],[48,18,30]],
    '--fx-header-end':[[245,236,230],[16,9,15]],
    '--ink':[[38,25,26],[246,230,221]],
    '--muted':[[113,99,101],[202,178,181]],
    '--card':[[255,250,247],[32,17,25]],
    '--line':[[234,216,209],[88,53,65]],
    '--rose':[[246,223,220],[39,21,30]],
    '--fx-accent':[[120,25,35],[247,213,185]],
    '--fx-link':[[20,90,182],[148,202,255]],
  };
  const paint=()=>{
    body.style.setProperty('--fx-night',level.toFixed(4));
    body.style.setProperty('--fx-dusk','0');
    body.style.setProperty('--fx-cycle',cycleWeight.toFixed(4));
    body.style.setProperty('--fx-terminator',`${Math.cos(cyclePhase)*38}%`);
    Object.entries(palettes).forEach(([key,[a,b]])=>body.style.setProperty(key,mix(a,b,level)));
    // Foreground colours cross over separately: interpolating black into white
    // would make text disappear into a medium-toned background halfway down.
    body.style.setProperty('--ink',level>.58?'#fff7f1':'#26191a');
    body.style.setProperty('--muted',level>.58?'#eedbd4':level>.18?'#39272b':'#716365');
    body.style.setProperty('--fx-accent',level>.5?'#f7d5b9':'#781923');
    body.style.setProperty('--fx-header-ink',level>.46?'#f5e2d9':'#26191a');
    body.classList.toggle('atlas-night',level>.46);
  };
  const request=()=>{if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);};
  const tick=time=>{
    frame=0;
    if(document.hidden)return;
    const dt=Math.min(64,Math.max(1,time-(lastTime||time-16)));lastTime=time;
    if(wheelTarget!==null){
      const gap=wheelTarget-scrollY;
      if(Math.abs(gap)<.5){window.scrollTo({top:wheelTarget,behavior:'instant'});wheelTarget=null;}
      else{window.scrollTo({top:scrollY+gap*(1-Math.exp(-dt/110)),behavior:'instant'});request();}
      scrollDirty=true;
    }
    if(scrollDirty){
      scrollDirty=false;
      const total=Math.max(0,document.documentElement.scrollHeight-innerHeight);
      const progress=total>0?Math.max(0,Math.min(1,scrollY/total)):0;
      body.style.setProperty('--fx-drift',`${reduce.matches?0:Math.min(scrollY*.045,150)}px`);
      // Spread the colour change across almost the whole page, not one viewport.
      const t=Math.max(0,Math.min(1,(progress-.04)/.96));
      const eased=t*t*(3-2*t);
      target=staticPort?0:forum?forumLevel(scrollY,total):home?eased+.16*Math.sin(Math.PI*eased):eased;
      if(committeeAtlas){const atlasTop=committeeAtlas.getBoundingClientRect().top+scrollY;target=smoothstep(scrollY/Math.max(1,atlasTop-innerHeight*.15));}
      if(reduce.matches&&!committeeAtlas)target=0;
      updateCycle();
    }
    if(globe&&(cycleActive||cycleWeight>.0001))updateCycle();
    cycleWeight+=((cycleActive?1:0)-cycleWeight)*(1-Math.exp(-dt/450));
    if(cycleWeight<.0001)cycleWeight=0;
    if(cycleActive||cycleWeight>.0001)cyclePhase+=dt*Math.PI/3000;
    const desired=target*(1-cycleWeight)+(1+Math.cos(cyclePhase))*.5*cycleWeight;
    if(Math.abs(desired-level)>.0003){level+=(desired-level)*(1-Math.exp(-dt/180));paint();request();}
    else if(level!==desired){level=desired;paint();}
    if(cycleActive||cycleWeight>.0001){paint();request();}
    if(pointerDirty){pointerDirty=false;light.style.transform=`translate3d(${x}px,${y}px,0)`;}
  };
  document.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'||!fine.matches||reduce.matches)return;
    x=e.clientX;y=e.clientY;pointerDirty=true;light.classList.add('is-lit');request();
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>light.classList.remove('is-lit'));
  window.addEventListener('scroll',()=>{scrollDirty=true;request();},{passive:true});
  if(slowScenes.length)window.addEventListener('wheel',event=>{
    if(reduce.matches||!fine.matches||event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.cancelable)return;
    if(event.target.closest?.('input,textarea,select,.site-nav,.language-switch'))return;
    const centre=innerHeight*.52;
    const inside=slowScenes.some(scene=>{const bounds=scene.getBoundingClientRect();return bounds.top<=centre&&bounds.bottom>=centre;});
    if(!inside){wheelTarget=null;return;}
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
    const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
    event.preventDefault();
    updateCycle();
    const speed=.4-.3*Math.max(cycleActive?1:0,cycleWeight);
    wheelTarget=Math.max(0,Math.min(max,(wheelTarget??scrollY)+delta*speed));
    request();
  },{passive:false});
  const cancelWheel=()=>{wheelTarget=null;};
  document.addEventListener('keydown',cancelWheel);
  document.addEventListener('pointerdown',cancelWheel);
  window.addEventListener('resize',()=>{wheelTarget=null;scrollDirty=true;request();},{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(()=>{scrollDirty=true;request();}).observe(document.querySelector('main'));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(frame);frame=0;wheelTarget=null;light.classList.remove('is-lit');}
    else{scrollDirty=true;lastTime=0;request();}
  });
  reduce.addEventListener('change',()=>{wheelTarget=null;light.classList.remove('is-lit');scrollDirty=true;request();});
  paint();request();
})();
