/* Both committee journeys begin with the same geographic navigation. */
(() => {
  const main=document.querySelector('main'),delegate=Boolean(document.querySelector('.delegate-library'));
  if(!main)return;
  let scene=document.querySelector('.committee-atlas');
  if(!scene){
    scene=document.createElement('section');scene.className='committee-atlas home-orbit-scene';
    scene.innerHTML=delegate?`<div class="committee-atlas-heading"><p class="eyebrow">2026 · SJTUMUNC · SHANGHAI</p><h1></h1></div><div class="home-orbit-layout xuhui-layout"><div class="xuhui-map" id="xuhui-map"><canvas id="xuhui-map-canvas" role="img" aria-label="旋转的徐汇区俯瞰线稿地图"></canvas><div class="xuhui-pins" aria-label="会场地点入口"></div></div><p class="xuhui-district-caption"><span class="district-zh">徐汇区</span></p></div>`:`<div class="committee-atlas-heading"><p class="eyebrow">SJTUMUNC 2026 · A SHARED WORLD</p><h1></h1><p class="atlas-context"></p></div><div class="home-orbit-layout"><div class="diplomatic-world"><div class="diplomatic-sphere"><canvas id="conference-globe" tabindex="0" role="img"></canvas><div class="city-pins" aria-label="会场地点入口"></div></div><div class="globe-console"><p class="globe-instruction"></p></div><div class="globe-register" aria-hidden="true"><span></span><span>SHANGHAI · NEW YORK · LONDON · VIENNA</span></div></div></div><nav class="atlas-destinations" aria-label="定位会场城市"></nav><p class="atlas-location-note"></p>`;
  }
  main.prepend(scene);scene.dataset.globeMode=delegate?'xuhui':'committees';
  scene.querySelector('.eyebrow').textContent='2026 · SJTUMUNC · SHANGHAI';
  scene.querySelectorAll('.globe-console,.atlas-destinations,.atlas-location-note,.atlas-context').forEach(element=>element.remove());
  scene.classList.add('atlas-primary');scene.setAttribute('aria-labelledby','committee-atlas-title');
  let title=scene.querySelector('h1,h2');if(title.tagName!=='H1'){const h=document.createElement('h1');title.replaceWith(h);title=h;}title.id='committee-atlas-title';
  document.querySelector('.page-intro')?.remove();
  // Keep the delegate login guide and seat section below the globe.
  if(delegate){
    const old=document.querySelector('#background-heading');
    if(old){
      const h=document.createElement('h2');h.id=old.id;h.dataset.i18n=old.dataset.i18n;h.textContent=old.textContent;old.replaceWith(h);
    }
  }
})();
