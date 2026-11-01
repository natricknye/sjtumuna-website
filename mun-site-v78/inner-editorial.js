/* Presentation enhancement only: public copy, files and backend stay authoritative. */
(() => {
  const root=document.documentElement, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const stems={'01':'ga2','02':'ecosoc','03':'london','04':'unodc'};
  let activeCommittee=null;
  function contents(container) {
    if(!container||container.dataset.editorial)return;
    const sections=[...container.querySelectorAll('.public-section')];
    if(!sections.length)return;
    container.dataset.editorial='true';
    const nav=document.createElement('nav');nav.className='editorial-contents';
    nav.setAttribute('aria-label',root.lang==='zh-CN'?'页面目录':'On this page');
    sections.forEach((section,i)=>{
      if(!section.id)section.id=`${container.id}-chapter-${i+1}`;
      const heading=section.querySelector('h2');if(!heading)return;
      const a=document.createElement('a');a.href='#'+section.id;
      const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');
      a.append(number,document.createTextNode(heading.textContent));nav.append(a);
    });
    const content=document.createElement('div');content.className='editorial-reading';
    while(container.firstChild)content.append(container.firstChild);
    container.append(nav,content);container.classList.add('editorial-document');
  }
  function committees() {
    const container=document.querySelector('#committees-content');
    if(!container||container.dataset.editorial)return;
    const cards=[...container.querySelectorAll('.committee-card')];
    if(!cards.length)return;
    container.dataset.editorial='true';
    container.querySelector('.committee-index')?.remove();
    cards.forEach(card=>{
      const key=card.dataset.committee;
      const dossier=document.createElement('details');dossier.className='committee-dossier';
      dossier.dataset.committee=key;dossier.id=card.id;card.removeAttribute('id');
      dossier.open=key===activeCommittee;
      dossier.addEventListener('toggle',()=>{if(dossier.open)activeCommittee=key;});
      const summary=document.createElement('summary');summary.className='committee-dossier-heading';
      const number=document.createElement('span');number.className='dossier-number';number.textContent=key;
      const title=document.createElement('span');title.className='dossier-title';
      title.append(card.querySelector('h2'),card.querySelector('.committee-topic'));
      const capacity=card.querySelector('.committee-topline');
      const indicator=document.createElement('span');indicator.className='dossier-indicator';indicator.setAttribute('aria-hidden','true');indicator.textContent='+';
      summary.append(number,title,capacity,indicator);
      const figure=document.createElement('figure');figure.className='committee-editorial-art';
      const img=document.createElement('img');img.src=`assets/committee-${stems[key]}-detailed.svg`;img.width=960;img.height=640;img.alt='';img.loading='lazy';
      figure.setAttribute('aria-hidden','true');figure.append(img);card.prepend(figure);
      container.insertBefore(dossier,card);dossier.append(summary,card);
      summary.addEventListener('click',event=>{
        event.preventDefault();const wasOpen=dossier.open;
        cards.forEach(c=>{const d=c.closest('.committee-dossier');if(d&&d!==dossier)d.open=false;});
        dossier.open=!wasOpen;activeCommittee=dossier.open?key:null;
        if(dossier.open&&!reduced.matches)card.animate([{opacity:.3,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});
      });
    });
  }
  function enhance() {
    document.body.classList.add('inner-editorial');
    if(document.querySelector('#about-content'))document.body.classList.add('editorial-about');
    if(document.querySelector('#notice-content'))document.body.classList.add('editorial-guide');
    if(document.querySelector('.delegate-library'))document.body.classList.add('editorial-delegate');
    contents(document.querySelector('#about-content'));
    contents(document.querySelector('#notice-content'));
    committees();
  }
  function start(){
    const render=window.renderPublicContent;
    if(render)window.renderPublicContent=function(language){
      document.querySelectorAll('#about-content,#notice-content,#committees-content').forEach(e=>delete e.dataset.editorial);
      render(language);enhance();
    };
    enhance();
  }
  // Other deferred scripts own initial translations and content rendering.
  if(document.readyState!=='complete')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
