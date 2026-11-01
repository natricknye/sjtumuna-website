(() => {
  'use strict';
  const scenes = [...document.querySelectorAll('[data-atlas-scene]')];
  if (!scenes.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let globeVisible = false;
  let scrollDirty = true;
  let lastDraw = 0;
  let angle = -.7;
  let night = 0;
  let targetAngle = null;
  let activeRegion = -1;
  const canvas = document.querySelector('#conference-globe');
  const ctx = canvas?.getContext('2d');
  const size = Math.round(440 * Math.min(devicePixelRatio || 1, 1.5));
  if (ctx) {
    canvas.width = canvas.height = size;
    canvas.parentElement.classList.add('globe-ready');
  }
  // A deliberately simplified atlas, not political boundaries. Sampled once.
  const continents = [
    [[-168,70],[-140,70],[-125,60],[-112,58],[-95,73],[-60,54],[-53,46],[-75,25],[-88,18],[-100,23],[-117,32],[-130,50],[-165,60]],
    [[-81,12],[-70,10],[-60,6],[-49,-3],[-35,-7],[-42,-22],[-52,-33],[-68,-55],[-75,-40],[-78,-10]],
    [[-53,59],[-44,60],[-20,77],[-40,84],[-62,79]],
    [[-10,36],[-10,59],[10,72],[35,69],[48,56],[32,44],[25,37],[8,44]],
    [[-17,35],[10,37],[34,31],[44,12],[51,11],[42,-15],[30,-34],[18,-35],[10,-15],[-5,5],[-17,16]],
    [[28,42],[36,69],[70,76],[110,74],[165,66],[180,55],[155,48],[138,34],[125,19],[108,9],[97,4],[82,8],[72,25],[52,26],[43,13],[35,30]],
    [[113,-12],[135,-10],[153,-24],[148,-39],[130,-35],[114,-24]],
    [[47,-13],[51,-16],[49,-25],[44,-25]],
    [[130,32],[143,45],[146,40],[137,30]],
    [[96,5],[106,-6],[119,-9],[128,-5],[120,1],[107,2]],
    [[166,-35],[178,-38],[174,-46],[167,-44]],
  ];
  const rad = Math.PI/180;
  let coastlines = continents.map(poly=>{
    const points=[];
    poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length];const steps=Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/3);for(let j=0;j<steps;j++){const f=j/steps;points.push([(a[0]+(b[0]-a[0])*f)*rad,(a[1]+(b[1]-a[1])*f)*rad]);}});
    points.push(points[0]);return points;
  });
  let atlasLoading = false;
  const loadAtlas = () => {
    if(atlasLoading)return;
    atlasLoading=true;
    fetch('assets/earth-land.geojson').then(response=>{if(!response.ok)throw new Error('Atlas unavailable');return response.json();}).then(data=>{
      const rings=[];
      for(const feature of data.features||[]){
        const geometry=feature.geometry;
        if(geometry.type==='Polygon')rings.push(...geometry.coordinates);
        else if(geometry.type==='MultiPolygon')geometry.coordinates.forEach(polygon=>rings.push(...polygon));
      }
      if(rings.length)coastlines=rings.map(ring=>ring.map(([lon,lat])=>[lon*rad,lat*rad]));
      canvas.dataset.atlas='natural-earth';draw();
    }).catch(()=>{atlasLoading=false;});
  };
  const project = (lon,lat) => {
    const x=Math.cos(lat)*Math.sin(lon+angle);
    const z=Math.cos(lat)*Math.cos(lon+angle);
    const y=-Math.sin(lat);
    const tilt=.14;
    return [size/2+x*size*.475, size/2+(y*Math.cos(tilt)-z*Math.sin(tilt))*size*.475,z*Math.cos(tilt)+y*Math.sin(tilt)];
  };
  const line = (coords) => {
    let pen=false;
    ctx.beginPath();
    for(const [lon,lat] of coords) {
      const p=project(lon,lat);
      if(p[2]<=0){pen=false;continue;}
      if(pen)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);
      pen=true;
    }
    ctx.stroke();
  };
  const draw = () => {
    if(!ctx)return;
    ctx.clearRect(0,0,size,size);
    const blend=(a,b,alpha)=>`rgba(${a.map((v,i)=>Math.round(v+(b[i]-v)*night)).join(',')},${alpha})`;
    ctx.strokeStyle=blend([128,44,63],[237,203,170],.17+night*.06);ctx.lineWidth=size/650;
    for(let lat=-60;lat<=60;lat+=30) {
      const points=[];for(let lon=-180;lon<=180;lon+=4)points.push([lon*rad,lat*rad]);line(points);
    }
    for(let lon=-180;lon<180;lon+=30) {
      const points=[];for(let lat=-90;lat<=90;lat+=4)points.push([lon*rad,lat*rad]);line(points);
    }
    ctx.strokeStyle=blend([126,37,58],[247,218,182],.7+night*.13);ctx.lineWidth=size/440;
    coastlines.forEach(line);
    const regions=[[121.4,31.2],[15,48],[-40,15],[100,20],[35,30],[-85,25]];
    const region=regions[activeRegion<0?0:activeRegion];
    const p=project(region[0]*rad,region[1]*rad);
    if(p[2]>0){ctx.strokeStyle=blend([164,83,88],[255,229,188],1);ctx.lineWidth=size/500;ctx.beginPath();ctx.arc(p[0],p[1],size*.02,0,Math.PI*2);ctx.stroke();ctx.fillStyle=blend([158,41,62],[255,242,209],1);ctx.beginPath();ctx.arc(p[0],p[1],size*.006,0,Math.PI*2);ctx.fill();}
  };
  const request = () => { if(!frame && !document.hidden) frame=requestAnimationFrame(tick); };
  const tick = (time) => {
    frame=0;
    if(document.hidden)return;
    if(scrollDirty) {
      scrollDirty=false;
      if(!reduce.matches) {
        // Batch geometry reads before style writes. Only two small scenes.
        const boxes=scenes.map(scene=>scene.getBoundingClientRect());
        const offsets=boxes.map(b=>Math.max(-1,Math.min(1,(innerHeight/2-b.top-b.height/2)/innerHeight)));
        scenes.forEach((scene,i)=>scene.style.setProperty('--scene-drift',`${offsets[i]*38}px`));
      }
    }
    if(globeVisible && ctx && !reduce.matches) {
      night=Number(document.body.style.getPropertyValue('--fx-night'))||0;
      if(time-lastDraw>=32) {
        const dt=Math.min(time-lastDraw,70);lastDraw=time;
        if(targetAngle!==null){const delta=Math.atan2(Math.sin(targetAngle-angle),Math.cos(targetAngle-angle));angle+=delta*.07;}
        else angle+=dt*.00009;
        draw();
      }
      request();
    }
  };
  scenes.forEach(scene=>{
    const links=[...scene.querySelectorAll('.portal-card')];
    const activate=(index)=>{
      scene.dataset.active=String(index);
      scene.style.setProperty('--art-turn',`${[-15,-7,0,7,12,0][index]||0}deg`);
      scene.style.setProperty('--art-scale','1.035');
      if(scene.dataset.atlasScene==='world'){activeRegion=index;targetAngle=-[121.4,15,-40,100,35,-85][index]*rad;request();if(reduce.matches)draw();}
    };
    const reset=()=>{
      if(scene.contains(document.activeElement))return;
      delete scene.dataset.active;scene.style.removeProperty('--art-turn');scene.style.removeProperty('--art-scale');
      if(scene.dataset.atlasScene==='world'){activeRegion=-1;targetAngle=null;}
    };
    let scenePointerFrame=0,sceneX=0,sceneY=0;
    scene.addEventListener('pointermove',event=>{
      if(event.pointerType!=='mouse'||reduce.matches)return;
      sceneX=event.clientX;sceneY=event.clientY;
      if(scenePointerFrame)return;
      scenePointerFrame=requestAnimationFrame(()=>{scenePointerFrame=0;const b=scene.getBoundingClientRect();scene.style.setProperty('--interaction-x',`${((sceneX-b.left)/b.width-.5)*24}px`);scene.style.setProperty('--interaction-y',`${((sceneY-b.top)/b.height-.5)*20}px`);});
    },{passive:true});
    scene.addEventListener('pointerleave',()=>{cancelAnimationFrame(scenePointerFrame);scenePointerFrame=0;scene.style.removeProperty('--interaction-x');scene.style.removeProperty('--interaction-y');});
    links.forEach((link,index)=>{
      link.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')activate(index);});
      link.addEventListener('focus',()=>activate(index));
      link.addEventListener('pointerleave',reset);
    });
    scene.addEventListener('focusout',()=>queueMicrotask(reset));
  });
  window.addEventListener('scroll',()=>{scrollDirty=true;request();},{passive:true});
  window.addEventListener('resize',()=>{scrollDirty=true;request();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{lastDraw=performance.now();scrollDirty=true;request();}});
  reduce.addEventListener('change',()=>{scenes.forEach(scene=>scene.style.removeProperty('--scene-drift'));draw();request();});
  if('IntersectionObserver' in window) {
    new IntersectionObserver(entries=>{globeVisible=entries[0].isIntersecting;lastDraw=performance.now();if(globeVisible){loadAtlas();request();}},{rootMargin:'50px'}).observe(canvas);
  } else {globeVisible=true;loadAtlas();}
  draw();loadAtlas();request();
})();
