/* Existing page headings and content remain the source of every destination. */
(() => {
  const main=document.querySelector('main');if(!main)return;
  const kind=document.querySelector('#about-content')?'uranus':document.querySelector('#notice-content')?'pluto':'neptune';
  document.body.dataset.planet=kind;
  const original=document.querySelector('.page-intro,.forum-hero');if(!original)return;
  const heading=original.querySelector('h1');
  const hero=document.createElement('section');hero.className='planet-scene atlas-primary home-orbit-scene';hero.dataset.planet=kind;hero.setAttribute('aria-labelledby','planet-page-title');
  hero.innerHTML=`<div class="planet-heading"><p class="eyebrow">2026 · SJTUMUNC · SHANGHAI</p></div><div class="planet-stage diplomatic-world"><div class="diplomatic-sphere"><canvas id="page-planet" tabindex="0" role="img"></canvas><div class="planet-ports"></div></div></div><div class="planet-caption"><span class="planet-name"></span></div><nav class="planet-contents" aria-label="本页内容"></nav>`;
  heading.id='planet-page-title';hero.querySelector('.planet-heading').append(heading);main.prepend(hero);
  hero.append(hero.querySelector('.planet-ports'));
  if(original.matches('.page-intro')){const intro=original.querySelector('.intro');if(intro){intro.classList.add('planet-intro');hero.after(intro);}original.remove();}else{original.querySelector('.forum-hero-art')?.remove();}
  function update(){
    const en=document.documentElement.lang.startsWith('en'),names={uranus:['天王星','URANUS'],neptune:['海王星','NEPTUNE'],pluto:['冥王星','PLUTO']};
    hero.querySelector('.planet-name').textContent=names[kind][en?1:0];
    hero.querySelector('canvas').setAttribute('aria-label',en?`Interactive ${kind}. Drag or use arrow keys to rotate.`:`可拖动的${names[kind][0]}，也可用方向键旋转。`);
    const sections=kind==='neptune'?[...main.querySelectorAll('.forum-section')]:[...main.querySelectorAll('.public-section')].filter(s=>s.querySelector('h2'));
    const nav=hero.querySelector('.planet-contents'),ports=hero.querySelector('.planet-ports');
    nav.setAttribute('aria-label',en?'Page contents':'本页内容');
    nav.replaceChildren();ports.replaceChildren();
    sections.slice(0,4).forEach((section,i)=>{
      if(!section.id)section.id=`planet-chapter-${i+1}`;
      const text=section.querySelector('h2').textContent;
      const a=document.createElement('a');a.href='#'+section.id;a.textContent=text;a.addEventListener('click',()=>{const h=section.querySelector('h2');h.tabIndex=-1;h.focus({preventScroll:true});});nav.append(a);
      
    });
  }
  // The public copy and its editorial wrapper settle at DOMContentLoaded.
  document.addEventListener('DOMContentLoaded',()=>{update();const content=document.querySelector('#about-content,#notice-content');if(content)new MutationObserver(update).observe(content,{childList:true});});
  new MutationObserver(()=>queueMicrotask(update)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
