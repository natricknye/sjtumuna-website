/* Music defaults to 75%, subject to browser autoplay policy. Explicit pause is remembered. */
(()=>{
 'use strict';if(window.parent!==window||document.querySelector('.site-music'))return;
 const tracks=[{title:'Celestial',file:'celestial',source:'https://www.scottbuckley.com.au/library/celestial/'},{title:'Hiraeth',file:'hiraeth',source:'https://www.scottbuckley.com.au/library/hiraeth/'}];
 const key='sjtumuna-music-v3';let saved={};try{saved=JSON.parse(sessionStorage.getItem(key)||'{}')||{};}catch{}
 let index=Number.isInteger(saved.index)&&saved.index>=0&&saved.index<tracks.length?saved.index:0;
 let volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(.8,saved.volume)):.75,wanted=saved.enabled!==false,pendingTime=Number.isFinite(saved.time)?Math.max(0,saved.time):0,fadeToken=0,attempt=0,message='',loading=false;
 const audio=document.createElement('audio');audio.preload='none';audio.setAttribute('aria-hidden','true');audio.dataset.siteMusic='';audio.volume=0;
 const host=document.createElement('aside');host.className='site-music';
 host.innerHTML='<div class="music-panel" id="music-panel" hidden><h2></h2><div class="music-tracks"></div><label class="music-volume"><span></span><input type="range" min="0" max="80" step="1"></label><p class="music-credit"></p><p class="music-status" role="status" aria-live="polite"></p></div><div class="music-bar"><button type="button" class="music-toggle" aria-pressed="false"><span class="music-dot" aria-hidden="true"></span><span></span></button><button type="button" class="music-menu" aria-controls="music-panel" aria-expanded="false"></button></div>';
 document.body.append(host,audio);const toggle=host.querySelector('.music-toggle'),menu=host.querySelector('.music-menu'),panel=host.querySelector('.music-panel'),slider=host.querySelector('input'),status=host.querySelector('.music-status');slider.value=String(Math.round(volume*100));
 panel.querySelector('h2').remove();
 tracks.forEach((track,i)=>{const b=document.createElement('button');b.type='button';b.className='music-track';b.innerHTML=`${track.title}<small>Scott Buckley</small>`;b.addEventListener('click',()=>{if(index!==i){++attempt;++fadeToken;audio.pause();index=i;pendingTime=0;audio.removeAttribute('src');audio.load();}wanted=true;play();});host.querySelector('.music-tracks').append(b);});
 const en=()=>!document.documentElement.lang.startsWith('zh');
 function persist(){try{sessionStorage.setItem(key,JSON.stringify({index,volume,enabled:wanted,time:pendingTime||(audio.currentSrc?audio.currentTime:0)}));}catch{}}
 function paint(){const english=en(),playing=!audio.paused&&!audio.ended;
  toggle.setAttribute('aria-pressed',String(playing));toggle.querySelector('span:last-child').textContent=english?(playing?'Music · On':wanted?'Play music':'Music · Off'):(playing?'音乐 · 开':wanted?'点击播放':'音乐 · 关');
  toggle.setAttribute('aria-label',english?(playing?'Pause background music':'Play background music'):(playing?'暂停背景音乐':'播放背景音乐'));menu.textContent=english?'Tracks':'选曲';host.setAttribute('aria-label',english?'Background music':'背景音乐');panel.querySelector('.music-volume span').textContent=english?'Volume':'音量';slider.setAttribute('aria-label',english?'Background music volume':'背景音乐音量');
  host.querySelectorAll('.music-track').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  panel.querySelector('.music-credit').innerHTML=`‘<a href="${tracks[index].source}" target="_blank" rel="noopener noreferrer">${tracks[index].title}</a>’ by <a href="https://www.scottbuckley.com.au/" target="_blank" rel="noopener noreferrer">Scott Buckley</a> — released under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.`;
  status.textContent=message==='blocked'?(english?'Autoplay was blocked. Tap Music to play.':'浏览器限制了自动播放，请点击音乐开关。'):message==='error'?(english?'Music could not load. Tap to retry.':'音乐暂时加载失败，点击开关重试。'):loading?(english?'Loading…':'正在加载…'):'';status.hidden=!status.textContent;
 }
 function fade(to,done){const token=++fadeToken,from=audio.volume,start=performance.now();function frame(now){if(token!==fadeToken)return;const p=Math.min(1,(now-start)/500);audio.volume=from+(to-from)*(p*p*(3-2*p));if(p<1)requestAnimationFrame(frame);else done?.();}requestAnimationFrame(frame);}
 async function play(){const token=++attempt;wanted=true;message='';loading=true;paint();if(!audio.getAttribute('src')||audio.error){audio.volume=0;audio.src=`assets/music/${tracks[index].file}.mp3`;}
  try{await audio.play();if(token!==attempt)return;loading=false;fade(volume);paint();persist();}catch(error){if(token!==attempt)return;loading=false;if(error.name==='AbortError')return;message=error.name==='NotAllowedError'?'blocked':'error';if(message==='error')wanted=false;paint();persist();}
 }
 toggle.addEventListener('click',()=>{if(!audio.paused||loading){++attempt;wanted=false;loading=false;fade(0,()=>{audio.pause();paint();});persist();paint();}else play();});
 slider.addEventListener('input',()=>{volume=Number(slider.value)/100;++fadeToken;if(!audio.paused)audio.volume=volume;persist();});
 menu.addEventListener('click',()=>{panel.hidden=!panel.hidden;menu.setAttribute('aria-expanded',String(!panel.hidden));});
 function close(){panel.hidden=true;menu.setAttribute('aria-expanded','false');}
 document.addEventListener('mun-music-close-panel',close);
 document.addEventListener('click',e=>{if(!host.contains(e.target))close();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){close();menu.focus();}});
 function restorePosition(){if(!pendingTime||!Number.isFinite(audio.duration))return;const target=Math.min(pendingTime,Math.max(0,audio.duration-.1));for(let i=0;i<audio.seekable.length;i++){if(audio.seekable.start(i)<=target&&audio.seekable.end(i)>=target){audio.currentTime=target;pendingTime=0;break;}}}
 for(const event of ['loadedmetadata','canplay','progress','durationchange'])audio.addEventListener(event,restorePosition);
 audio.addEventListener('ended',()=>{index=(index+1)%tracks.length;audio.removeAttribute('src');pendingTime=0;if(wanted)play();else paint();});
 audio.addEventListener('error',()=>{++attempt;++fadeToken;loading=false;wanted=false;message='error';paint();persist();});
 audio.addEventListener('pause',paint);audio.addEventListener('playing',paint);
 let lastSave=0;audio.addEventListener('timeupdate',()=>{if(Date.now()-lastSave>2000){persist();lastSave=Date.now();}});addEventListener('pagehide',persist);
 new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});paint();if(wanted)play();
})();
