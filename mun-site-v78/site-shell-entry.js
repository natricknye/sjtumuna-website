/* A persistent top-level player; the existing documents remain independent pages. */
(()=>{
 'use strict';
 const base=new URL('.',document.currentScript.src),pages=new Set(['index.html','about.html','committees.html','representative.html','forum.html','notice.html','astra.html']);
 function allowed(value){const url=new URL(value,location.href);return url.origin===base.origin&&url.pathname.startsWith(base.pathname)&&pages.has(url.pathname.slice(base.pathname.length))?url:null;}
 const crawler=/(bingbot|googlebot|baiduspider|yandexbot|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot)/i.test(navigator.userAgent);
 if(window.parent===window){
  const route=location.pathname===base.pathname?'index.html':location.pathname.slice(base.pathname.length);
  if(!crawler&&pages.has(route)){const shell=new URL('site-shell.html',base);shell.searchParams.set('page',route+location.search+location.hash);location.replace(shell.href);}return;
 }
 window.munNavigateWithMusic=function(value){const url=allowed(value);if(!url)return false;window.parent.postMessage({type:'mun-music-route',url:url.href},base.origin);return true;};
 // Runs after the existing transition handler: leave its animated flights intact.
 document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{
  document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||link.target||link.hasAttribute('download'))return;const url=allowed(link.href);if(!url||url.pathname===location.pathname&&url.search===location.search)return;event.preventDefault();window.munNavigateWithMusic(url.href);});
 },0),{once:true});
 addEventListener('hashchange',()=>window.parent.postMessage({type:'mun-music-hash',url:location.href},base.origin));
 addEventListener('load',()=>{if(location.hash){try{document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();}catch{}}},{once:true});
 document.addEventListener('click',()=>window.parent.postMessage({type:'mun-music-close-panel'},base.origin));
})();
