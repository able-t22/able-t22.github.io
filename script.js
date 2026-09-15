const progress=document.getElementById('progress');
const cursor=document.querySelector('.cursor-glow');
const menuToggle=document.getElementById('menuToggle');
const navLinks=document.getElementById('navLinks');
const themeToggle=document.getElementById('themeToggle');
const backToTop=document.getElementById('backToTop');
const reveals=document.querySelectorAll('.reveal');
const signalField=document.querySelector('.signal-field');

const updateScrollUI=()=>{
  const doc=document.documentElement;
  const max=doc.scrollHeight-window.innerHeight;
  const ratio=max>0?window.scrollY/max:0;
  progress.style.width=`${Math.min(100,Math.max(0,ratio*100))}%`;
  backToTop?.classList.toggle('show',window.scrollY>500);
};

window.addEventListener('scroll',updateScrollUI,{passive:true});
updateScrollUI();

if(cursor&&!window.matchMedia('(pointer: coarse)').matches){
  window.addEventListener('pointermove',e=>{
    cursor.style.left=`${e.clientX}px`;
    cursor.style.top=`${e.clientY}px`;
  });
}

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

  if(icon) icon.textContent=light?'☀':'☾';
  if(label) label.textContent=light?'Light':'Dark';

  if(themeToggle){
    themeToggle.setAttribute(
      'aria-label',
      light?'Switch to dark theme':'Switch to light theme'
    );
  }

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
    if(card) card.classList.add('image-missing');
    img.style.display='none';
  });
});

const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
},{threshold:.12});

reveals.forEach(el=>observer.observe(el));

if(
  signalField &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  !window.matchMedia('(pointer: coarse)').matches
){
  const nodes=signalField.querySelectorAll('.signal-node');

  signalField.addEventListener('pointermove',event=>{
    const rect=signalField.getBoundingClientRect();

    const x=(event.clientX-rect.left)/rect.width-.5;
    const y=(event.clientY-rect.top)/rect.height-.5;

    const mx=x*18;
    const my=y*18;

    signalField.style.transform=
      `perspective(900px) rotateX(${-my*.28}deg) rotateY(${mx*.28}deg)`;

    nodes.forEach((node,index)=>{
      const depth=(index%3+1)*2.2;

      node.style.marginLeft=`${x*depth}px`;
      node.style.marginTop=`${y*depth}px`;
    });
  });

  signalField.addEventListener('pointerleave',()=>{
    signalField.style.transform=
      'perspective(900px) rotateX(0deg) rotateY(0deg)';

    nodes.forEach(node=>{
      node.style.marginLeft='0px';
      node.style.marginTop='0px';
    });
  });
}
