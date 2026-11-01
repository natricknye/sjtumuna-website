/* Precomputed sphere normals, continuous soft penumbra, no GPU readbacks. */
window.createConferenceNightMask=()=>{
  const size=768,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size),data=image.data;
  const offsets=[],nx=[],ny=[],nz=[],edge=[];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=(x/size-.5)/.43,py=(.5-y/size)/.43,r2=px*px+py*py;
    if(r2>=1)continue;
    const o=(y*size+x)*4;data[o]=29;data[o+1]=22;data[o+2]=38;
    offsets.push(o);nx.push(px);ny.push(py);nz.push(Math.sqrt(1-r2));edge.push(Math.min(1,(1-r2)*160));
  }
  const indices=new Uint32Array(offsets),xs=new Float32Array(nx),ys=new Float32Array(ny),zs=new Float32Array(nz),edges=new Float32Array(edge),count=indices.length;
  let lastSun=null,lastNight=null;return {canvas,renderer:'continuous-canvas',render(sun,night){ if(lastSun&&Math.abs(sun[0]-lastSun[0])<0.02&&Math.abs(sun[1]-lastSun[1])<0.02&&Math.abs(sun[2]-lastSun[2])<0.02&&Math.abs(night-lastNight)<0.02)return; lastSun=[sun[0],sun[1],sun[2]];lastNight=night;
    const sx=sun[0],sy=sun[1],sz=sun[2],alpha=(.83-.15*night)*255;
    for(let i=0;i<count;i++){
      let d=(xs[i]*sx+ys[i]*sy+zs[i]*sz+.15)/.34;
      d=d<0?0:d>1?1:d;d=d*d*(3-2*d);
      // A restrained warm penumbra, confined to the moving terminator.
      const dusk=4*d*(1-d)*.035;
      data[indices[i]]=29+Math.round(72*dusk);
      data[indices[i]+1]=22+Math.round(33*dusk);
      data[indices[i]+2]=38;
      data[indices[i]+3]=(1-d)*alpha*edges[i];
    }ctx.putImageData(image,0,0);
  }};
};
