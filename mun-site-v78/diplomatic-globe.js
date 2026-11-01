(() => {
  'use strict';
  const scene=document.querySelector('.home-orbit-scene'),canvas=document.querySelector('#conference-globe');
  if(!scene||!canvas)return;
  const committeeMode=['committees','delegates'].includes(scene.dataset.globeMode),delegateMode=scene.dataset.globeMode==='delegates';
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const world=scene.querySelector('.diplomatic-world'),host=scene.querySelector('.city-pins');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),compact=matchMedia('(max-width: 720px)'),R=Math.PI/180;
  const cities=committeeMode?[
    {zh:'纽约',en:'NEW YORK',lat:40.749,lon:-73.968,to:'#committee-01',entry:'GA2 · 半导体',entryEn:'GA2 · Semiconductors'},
    {zh:'纽约',en:'NEW YORK',lat:40.749,lon:-73.968,to:'#committee-02',entry:'ECOSOC · 萨赫勒',entryEn:'ECOSOC · Sahel'},
    {zh:'伦敦',en:'LONDON',lat:51.504,lon:-.138,to:'#committee-03',entry:'1912 年伦敦会议',entryEn:'London Conference · 1912'},
    {zh:'维也纳',en:'VIENNA',lat:48.235,lon:16.416,to:'#committee-04',entry:'UNODC · 替代发展',entryEn:'UNODC · Alternative development'},
    {zh:'上海',en:'SHANGHAI',lat:31.201,lon:121.434,to:'notice.html',entry:'本届大会 · 徐汇校区',entryEn:'Our conference · Xuhui Campus'},
  ]:[
    {zh:'上海',en:'SHANGHAI',lat:31.2304,lon:121.4737,to:'representative.html',key:'home.delegateTitle',entry:'代表入口'},
    {zh:'伦敦',en:'LONDON',lat:51.5074,lon:-.1278,to:'committees.html',key:'home.committeeCardTitle',entry:'会场与学术团队'},
    {zh:'旧金山',en:'SAN FRANCISCO',lat:37.7749,lon:-122.4194,to:'about.html',key:'home.aboutCardTitle',entry:'大会信息'},
    {zh:'布宜诺斯艾利斯',en:'BUENOS AIRES',lat:-34.6037,lon:-58.3816,to:'forum.html',key:'home.forumTitle',entry:'论坛'},
    {zh:'好望角',en:'CAPE OF GOOD HOPE',lat:-34.3568,lon:18.4972,to:'notice.html',key:'home.noticeCardTitle',entry:'参会须知'},
  ];
  const enEntries=['Delegate Portal','Committees & Academic Teams','Conference Information','Forum','Delegate Information'];
  const english=()=>document.documentElement.lang.startsWith('en');
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
  let yaw=110*R,pitch=.28,frame=0,last=0,lastDraw=0,n=800,width=800,visible=true,drag=null,vx=0,vy=0,rest=0,hover=-1,flight=null,suppressClick=false;
  if(committeeMode)yaw=-28*R;
  let lightPhase=0,night=0,lastNight=-1,labelSizes=[],dirtyLabels=true,solarClock=0,autoSpeed=0;
  const roll=-18*R;
  const sun=[-.72,.3,.6];
  const project=(lon,lat,h=1)=>{
    const x=Math.cos(lat)*Math.sin(lon-yaw),y=Math.sin(lat),z=Math.cos(lat)*Math.cos(lon-yaw);
    const yy=y*Math.cos(pitch)-z*Math.sin(pitch),zz=y*Math.sin(pitch)+z*Math.cos(pitch);
    return [(x*Math.cos(roll)-yy*Math.sin(roll))*h,(x*Math.sin(roll)+yy*Math.cos(roll))*h,zz*h];
  };
  const onScreen=p=>[n*(.5+p[0]*.43),n*(.5-p[1]*.43)];
  const pins=cities.map((c,i)=>{
    const a=document.createElement('a');a.className='city-pin';a.href=c.to;a.dataset.city=String(i);
    if(committeeMode){a.dataset.committee=String(i+1).padStart(2,'0');if(delegateMode&&i<4)a.href=['#panel-ga2','#panel-ecosoc','#panel-london','#panel-unodc'][i];a.addEventListener('click',e=>{if(suppressClick||drag?.moved)return;if(!c.to.startsWith('#'))return;
      if(delegateMode){const b=document.querySelector(`.delegate-choice[data-committee="${a.dataset.committee}"]`);if(!b)return;e.preventDefault();if(b.getAttribute('aria-expanded')!=='true')b.click();const panel=document.getElementById(b.getAttribute('aria-controls'));panel.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});const title=panel.querySelector('h2');title.tabIndex=-1;title.focus({preventScroll:true});return;}
      const d=document.querySelector(c.to);if(!d)return;e.preventDefault();document.querySelectorAll('.committee-dossier[open]').forEach(other=>{if(other!==d)other.open=false;});d.open=true;d.dispatchEvent(new Event('toggle'));d.querySelector('summary').focus({preventScroll:true});d.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});});}
    const label=document.createElement('span');label.className='city-pin-label';
    const name=document.createElement('span');name.className='city-name';
    const englishName=document.createElement('span');englishName.className='city-en';englishName.textContent=c.en;
    const entry=document.createElement('span');entry.className='city-entry';
    label.append(name,englishName,entry);a.append(label);host.append(a);
    if(committeeMode){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('atlas-pin-leader');svg.setAttribute('aria-hidden','true');const line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('x1','22');line.setAttribute('y1','22');svg.append(line);a.prepend(svg);}
    else{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('city-pin-leader');svg.setAttribute('aria-hidden','true');svg.append(document.createElementNS(svg.namespaceURI,'path'));a.prepend(svg);a.classList.add('has-leader');}
    a.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=i;vx=vy=0;request();}});
    a.addEventListener('pointerleave',()=>{hover=-1;rest=performance.now()+1200;request();});
    a.addEventListener('focus',()=>{hover=i;vx=vy=0;request();});
    a.addEventListener('blur',()=>{hover=-1;request();});
    return a;
  });
  function translate(){
    cities.forEach((c,i)=>{
      pins[i].querySelector('.city-name').textContent=english()?c.en:c.zh;
      const secondary=pins[i].querySelector('.city-en');
      secondary.textContent=english()?'':c.en;
      secondary.hidden=english();
      const entry=english()?(committeeMode?c.entryEn:enEntries[i]):c.entry;
      pins[i].querySelector('.city-entry').textContent=`${entry} ↗`;
      pins[i].setAttribute('aria-label',`${english()?c.en:c.zh} · ${entry}`);
    });
    if(committeeMode){
      scene.querySelector('h1,h2').textContent=english()?(delegateMode?'Delegate portal':'Committees'):(delegateMode?'代表入口':'会场信息');
    }
    canvas.setAttribute('aria-label',english()?'Interactive line globe. Drag or use arrow keys to rotate. Press keys 1 through 5 to find a city, then Tab to select its entrance.':'交互式勾线地球。拖动或用方向键旋转，数字键1至5定位城市，再按Tab选择城市入口。');
    dirtyLabels=true;request();
  }
  // The original Natural Earth coastlines are projected onto a mathematical
  // sphere; no filled land texture, gold material, or external 3D library.
  const rough=[[[ -168,70],[-130,70],[-105,75],[-55,50],[-80,12],[-120,30]],
    [[-80,12],[-45,0],[-35,-10],[-70,-55],[-80,-20]],
    [[-17,35],[10,37],[50,12],[30,-35],[10,-30],[-17,15]],
    [[-10,36],[-10,60],[30,70],[100,75],[180,60],[140,30],[105,0],[70,25],[40,30]],
    [[113,-12],[140,-10],[153,-28],[145,-39],[115,-30]],
    [[-60,60],[-20,80],[-50,84]],[[47,-13],[50,-25],[44,-25]]];
  let coasts=rough.map(r=>[...r,r[0]].map(([lon,lat])=>[lon*R,lat*R]));
  const grid=[];
  for(let lat=-75;lat<=75;lat+=15){const line=[];for(let lon=-180;lon<=180;lon+=3)line.push([lon*R,lat*R]);grid.push(line);}
  for(let lon=-180;lon<180;lon+=15){const line=[];for(let lat=-90;lat<=90;lat+=3)line.push([lon*R,lat*R]);grid.push(line);}
  const color=(alpha,soft=false)=>{
    const day=soft?[153,77,93]:[128,33,55],dark=soft?[186,145,164]:[240,204,215];
    return `rgba(${day.map((v,i)=>Math.round(v+(dark[i]-v)*night)).join(',')},${alpha})`;
  };
  function paths(rings){
    const front=new Path2D(),back=new Path2D();
    for(const ring of rings){let prev=null;for(const [lon,lat]of ring){const p=project(lon,lat);if(prev&&(p[2]>0)===(prev[2]>0)){const target=p[2]>0?front:back;target.moveTo(...onScreen(prev));target.lineTo(...onScreen(p));}prev=p;}}
    return {front,back};
  }
  const mask=window.createConferenceNightMask();canvas.dataset.lighting=mask.renderer;
  const emission=document.createElement('canvas'),emit=emission.getContext('2d');
  const bloom=document.createElement('canvas'),bloomCtx=bloom.getContext('2d');
  function hemisphere(){mask.render(sun,night);ctx.save();ctx.beginPath();ctx.arc(n/2,n/2,n*.43,0,Math.PI*2);ctx.clip();ctx.drawImage(mask.canvas,0,0,n,n);ctx.restore();}
  function coastEmission(path){
    // The sharp gold contour stays at the same full resolution as the atlas.
    // Only the diffuse bloom is downsampled; never enlarge the coastline itself.
    emit.resetTransform();emit.clearRect(0,0,n,n);emit.globalCompositeOperation='source-over';
    // A continuous champagne-gold finish, without discrete clusters or sparks.
    const polish=emit.createLinearGradient(n*.1,n*.15,n*.9,n*.85);
    polish.addColorStop(0,'#cd942f');polish.addColorStop(.34,'#ffe19a');
    polish.addColorStop(.65,'#e7b448');polish.addColorStop(1,'#ffdc89');
    emit.lineCap='round';emit.lineJoin='round';
    emit.strokeStyle='rgba(216,151,42,.22)';emit.lineWidth=n/260;emit.stroke(path);
    emit.strokeStyle=polish;emit.lineWidth=n/620;emit.stroke(path);
    emit.strokeStyle='rgba(255,238,177,.7)';emit.lineWidth=n/1900;emit.stroke(path);
    // Exactly the same continuous night mask controls both shade and emission.
    emit.globalCompositeOperation='destination-in';emit.drawImage(mask.canvas,0,0,n,n);emit.globalCompositeOperation='source-over';emit.resetTransform();
    bloomCtx.clearRect(0,0,bloom.width,bloom.height);bloomCtx.filter='blur(1px)';bloomCtx.drawImage(emission,0,0,bloom.width,bloom.height);bloomCtx.filter='none';
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.52;ctx.drawImage(bloom,0,0,n,n);
    // Source-over preserves the gold hue; screen alone bleaches it into white.
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.drawImage(emission,0,0,n,n);ctx.restore();
  }
  function signals(t){
    if(hover<0)return;
    // Thin, moving great-circle signals, not a decorative solid globe skin.
    const first=hover>=0?hover:0,a=cities[first];
    const unit=c=>[Math.cos(c.lat*R)*Math.sin(c.lon*R),Math.sin(c.lat*R),Math.cos(c.lat*R)*Math.cos(c.lon*R)];
    const aa=unit(a);
    for(let i=0;i<5;i++){
      if(i===first)continue;const b=unit(cities[i]),omega=Math.acos(clamp(aa.reduce((s,v,k)=>s+v*b[k],0),-1,1));
      const at=u=>{const v=aa.map((x,k)=>(x*Math.sin((1-u)*omega)+b[k]*Math.sin(u*omega))/Math.sin(omega));return project(Math.atan2(v[0],v[2]),Math.asin(v[1]),1+Math.sin(Math.PI*u)*.045);};
      if(hover>=0){let pen=false;ctx.beginPath();for(let j=0;j<=70;j++){const p=at(j/70);if(p[2]<.02){pen=false;continue;}const xy=onScreen(p);pen?ctx.lineTo(...xy):ctx.moveTo(...xy);pen=true;}ctx.strokeStyle=color(.18);ctx.lineWidth=n/1100;ctx.stroke();}
    }
  }
  function positionPins(){
    if(dirtyLabels){
      if(committeeMode)labelSizes=pins.map(a=>{const b=a.querySelector('.city-pin-label');return [b.offsetWidth,b.offsetHeight];});
      else{
        // Measure every label, including those currently on the far side of the
        // globe. Hidden labels report 0x0, and caching that would make the home
        // layout fall back to desktop-sized boxes once they rotate into view.
        const hidden=pins.map(a=>a.hidden);
        pins.forEach(a=>{a.hidden=false;});
        labelSizes=pins.map(a=>{const b=a.querySelector('.city-pin-label');return [b.offsetWidth,b.offsetHeight];});
        pins.forEach((a,i)=>{a.hidden=hidden[i];});
      }
      dirtyLabels=false;
    }
    const occupied=[];
    // Layout labels near actual geographic coordinates, avoiding one another.
    const positions=cities.map((c,i)=>({i,p:project(c.lon*R,c.lat*R)})).sort((a,b)=>b.p[1]-a.p[1]);
    positions.forEach(({i,p})=>{
      const a=pins[i];a.hidden=p[2]<.1;if(a.hidden)return;
      const x=(.5+p[0]*.43)*width,y=(.5-p[1]*.43)*width;
      const w=labelSizes[i]?.[0]||150,h=labelSizes[i]?.[1]||70,gap=committeeMode?(width<550?16:22):(compact.matches?16:22);
      let left=x+w+gap>width-8,lx=left?x-gap-w:x+gap,ly=clamp(y-19,8,width-h-8);
      if(committeeMode){
        const candidates=[];
        for(const side of [left,!left])for(const offset of [0,1,-1,2,-2,3,-3,4,-4]){
          const cx=side?x-gap-w:x+gap,cy=clamp(y-19+offset*(h+10),8,width-h-8);
          if(cx<4||cx+w>width-4)continue;
          const overlap=occupied.reduce((s,r)=>s+Math.max(0,Math.min(cx+w+8,r.x+r.w+8)-Math.max(cx,r.x))*Math.max(0,Math.min(cy+h+8,r.y+r.h+8)-Math.max(cy,r.y)),0);
          candidates.push({left:side,lx:cx,ly:cy,score:overlap*100+Math.abs(cy-(y-19))+(side===left?0:8)});
        }
        candidates.sort((a,b)=>a.score-b.score);if(candidates.length)({left,lx,ly}=candidates[0]);
        const line=a.querySelector('.atlas-pin-leader line');line.setAttribute('x2',String(22+(left?-gap:gap)));line.setAttribute('y2',String(22+ly-y+19));
      }else{
        const hits=(cx,cy)=>occupied.some(rect=>cx<rect.x+rect.w+8&&cx+w>rect.x-8&&cy<rect.y+rect.h+8&&cy+h>rect.y-8);
        // Prefer the opposite side over dropping the label far below its dot.
        if(hits(lx,ly)){
          const altLeft=!left,altLx=altLeft?x-gap-w:x+gap;
          if(altLx>=4&&altLx+w<=width-4&&!hits(altLx,ly)){left=altLeft;lx=altLx;}
          else for(const rect of occupied)if(lx<rect.x+rect.w+8&&lx+w>rect.x-8&&ly<rect.y+rect.h+8&&ly+h>rect.y-8)ly=rect.y+rect.h+12;
        }
        ly=clamp(ly,8,width-h-8);
        // The label can be clamped or pushed down to avoid a neighbour, so the
        // leader is drawn from the dot itself to the label's facing border
        // instead of being a fixed 20px stub attached to the label.
        const top=ly-y,pad=Math.min(10,h/2);
        const attach=clamp(-top,pad,Math.max(pad,h-pad));
        const dx=left?-gap:gap,dy=top+attach,len=Math.hypot(dx,dy)||1,dot=4;
        const bx=22+dx,by=22+dy,tail=bx+(left?-3:3);
        a.querySelector('.city-pin-leader path').setAttribute('d',`M${(22+dx/len*dot).toFixed(2)} ${(22+dy/len*dot).toFixed(2)}L${bx.toFixed(2)} ${(by).toFixed(2)}L${tail.toFixed(2)} ${(by).toFixed(2)}`);
      }
      a.style.setProperty('--label-x',`${gap}px`);
      a.classList.toggle('label-left',left);occupied.push({x:lx,y:ly,w,h});
      a.style.left=`${x/width*100}%`;a.style.top=`${y/width*100}%`;a.style.setProperty('--label-y',`${ly-y}px`);
      a.style.zIndex=String(Math.round(p[2]*100));
      const daylight=p.reduce((s,v,k)=>s+v*sun[k],0);a.dataset.phase=daylight>.12?'day':daylight<-.12?'night':'twilight';
    });
  }
  function draw(t){
    night=Number(document.body.style.getPropertyValue('--fx-night'))||0;
    ctx.clearRect(0,0,n,n);
    // A slowly shifting sun gives the line atlas its automatic dawn/dusk cycle.
    const solarWeight=Number(scene.dataset.solarWeight)||0;
    lightPhase=Number(scene.dataset.solarPhase)||0;
    // The same solar phase drives both the page palette and the visible night
    // hemisphere: front-lit at daytime, back-lit at night, curved at twilight.
    const fallback=-1.12+solarClock/18000;
    sun[0]=Math.sin(fallback)*(1-solarWeight)+Math.sin(lightPhase)*solarWeight;
    sun[1]=.16;sun[2]=Math.cos(fallback)*(1-solarWeight)-Math.cos(lightPhase)*solarWeight;
    const sl=Math.hypot(...sun);for(let i=0;i<3;i++)sun[i]/=sl;
    const r=n*.43;
    ctx.beginPath();ctx.arc(n/2,n/2,r,0,Math.PI*2);ctx.strokeStyle=color(.2);ctx.lineWidth=n/1400;ctx.stroke();
    const coastline=paths(coasts),graticule=paths(grid);
    ctx.strokeStyle=color(.035,true);ctx.lineWidth=n/1800;ctx.stroke(graticule.back);
    ctx.strokeStyle=color(.045,true);ctx.lineWidth=n/1500;ctx.stroke(coastline.back);
    hemisphere();
    ctx.strokeStyle=color(.13);ctx.lineWidth=n/1600;ctx.stroke(graticule.front);
    ctx.strokeStyle=color(.72-.3*night);ctx.lineWidth=n/1200;ctx.stroke(coastline.front);
    coastEmission(coastline.front);
    // Restrained moving rim accents rather than a filled atmosphere.
    ctx.beginPath();ctx.arc(n/2,n/2,r,-.7+lightPhase*.12,-.25+lightPhase*.12);ctx.strokeStyle=color(.5);ctx.lineWidth=n/700;ctx.stroke();
    signals(t);positionPins();
    canvas.dataset.yaw=yaw.toFixed(4);canvas.dataset.pitch=pitch.toFixed(4);canvas.dataset.light=lightPhase.toFixed(4);
    canvas.dataset.roll=String(roll/R);
    if(night!==lastNight){lastNight=night;world.dataset.night=String(night>.46);}
    const degrees=((yaw/R)%360+360)%360;scene.querySelector('.globe-register span').textContent=`${Math.abs(pitch/R).toFixed(0)}° ${pitch>=0?'N':'S'} / ${degrees.toFixed(0)}° E`;
  }
  function request(){if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
  function tick(t){
    frame=0;const dt=Math.min(48,t-(last||t));last=t;
    if(visible&&!reduce.matches)solarClock+=dt;
    if(flight){const k=clamp((t-flight.t)/900,0,1),e=1-Math.pow(1-k,4);yaw=flight.y+(flight.to-flight.y)*e;pitch=flight.p+(flight.tp-flight.p)*e;if(k===1)flight=null;}
    else if(!drag&&hover<0){if(!reduce.matches){yaw+=vx*dt;pitch=clamp(pitch+vy*dt,-1.12,1.12);const decay=Math.exp(-dt/260);vx*=decay;vy*=decay;}}
    const targetSpeed=!reduce.matches&&!drag&&hover<0&&!flight&&t>rest ? .000055 : 0;
    autoSpeed+=(targetSpeed-autoSpeed)*(1-Math.exp(-dt/850));if(!drag&&!flight)yaw+=autoSpeed*dt;
    lastDraw=t;draw(t);
    if(visible&&!document.hidden&&(!reduce.matches||flight))request();
  }
  function locate(i){const c=cities[i],to=yaw+wrap(c.lon*R-yaw),tp=c.lat*R*.65;vx=vy=0;rest=performance.now()+4000;
    if(reduce.matches){yaw=to;pitch=tp;}else flight={t:performance.now(),y:yaw,p:pitch,to,tp};request();}
  const sphere=scene.querySelector('.diplomatic-sphere');
  sphere.addEventListener('pointerdown',e=>{
    if(e.button!==0||drag)return;flight=null;vx=vy=0;drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:e.timeStamp,moved:false};
  });
  sphere.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>5){drag.moved=true;sphere.setPointerCapture(e.pointerId);hover=-1;}
    if(drag.moved){const speed=3.6/Math.max(250,width),dt=Math.max(8,e.timeStamp-drag.t);yaw-=dx*speed;pitch=clamp(pitch+dy*speed,-1.12,1.12);vx=clamp(-dx*speed/dt,-.003,.003);vy=clamp(dy*speed/dt,-.002,.002);}
    drag.x=e.clientX;drag.y=e.clientY;drag.t=e.timeStamp;request();
  });
  const release=e=>{if(!drag||drag.id!==e.pointerId)return;suppressClick=drag.moved;drag=null;rest=performance.now()+2200;setTimeout(()=>suppressClick=false,100);request();};
  sphere.addEventListener('pointerup',release);sphere.addEventListener('pointercancel',e=>{vx=vy=0;release(e);});sphere.addEventListener('lostpointercapture',release);
  sphere.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}},true);
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','1','2','3','4','5'].includes(e.key))return;e.preventDefault();flight=null;hover=-1;vx=vy=0;rest=performance.now()+2500;
    if(e.key==='ArrowLeft')yaw-=.16;if(e.key==='ArrowRight')yaw+=.16;if(e.key==='ArrowUp')pitch=clamp(pitch+.12,-1.12,1.12);if(e.key==='ArrowDown')pitch=clamp(pitch-.12,-1.12,1.12);
    if(/[1-5]/.test(e.key))locate(Number(e.key)-1);request();
  });
  function resize(){width=world.getBoundingClientRect().width;n=Math.min(2880,Math.round(width*Math.max(1.25,Math.min(devicePixelRatio||1,2))));canvas.width=canvas.height=n;emission.width=emission.height=n;bloom.width=bloom.height=Math.min(400,Math.round(n*.4));ctx.imageSmoothingQuality='high';emit.imageSmoothingQuality='high';bloomCtx.imageSmoothingQuality='high';canvas.dataset.contourPixels=String(n);dirtyLabels=true;request();}
  new ResizeObserver(resize).observe(world);
  if(!committeeMode){
    if(document.fonts?.ready)document.fonts.ready.then(()=>{dirtyLabels=true;request();});
    if('ResizeObserver' in window){const labelObserver=new ResizeObserver(()=>{dirtyLabels=true;request();});pins.forEach(a=>labelObserver.observe(a.querySelector('.city-pin-label')));}
  }
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=0;request();}},{rootMargin:'150px'}).observe(world);
  new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else request();});
  reduce.addEventListener('change',()=>{vx=vy=0;if(flight){yaw=flight.to;pitch=flight.tp;flight=null;}request();});
  fetch('assets/earth-land.geojson').then(r=>{if(!r.ok)throw Error('atlas');return r.json();}).then(data=>{
    const rings=[];for(const f of data.features||[]){if(f.geometry.type==='Polygon')rings.push(...f.geometry.coordinates);else if(f.geometry.type==='MultiPolygon')for(const polygon of f.geometry.coordinates)rings.push(...polygon);}
    if(rings.length)coasts=rings.map(ring=>ring.map(([lon,lat])=>[lon*R,lat*R]));canvas.dataset.atlas='natural-earth';request();
  }).catch(()=>{canvas.dataset.atlas='simplified';});
  canvas.dataset.renderer='line-atlas';translate();resize();request();
})();
