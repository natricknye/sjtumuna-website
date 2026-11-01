/* Keeps audio alive while the existing documents and their animations navigate. */
(()=>{
 'use strict';
 const base=new URL('.',document.currentScript.src),frame=document.getElementById('site-content');
 const pages=new Set(['index.html','about.html','committees.html','representative.html','forum.html','notice.html','astra.html']);
 function route(value){try{const url=new URL(value,base);if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return null;const leaf=url.pathname.slice(base.pathname.length);if(leaf===''||pages.has(leaf))return url;}catch{}return null;}
 let expected=route(new URL(location.href).searchParams.get('page')||'index.html')||new URL('index.html',base),loaded=false,lastTheme=0;
 history.replaceState({munPage:expected.href},'',expected.href);
 function navigate(url,push=true){if(!url)return;if(push&&url.href!==location.href)history.pushState({munPage:url.href},'',url.href);expected=url;
  if(loaded){frame.contentWindow.location.replace(url.href);}else frame.src=url.href;
 }
 frame.addEventListener('load',()=>{loaded=true;try{const url=route(frame.contentWindow.location.href);if(url){expected=url;if(location.href!==url.href)history.replaceState({munPage:url.href},'',url.href);document.title=frame.contentDocument.title;frame.title=frame.contentDocument.querySelector('h1')?.textContent.trim()||'大会网站内容';}}catch{}});
 addEventListener('message',event=>{if(event.origin!==base.origin||event.source!==frame.contentWindow)return;const data=event.data;if(!data||typeof data!=='object')return;
  if(data.type==='mun-music-route'){const url=route(data.url);if(url)navigate(url);}
  if(data.type==='mun-music-hash'){const url=route(data.url);if(url)history.replaceState({munPage:url.href},'',url.href);}
  if(data.type==='mun-music-close-panel')document.dispatchEvent(new Event('mun-music-close-panel'));
  if(data.type==='mun-auth-open')document.documentElement.classList.toggle('mun-auth-open',!!data.open);
 });
 addEventListener('popstate',()=>{const url=route(location.href);if(url)navigate(url,false);});
 function sync(now){if(now-lastTheme>100){lastTheme=now;try{const doc=frame.contentDocument;if(doc?.body){const style=frame.contentWindow.getComputedStyle(doc.body);for(const token of ['--fx-surface','--ink','--muted','--line','--fx-accent']){const value=style.getPropertyValue(token);if(value)document.documentElement.style.setProperty(token,value);}if(document.documentElement.lang!==doc.documentElement.lang)document.documentElement.lang=doc.documentElement.lang;document.documentElement.dir=doc.documentElement.dir||'ltr';if(document.title!==doc.title)document.title=doc.title;}}catch{}}requestAnimationFrame(sync);}
 navigate(expected,false);requestAnimationFrame(sync);
})();
