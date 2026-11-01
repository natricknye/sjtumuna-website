/* Orthographic planetary atlas. Surface information comes from NASA/JPL maps. */
(function initPlanet() {
  const scene=document.querySelector('.planet-scene'),canvas=scene?.querySelector('canvas');if(!canvas)return;
  const kind=scene.dataset.planet,reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const configs={mars:{paper:[247,222,205],dark:[34,13,15],ink:[182,81,48],light:[241,173,117],roll:-.28},jupiter:{paper:[242,232,210],dark:[25,21,29],ink:[158,116,79],light:[231,208,164],roll:-.14},uranus:{paper:[233,242,240],dark:[10,23,32],ink:[74,145,160],light:[163,225,229],roll:-1.25}};
  configs.neptune={paper:[182,206,238],dark:[9,15,35],ink:[37,79,164],light:[153,193,242],roll:-.36};
  configs.pluto={paper:[238,230,218],dark:[24,19,30],ink:[151,132,125],light:[229,213,199],roll:-.25};
  const config=configs[kind],ringStrength=kind==='uranus'?1:kind==='neptune'?.32:0;
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
  if(!gl){canvas.dataset.renderer='unavailable';const fallback=document.createElement('img');fallback.src=`assets/planets/${kind}.jpg`;fallback.alt=kind;fallback.style.cssText='width:86%;height:86%;margin:7%;object-fit:cover;border-radius:50%;opacity:.45';canvas.replaceWith(fallback);return;}
  const vertex=`attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
  gl.getExtension('OES_standard_derivatives');
  const fragment=`#extension GL_OES_standard_derivatives : enable
    precision highp float;
    varying vec2 v_uv;uniform sampler2D u_map,u_moon0,u_moon1;uniform vec4 u_orbit0,u_orbit1;uniform float u_moonYaw;uniform float u_yaw,u_pitch,u_roll,u_uranus,u_neptune,u_pluto,u_size,u_ring;uniform vec2 u_texel;uniform vec3 u_sun,u_paper,u_dark,u_ink,u_light;
    vec4 moon(sampler2D map,vec4 orbit,vec4 beneath,inout float depth){
      if(orbit.w<.001)return beneath;
      vec2 q=(v_uv-orbit.xy)/orbit.w;float rr=dot(q,q);if(rr>=1.)return beneath;
      float z=sqrt(1.-rr),front=orbit.z+z*orbit.w;if(front<depth)return beneath;
      vec3 n=vec3(q,z);vec3 mapped=vec3(n.x,n.y*.36-n.z*.933,n.y*.933+n.z*.36);
      if(u_neptune>.5)mapped=vec3(n.x,n.y*.866+n.z*.5,-n.y*.5+n.z*.866);
      vec2 uv=vec2(fract(atan(mapped.x,mapped.z)/6.2831853+.5+u_moonYaw),acos(clamp(mapped.y,-1.,1.))/3.14159265);
      vec3 source=texture2D(map,uv).rgb;
      // Voyager coverage is incomplete. Unobserved terrain stays neutral, not invented.
      vec3 material=mix(vec3(.36,.35,.34),source,smoothstep(.015,.12,dot(source,vec3(.333))));float ndl=dot(n,u_sun);
      float daylight=smoothstep(-.18,.22,ndl);
      vec3 direct=material*daylight*(.46+.54*sqrt(max(0.,ndl)));
      // The parent planet can eclipse a satellite; use the same light direction.
      float radius=u_uranus>.5?.27:.30;vec3 point=vec3(v_uv-.5,front),ray=point/radius;
      float along=dot(ray,u_sun),distance=length(ray-u_sun*along);
      if(along<0.)direct*=smoothstep(.94,1.08,distance);
      vec3 parentDirection=normalize(-vec3(orbit.xy-.5,orbit.z));
      float bounce=pow(max(0.,dot(n,parentDirection)),1.5)*.12;
      vec3 c=direct+material*(vec3(.085)+mix(vec3(.52,.73,.79),vec3(.33,.48,.83),u_neptune)*bounce);
      float a=1.-smoothstep(1.-2./(u_size*orbit.w),1.,rr);
      depth=front;float outA=a+beneath.a*(1.-a);return vec4((c*a+beneath.rgb*beneath.a*(1.-a))/max(.0001,outA),outA);
    }
    float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
    float ringDensity(float r){
      if(u_uranus>.5){
        float dust=smoothstep(1.46,1.52,r)*(1.-smoothstep(1.78,1.82,r))*.035;
        return dust+exp(-pow((r-1.56)/.003,2.))*.20+exp(-pow((r-1.60)/.004,2.))*.28+
        exp(-pow((r-1.64)/.0028,2.))*.25+exp(-pow((r-1.68)/.004,2.))*.30+
        exp(-pow((r-1.715)/.003,2.))*.42+exp(-pow((r-1.748)/.0045,2.))*.40+
        exp(-pow((r-1.785)/.007,2.))*.80;
      }
      return exp(-pow((r-1.39)/.005,2.))*.18+exp(-pow((r-1.46)/.009,2.))*.12+
      exp(-pow((r-1.54)/.006,2.))*.30+exp(-pow((r-1.59)/.004,2.))*.68;
    }
    vec3 surface(vec2 uv){
      vec3 t=texture2D(u_map,uv).rgb;
      if(u_pluto<.5){vec2 d=u_texel*1.25;vec3 local=(texture2D(u_map,uv+vec2(d.x,0.)).rgb+texture2D(u_map,uv-vec2(d.x,0.)).rgb+texture2D(u_map,uv+vec2(0.,d.y)).rgb+texture2D(u_map,uv-vec2(0.,d.y)).rgb)*.25;t=clamp(t+(t-local)*.7,0.,1.);}
      return t;
    }
    vec2 uvFor(vec3 n){float cr=cos(u_roll),sr=sin(u_roll),cp=cos(u_pitch),sp=sin(u_pitch);float x=n.x*cr+n.y*sr,y=-n.x*sr+n.y*cr;vec3 a=vec3(x,y*cp+n.z*sp,-y*sp+n.z*cp);return vec2(fract(atan(a.x,a.z)/6.2831853+u_yaw/6.2831853+.5),acos(clamp(a.y,-1.,1.))/3.14159265);}
    void main(){
      float radius=u_uranus>.5?.27:u_neptune>.5?.30:.43;vec2 p=(v_uv-.5)/radius;float r2=dot(p,p);vec4 result=vec4(0.);
      vec3 axis=vec3(-sin(u_roll)*cos(u_pitch),cos(u_roll)*cos(u_pitch),sin(u_pitch));
      float sphereZ=sqrt(max(0.,1.-r2));float depth=r2<1.?sphereZ*radius:-10.;
      if(r2<1.){
        vec3 n=vec3(p,sphereZ);vec2 uv=uvFor(n);vec3 tex=surface(uv);float l=lum(tex);
        float lon=(uv.x-.5)*6.2831853,lat=(.5-uv.y)*3.14159265;
        float grid=1.-smoothstep(.3,1.,min(abs(sin(lon*12.))/max(fwidth(lon*12.),.0001),abs(sin(lat*12.))/max(fwidth(lat*12.),.0001)));
        grid=0.;
        // Continuous, low-frequency source color replaces thresholded contour engraving.
        float relief=smoothstep(.16,.80,l);
        vec3 material=mix(u_ink,u_paper,.22+relief*.52);
        material=mix(material,tex,.82*u_uranus+.66*u_neptune+.43*u_pluto);
        float ndl=dot(n,u_sun),daylight=smoothstep(-.24,.30,ndl);
        float diffuse=.64+.36*sqrt(max(0.,ndl));
        vec3 day=material*diffuse;
        if(u_ring>.001&&abs(dot(axis,u_sun))>.02){float t=-dot(axis,n)/dot(axis,u_sun);if(t>0.){float density=ringDensity(length(n+u_sun*t));day*=1.-clamp(density*u_ring*.45,0.,.45);}}
        vec3 night=mix(u_dark,material,.12+.05*relief);
        vec3 c=mix(night,day,daylight);
        vec3 halfVector=normalize(u_sun+vec3(0.,0.,1.));
        float satin=pow(max(0.,dot(n,halfVector)),26.)*.075*daylight;
        float grazing=pow(1.-sphereZ,4.)*.09*smoothstep(-.1,.5,ndl);
        c+=u_light*(satin+grazing);
        c=mix(c,mix(u_ink,u_light,.3),grid*.025);
        result=vec4(c,1.-smoothstep(1.-3./u_size,1.,r2));
      }
      result=moon(u_moon0,u_orbit0,result,depth);
      result=moon(u_moon1,u_orbit1,result,depth);
      if(u_ring>.001){
        float az=abs(axis.z)<.03?(axis.z<0.?-.03:.03):axis.z;
        float z=-(axis.x*p.x+axis.y*p.y)/az;vec3 rp=vec3(p,z);float rr=length(rp);
        float rings=ringDensity(rr);
        if(rings>.001&&z*radius>depth){
          float lit=.36+.64*smoothstep(-.3,.6,dot(normalize(rp),u_sun));
          float behind=dot(rp,u_sun),distance=length(rp-u_sun*behind);
          float shadow=behind<0.?smoothstep(.85,1.08,distance):1.;
          float azimuth=atan(rp.y,rp.x);
          float arcs=u_neptune>.5?.66+.34*pow(.5+.5*sin(azimuth*3.+1.2),4.):1.;
          float scatter=.75+.25*pow(max(0.,dot(normalize(-rp),u_sun)),3.);
          float alpha=rings*mix(.62,1.,step(0.,z))*lit*mix(.10,1.,shadow)*u_ring*arcs*scatter;
          vec3 ringColor=mix(u_ink,vec3(.87,.91,.91),.82);
          float outAlpha=result.a+alpha*(1.-result.a);
          result=vec4((ringColor*alpha+result.rgb*result.a*(1.-alpha))/max(.0001,outAlpha),outAlpha);
          if(alpha>.08)depth=max(depth,z*radius);
        }
      }
      gl_FragColor=result;
    }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const attr=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const uniform=name=>gl.getUniformLocation(program,name);const u={};for(const k of ['yaw','pitch','roll','uranus','neptune','pluto','ring','size','texel','sun','paper','dark','ink','light'])u[k]=uniform('u_'+k);
  for(const k of ['paper','dark','ink','light'])gl.uniform3fv(u[k],config[k].map(v=>v/255));gl.uniform1f(u.roll,config.roll);gl.uniform1f(u.uranus,kind==='uranus'?1:0);
  gl.uniform1f(u.ring,ringStrength);
  gl.uniform1f(u.neptune,kind==='neptune'?1:0);gl.uniform1f(u.pluto,kind==='pluto'?1:0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([160,140,115]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform2f(u.texel,1/720,1/360);
  const image=new Image();image.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.uniform2f(u.texel,1/image.width,1/image.height);
    if((image.width&(image.width-1))===0&&(image.height&(image.height-1))===0){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);const anis=gl.getExtension('EXT_texture_filter_anisotropic');if(anis)gl.texParameterf(gl.TEXTURE_2D,anis.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anis.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));}
    canvas.dataset.texture='nasa-jpl';canvas.dataset.textureSize=`${image.width}x${image.height}`;canvas.dataset.surface='source-map';request();};image.onerror=()=>{canvas.dataset.texture='failed';};image.src=`assets/planets/${kind==='pluto'?'pluto-full-4k':kind==='neptune'?'neptune-nasa':kind==='uranus'?'uranus-nasa-0':kind}.jpg`;
  // Body radii use actual moon/parent ratios. Orbital distances are compressed for the viewport.
  const moonConfigs=kind==='uranus'?[{file:'titania',r:.27*788.9/25362,phase:2.7,speed:.000021,distance:1.09},{file:'miranda',r:.27*235.8/25362,phase:.25,speed:.000034,distance:.91}]:kind==='neptune'?[{file:'triton',r:.30*1353.4/24622,phase:.65,speed:-.000025,distance:1}]:[];
  const moonUniforms=[uniform('u_orbit0'),uniform('u_orbit1')],moonYaw=uniform('u_moonYaw');
  scene.querySelector('.planet-moons')?.remove();
  let moonsLoaded=0;
  for(let i=0;i<2;i++){
    gl.uniform4f(moonUniforms[i],0,0,0,0);const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i+1);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([150,150,150]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(uniform('u_moon'+i),i+1);
    const m=moonConfigs[i];if(!m)continue;
    const img=new Image();img.onload=()=>{gl.activeTexture(gl.TEXTURE0+i+1);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);gl.activeTexture(gl.TEXTURE0);canvas.dataset.moonsLoaded=String(++moonsLoaded);request();};img.src=`assets/planets/${m.file}.jpg`;
  }
  gl.activeTexture(gl.TEXTURE0);canvas.dataset.moons=moonConfigs.map(m=>m.file).join(',');
  let elapsed=0,yaw=kind==='pluto'?0:kind==='neptune'?-.7:1.3,pitch=kind==='uranus'?.45:kind==='pluto'?1.0:.2,v=0,drag=null,frame=0,last=0,visible=true,disposed=false;
  function render(){
    const weight=Number(scene.dataset.solarWeight)||0,phase=Number(scene.dataset.solarPhase)||0;
    const angle=weight>.001?phase:2.3;const sun=[Math.sin(angle),.16,-Math.cos(angle)],len=Math.hypot(...sun);
    moonConfigs.forEach((m,i)=>{const a=m.phase+elapsed*m.speed,neptune=kind==='neptune';
      const x=(neptune?.405*Math.cos(a):.36*Math.cos(a)+.12*Math.sin(a))*m.distance,y=(neptune?.26*Math.sin(a):-.12*Math.cos(a)+.28*Math.sin(a))*m.distance,z=(neptune?.32:.24)*Math.sin(a)*m.distance;
      gl.uniform4f(moonUniforms[i],.5+x,.5+y,z,m.r);
    });gl.uniform1f(moonYaw,yaw*.06);
    gl.uniform3fv(u.sun,sun.map(x=>x/len));gl.uniform1f(u.yaw,yaw);gl.uniform1f(u.pitch,pitch);gl.uniform1f(u.size,canvas.width);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
    canvas.dataset.yaw=yaw.toFixed(4);canvas.dataset.light=phase.toFixed(4);canvas.dataset.orbitTime=elapsed.toFixed(0);
  }
  // Draw and copy synchronously: WebGL's default drawing buffer need not be retained.
  canvas.captureTransition=()=>{render();const shot=document.createElement('canvas');shot.width=shot.height=Math.min(1024,canvas.width);shot.getContext('2d').drawImage(canvas,0,0,shot.width,shot.height);return shot.toDataURL('image/png');};
  function request(){if(!frame&&!document.hidden&&!disposed)frame=requestAnimationFrame(tick);}
  function tick(t){frame=0;const dt=Math.min(50,t-(last||t));last=t;if(!reduce.matches){elapsed+=dt;if(!drag){yaw+=dt*(.000045+v);v*=Math.exp(-dt/240);}}render();if(visible&&!reduce.matches)request();}
  const resize=()=>{const w=canvas.getBoundingClientRect().width;canvas.width=canvas.height=Math.min(2160,Math.round(w*Math.min(devicePixelRatio||1,2)));gl.viewport(0,0,canvas.width,canvas.height);request();};new ResizeObserver(resize).observe(canvas);
  if(kind==='pluto'){canvas.style.cursor='default';}canvas.addEventListener('pointerdown',e=>{if(e.button!==0||kind==='pluto')return;v=0;drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:e.timeStamp,moved:false};});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>6){drag.moved=true;canvas.setPointerCapture(e.pointerId);}
    if(drag.moved){yaw-=dx*.006;pitch=Math.max(-1.1,Math.min(1.1,pitch+dy*.004));v=Math.max(-.002,Math.min(.002,-dx*.006/Math.max(8,e.timeStamp-drag.t)));}
    drag.x=e.clientX;drag.y=e.clientY;drag.t=e.timeStamp;request();});
  const end=()=>{drag=null;request();};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',()=>{v=0;end();});canvas.addEventListener('lostpointercapture',end);
  canvas.addEventListener('keydown',e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();if(e.key==='ArrowLeft')yaw-=.15;if(e.key==='ArrowRight')yaw+=.15;if(e.key==='ArrowUp')pitch=Math.min(1.1,pitch+.1);if(e.key==='ArrowDown')pitch=Math.max(-1.1,pitch-.1);request();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=0;request();}}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=0;request();}});reduce.addEventListener('change',request);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();disposed=true;cancelAnimationFrame(frame);frame=0;canvas.dataset.renderer='context-lost';});canvas.addEventListener('webglcontextrestored',()=>{const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);initPlanet();});
  canvas.dataset.renderer='planet-atlas';resize();request();
})();
