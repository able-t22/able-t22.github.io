const menuToggle=document.getElementById('menuToggle');
const navLinks=document.getElementById('navLinks');
const themeToggle=document.getElementById('themeToggle');
const backToTop=document.getElementById('backToTop');
const scrollBeacon=document.getElementById('scrollBeacon');
const reveals=document.querySelectorAll('.reveal');
const signalField=document.querySelector('.signal-field');
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer=window.matchMedia('(pointer: coarse)').matches;

let lastScrollY=window.scrollY;
let scrollTicking=false;

const updateScrollState=()=>{
  const currentY=window.scrollY;
  const direction=currentY>lastScrollY?'down':currentY<lastScrollY?'up':'idle';
  document.body.dataset.scrollDirection=direction;
  if(scrollBeacon){
    scrollBeacon.classList.toggle('is-scrolling',direction!=='idle');
    scrollBeacon.classList.toggle('is-up',direction==='up');
  }
  backToTop?.classList.toggle('show',currentY>500);
  lastScrollY=currentY;
  scrollTicking=false;
};

window.addEventListener('scroll',()=>{
  if(scrollTicking)return;
  scrollTicking=true;
  requestAnimationFrame(updateScrollState);
},{passive:true});

menuToggle?.addEventListener('click',()=>{
  const open=navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded',String(open));
});

navLinks?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
  navLinks.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded','false');
}));

const applyTheme=theme=>{
  const light=theme==='light';
  document.body.classList.toggle('light',light);
  document.documentElement.style.colorScheme=light?'light':'dark';

  const icon=themeToggle?.querySelector('.theme-icon');
  const label=themeToggle?.querySelector('.theme-label');

  if(icon)icon.textContent=light?'☀':'☾';
  if(label)label.textContent=light?'Light':'Dark';

  themeToggle?.setAttribute(
    'aria-label',
    light?'Switch to dark theme':'Switch to light theme'
  );

  localStorage.setItem('able-theme',theme);
};

const storedTheme=localStorage.getItem('able-theme');
const preferred=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';

applyTheme(storedTheme||preferred);

themeToggle?.addEventListener('click',()=>{
  applyTheme(
    document.body.classList.contains('light')?'dark':'light'
  );
});

backToTop?.addEventListener('click',()=>{
  window.scrollTo({
    top:0,
    behavior:'smooth'
  });
});

document.querySelectorAll('img').forEach(img=>{
  img.addEventListener('error',()=>{
    const card=img.closest('.media-card,.project-visual');
    if(card)card.classList.add('image-missing');
    img.style.display='none';
  },{once:true});
});

if(!reduceMotion){
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  },{
    threshold:.08,
    rootMargin:'0px 0px -8% 0px'
  });

  reveals.forEach(el=>observer.observe(el));
}else{
  reveals.forEach(el=>el.classList.add('is-visible'));
}

const ticker=document.querySelector('.ticker');
const tickerTrack=document.querySelector('.ticker-track');

if(ticker&&tickerTrack&&!reduceMotion){
  const tickerObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      tickerTrack.style.animationPlayState=
        entry.isIntersecting?'running':'paused';
    });
  },{
    threshold:0
  });

  tickerObserver.observe(ticker);
}

if(signalField&&!reduceMotion&&!coarsePointer){
  let raf=0;
  let targetX=0;
  let targetY=0;
  let currentX=0;
  let currentY=0;

  const animateSignal=()=>{
    currentX+=(targetX-currentX)*.08;
    currentY+=(targetY-currentY)*.08;

    signalField.style.transform=
      `translate3d(${currentX}px,${currentY}px,0)`;

    raf=requestAnimationFrame(animateSignal);
  };

  raf=requestAnimationFrame(animateSignal);

  signalField.addEventListener('pointermove',event=>{
    const rect=signalField.getBoundingClientRect();

    targetX=
      ((event.clientX-(rect.left+rect.width/2))/rect.width)*10;

    targetY=
      ((event.clientY-(rect.top+rect.height/2))/rect.height)*10;
  },{passive:true});

  signalField.addEventListener('pointerleave',()=>{
    targetX=0;
    targetY=0;
  },{passive:true});

  window.addEventListener(
    'pagehide',
    ()=>cancelAnimationFrame(raf),
    {once:true}
  );
}
