
/* ═══════════════════════════════════════════════════════════
   SortLab — script.js  (Final Complete Version)

   KEY FEATURES
   ────────────
   1. CANDLE BARS — flame + wick + wax body
   2. MELTING EFFECT — when a candle reaches its sorted
      position its height is reduced by ~22%, colour turns
      green, flame shrinks and dims, wick turns charred.
      Melted candles are LOCKED and never move again.
   3. SWAP ANIMATION — swapping candles pulse with
      swapBounce keyframe (red-orange plasma burst).
   4. COMPARE HIGHLIGHT — two candles blaze yellow-white.
   5. V3 BACKGROUNDS — per-algo canvas animations:
        Bubble    → 90 floating 3D spheres
        Selection → amber dual laser scan beams
        Insertion → lime neon sliding lines
        Merge     → layered purple/pink sine waves
        Quick     → orange electric spark particles
   6. INDIVIDUAL MODE — single algo, step-by-step control
   7. ALL-TOGETHER MODE — all 5 simultaneously in mini panels
   8. CHAIN MODE — auto-run all 5 one after another
═══════════════════════════════════════════════════════════ */

const ALGO_ORDER = ['bubble','selection','insertion','merge','quick'];

const ALGO_INFO = {
  bubble:    { name:'Bubble Sort',    best:'O(n)',       avg:'O(n²)',       worst:'O(n²)',      space:'O(1)'     },
  selection: { name:'Selection Sort', best:'O(n²)',      avg:'O(n²)',       worst:'O(n²)',      space:'O(1)'     },
  insertion: { name:'Insertion Sort', best:'O(n)',       avg:'O(n²)',       worst:'O(n²)',      space:'O(1)'     },
  merge:     { name:'Merge Sort',     best:'O(n log n)', avg:'O(n log n)', worst:'O(n log n)', space:'O(n)'     },
  quick:     { name:'Quick Sort',     best:'O(n log n)', avg:'O(n log n)', worst:'O(n²)',      space:'O(log n)' },
};

const ALGO_ACCENT = {
  bubble:'#00e5ff', selection:'#ffd600',
  insertion:'#00e676', merge:'#9c6fff', quick:'#ff6d00',
};

/* ── GLOBAL STATE ───────────────────────────────────── */
let array        = [];
let frames       = [];
let currentFrame = -1;
let isPlaying    = false;
let playTimer    = null;
let selectedAlgo = 'bubble';
let viewMode     = 'separate';
let chainMode    = false;
let chainRunning = false;

/* Canvas BG state */
let bgAnimId = null;
let bgP      = [];
let mergeGT  = 0;

/* All-Together state */
const togState  = {};
const togBgId   = {};
const togBgP    = {};
const togMergeT = {};
let   togTimer  = null;

/* Track which indices are SORTED (melted & frozen) per render */
/* We cache the sorted indices from the previous frame so we
   can apply .melting CSS animation ONLY on newly-sorted ones. */
let prevSortedSet = new Set();

/* ── DOM REFS ───────────────────────────────────────── */
const barContainer   = document.getElementById('barContainer');
const bgCanvas       = document.getElementById('bgCanvas');
const ctx            = bgCanvas.getContext('2d');
const btnGenerate    = document.getElementById('btnGenerate');
const btnStart       = document.getElementById('btnStart');
const btnStartLabel  = document.getElementById('btnStartLabel');
const btnNext        = document.getElementById('btnNext');
const btnPrev        = document.getElementById('btnPrev');
const btnReset       = document.getElementById('btnReset');
const sizeSlider     = document.getElementById('arraySize');
const speedSlider    = document.getElementById('speedSlider');
const sizeVal        = document.getElementById('sizeVal');
const speedVal       = document.getElementById('speedVal');
const statComp       = document.getElementById('statComp');
const statSwap       = document.getElementById('statSwap');
const statStep       = document.getElementById('statStep');
const progressFill   = document.getElementById('progressFill');
const statusStrip    = document.getElementById('statusStrip');
const statusText     = document.getElementById('statusText');
const badgeName      = document.getElementById('badgeName');
const rbRing         = document.getElementById('rbRing');
const themeBadge     = document.getElementById('themeBadge');
const cBest          = document.getElementById('cBest');
const cAvg           = document.getElementById('cAvg');
const cWorst         = document.getElementById('cWorst');
const cSpace         = document.getElementById('cSpace');
const chainToggle    = document.getElementById('chainToggle');
const chainLabel     = document.getElementById('chainLabel');
const chainProgress  = document.getElementById('chainProgress');
const transFlash     = document.getElementById('transFlash');
const pageIndividual = document.getElementById('pageIndividual');
const pageAll        = document.getElementById('pageAll');
const allGrid        = document.getElementById('allGrid');
const btnAllGenerate = document.getElementById('btnAllGenerate');
const btnAllStart    = document.getElementById('btnAllStart');
const btnAllLabel    = document.getElementById('btnAllLabel');
const btnAllReset    = document.getElementById('btnAllReset');
const allStatus      = document.getElementById('allStatus');
const allSpeedSlider = document.getElementById('allSpeedSlider');
const allSizeSlider  = document.getElementById('allSizeSlider');
const allSpeedVal    = document.getElementById('allSpeedVal');
const allSizeVal     = document.getElementById('allSizeVal');

/* ══════════════════════════════════════════════════════
   CANVAS — resize to fit parent
══════════════════════════════════════════════════════ */
function resizeMainCanvas() {
  const w = bgCanvas.parentElement;
  bgCanvas.width  = w.clientWidth  || 800;
  bgCanvas.height = w.clientHeight || 360;
}
window.addEventListener('resize', () => { resizeMainCanvas(); startBg(); });

/* ══════════════════════════════════════════════════════
   V3 BACKGROUND ANIMATIONS
══════════════════════════════════════════════════════ */

/* ── BUBBLE: 90 floating 3D spheres ────────────────── */
function initBubbles(p, W, H) {
  p.length = 0;
  const cols = ['#00e5ff','#cc00ff','#00aaff','#aa00ff','#00ffdd','#ff44ff','#44ccff'];
  for (let i = 0; i < 90; i++) {
    const r = 5 + Math.random() * 36;
    p.push({
      x: Math.random() * W, y: H + r + Math.random() * H, r,
      speed: .22 + Math.random() * .85, drift: (Math.random() - .5) * .55,
      wobble: Math.random() * Math.PI * 2, wobbleS: .012 + Math.random() * .022,
      alpha: .07 + Math.random() * .2,
      col: cols[Math.floor(Math.random() * cols.length)],
    });
  }
}
function drawBubbles(p, c, W, H) {
  c.clearRect(0, 0, W, H);
  p.forEach(b => {
    b.wobble += b.wobbleS;
    b.x += Math.sin(b.wobble) * .7 + b.drift; b.y -= b.speed;
    if (b.y + b.r < 0) { b.y = H + b.r + Math.random() * 80; b.x = Math.random() * W; }
    const g = c.createRadialGradient(b.x - b.r*.3, b.y - b.r*.3, b.r*.05, b.x, b.y, b.r);
    g.addColorStop(0, 'rgba(255,255,255,.65)'); g.addColorStop(.15, b.col);
    g.addColorStop(.72, b.col); g.addColorStop(1, 'rgba(0,0,0,.4)');
    c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    c.fillStyle = g; c.globalAlpha = b.alpha; c.fill();
    c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    c.strokeStyle = b.col; c.lineWidth = 1; c.globalAlpha = b.alpha * .5; c.stroke();
    c.globalAlpha = 1;
  });
}

/* ── SELECTION: amber dual scan beams ─────────────── */
function initScanner(p, W, H) {
  p.length = 0;
  p.push({ type:'beam', y:0,   dir:1,  speed:1.1  });
  p.push({ type:'beam', y:H/2, dir:-1, speed:.65  });
  for (let i = 0; i < 22; i++)
    p.push({ type:'dot', x:Math.random()*W, y:Math.random()*H,
             alpha:Math.random()*.2, size:1+Math.random()*2.5, fd:Math.random()<.5?1:-1 });
}
function drawScanner(p, c, W, H) {
  c.clearRect(0, 0, W, H);
  p.forEach(q => {
    if (q.type === 'beam') {
      const cl = q.dir === 1 ? 'rgba(255,193,7,' : 'rgba(255,109,0,';
      const g = c.createLinearGradient(0, q.y-70, 0, q.y+70);
      g.addColorStop(0,'transparent'); g.addColorStop(.4,cl+'0.04)');
      g.addColorStop(.5,cl+'0.2)'); g.addColorStop(.6,cl+'0.04)'); g.addColorStop(1,'transparent');
      c.fillStyle = g; c.fillRect(0, q.y-70, W, 140);
      c.beginPath(); c.moveTo(0,q.y); c.lineTo(W,q.y);
      c.strokeStyle = cl+'0.55)'; c.lineWidth = 1; c.stroke();
      q.y += q.speed * q.dir; if (q.y > H || q.y < 0) q.dir *= -1;
    } else {
      c.beginPath(); c.arc(q.x, q.y, q.size, 0, Math.PI*2);
      c.fillStyle = `rgba(255,193,7,${Math.max(0, q.alpha)})`; c.fill();
      q.alpha += q.fd * .003; if (q.alpha > .22 || q.alpha < 0) q.fd *= -1;
    }
  });
}

/* ── INSERTION: lime neon sliding lines ─────────────── */
function initSliders(p, W, H) {
  p.length = 0;
  const cols = ['#00e676','#00b0ff','#69ff47','#18ffff'];
  for (let i = 0; i < 26; i++)
    p.push({
      x: -100 - Math.random()*W, y: (H/26)*i + (H/26)/2,
      w: 50 + Math.random()*140, speed: .3+Math.random()*.7,
      alpha: .06+Math.random()*.14,
      col: cols[Math.floor(Math.random()*cols.length)],
      h: 1 + Math.round(Math.random()),
    });
}
function drawSliders(p, c, W) {
  c.clearRect(0, 0, W, c.canvas.height);
  p.forEach(s => {
    const g = c.createLinearGradient(s.x, 0, s.x+s.w, 0);
    g.addColorStop(0,'transparent'); g.addColorStop(.15,s.col);
    g.addColorStop(.85,s.col); g.addColorStop(1,'transparent');
    c.fillStyle = g; c.globalAlpha = s.alpha;
    c.fillRect(s.x, s.y-s.h/2, s.w, s.h);
    c.beginPath(); c.arc(s.x+s.w, s.y, 2, 0, Math.PI*2);
    c.fillStyle = s.col; c.globalAlpha = s.alpha*1.8; c.fill();
    c.globalAlpha = 1;
    s.x += s.speed; if (s.x > W+20) s.x = -s.w - Math.random()*100;
  });
}

/* ── MERGE: layered sine waves ──────────────────────── */
function initWaves(p) {
  p.length = 0;
  const cols = ['#7c4dff','#e040fb','#9c27b0','#ba68c8','#4a148c','#ce93d8'];
  for (let i = 0; i < 6; i++)
    p.push({ freq:.004+i*.0015, phase:(i*Math.PI)/3,
             amp:18+i*14, col:cols[i%cols.length], alpha:.07+i*.015, speed:.008+i*.003 });
}
function drawWaves(p, c, W, H, t) {
  c.clearRect(0, 0, W, H);
  p.forEach(w => {
    c.beginPath();
    for (let x = 0; x <= W; x += 3) {
      const y = H*.5 + Math.sin(x*w.freq+t*w.speed+w.phase)*w.amp
                     + Math.sin(x*w.freq*1.7+t*w.speed*.6)*(w.amp*.45);
      x === 0 ? c.moveTo(x,y) : c.lineTo(x,y);
    }
    c.strokeStyle=w.col; c.lineWidth=1.8; c.globalAlpha=w.alpha; c.stroke(); c.globalAlpha=1;
  });
}

/* ── QUICK: spark particles ─────────────────────────── */
function initSparks(p, W, H) { p.length=0; spawnSparks(p,70,W,H); }
function spawnSparks(p, n, W, H) {
  const cols=['#ff6d00','#ffd600','#ff3d00','#ffab00','#ff9100'];
  for (let i=0;i<n;i++) {
    const a=Math.random()*Math.PI*2, sp=.5+Math.random()*2.8;
    p.push({
      x:W*.2+Math.random()*W*.6, y:H*.2+Math.random()*H*.6,
      vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:.7+Math.random()*.3,
      decay:.004+Math.random()*.006, len:12+Math.random()*28,
      col:cols[Math.floor(Math.random()*cols.length)], w:.8+Math.random()*1.2,
    });
  }
}
function drawSparks(p, c, W, H) {
  c.clearRect(0,0,W,H);
  let alive=0;
  p.forEach(q=>{
    if(q.life<=0)return; alive++;
    c.beginPath(); c.moveTo(q.x,q.y); c.lineTo(q.x-q.vx*q.len*.4,q.y-q.vy*q.len*.4);
    c.strokeStyle=q.col; c.lineWidth=q.w; c.globalAlpha=q.life*.38; c.stroke();
    c.beginPath(); c.arc(q.x,q.y,q.w+.5,0,Math.PI*2);
    c.fillStyle='#fff'; c.globalAlpha=q.life*.45; c.fill();
    c.globalAlpha=1;
    q.x+=q.vx; q.y+=q.vy; q.vx*=.993; q.vy*=.993; q.life-=q.decay;
    if(q.x<0)q.x=W; if(q.x>W)q.x=0; if(q.y<0)q.y=H; if(q.y>H)q.y=0;
  });
  if(alive<20) spawnSparks(p,45,W,H);
}

/* ── BG DISPATCH ────────────────────────────────────── */
function initBgFor(algo, c, p) {
  const W=c.canvas.width, H=c.canvas.height;
  switch(algo){
    case 'bubble':    initBubbles(p,W,H); break;
    case 'selection': initScanner(p,W,H); break;
    case 'insertion': initSliders(p,W,H); break;
    case 'merge':     initWaves(p);       break;
    case 'quick':     initSparks(p,W,H);  break;
  }
}
function drawBgFor(algo, c, p, t) {
  const W=c.canvas.width, H=c.canvas.height;
  switch(algo){
    case 'bubble':    drawBubbles(p,c,W,H);   break;
    case 'selection': drawScanner(p,c,W,H);   break;
    case 'insertion': drawSliders(p,c,W);     break;
    case 'merge':     drawWaves(p,c,W,H,t);   break;
    case 'quick':     drawSparks(p,c,W,H);    break;
  }
}
function startBg() {
  if(bgAnimId) cancelAnimationFrame(bgAnimId);
  bgP=[]; mergeGT=0; resizeMainCanvas();
  initBgFor(selectedAlgo, ctx, bgP);
  (function tick(){ mergeGT+=.5; drawBgFor(selectedAlgo,ctx,bgP,mergeGT); bgAnimId=requestAnimationFrame(tick); })();
}

/* ══════════════════════════════════════════════════════
   ARRAY GENERATION
══════════════════════════════════════════════════════ */
function generateArray() {
  stopPlay();
  const size = parseInt(sizeSlider.value);
  array = Array.from({length:size}, ()=>Math.floor(Math.random()*93)+7);
  frames=[]; currentFrame=-1; prevSortedSet=new Set();
  renderCandles(barContainer, array,[],[],[],[]);
  updateStats(0,0);
  setStatus('idle','Candles ready — press Start Sorting.');
  syncButtons();
}

/* ══════════════════════════════════════════════════════
   CANDLE RENDERER
   ──────────────
   Builds each candle: .bar > .candle-flame + .candle-wick + .candle-body

   SORTED (melted) candles:
   • Height reduced by 25% — looks like wax dripped away
   • .melting CSS animation fires ONCE on newly sorted
   • After animation the .sorted class adds the green style
   • prevSortedSet tracks which were ALREADY melted so the
     animation only plays once per candle, never again
══════════════════════════════════════════════════════ */
function renderCandles(container, arr, comparing, swapping, sorted, pivot) {
  container.innerHTML = '';
  const maxVal = Math.max(...arr, 1);

  arr.forEach((val, i) => {
    const isSorted  = sorted.includes(i);
    const isNewMelt = isSorted && !prevSortedSet.has(i);

    /* Sorted candles are 25% shorter — wax has melted away */
    const fullPct   = (val / maxVal) * 87;
    const heightPct = isSorted ? fullPct * 0.75 : fullPct;

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${heightPct}%`;
    bar.title = `Value: ${val}`;

    /* State priority: pivot > swapping > comparing > sorted */
    if      (pivot.includes(i))     bar.classList.add('pivot');
    else if (swapping.includes(i))  bar.classList.add('swapping');
    else if (comparing.includes(i)) bar.classList.add('comparing');
    else if (isSorted)              bar.classList.add('sorted');

    /* Fire the melt animation ONLY on newly-sorted candles */
    if (isNewMelt) {
      bar.classList.add('melting');
      /* Remove .melting after animation so sorted style stays clean */
      setTimeout(() => bar.classList.remove('melting'), 700);
    }

    /* Build candle DOM */
    const flame = document.createElement('div');
    flame.className = 'candle-flame';

    const wick = document.createElement('div');
    wick.className = 'candle-wick';

    const body = document.createElement('div');
    body.className = 'candle-body';

    bar.appendChild(flame);
    bar.appendChild(wick);
    bar.appendChild(body);
    container.appendChild(bar);
  });

  /* Update sorted tracker for next render */
  prevSortedSet = new Set(sorted);
}

/* ══════════════════════════════════════════════════════
   FRAME HELPER
══════════════════════════════════════════════════════ */
function mkF(arr,cmp,swp,srt,pvt,comp,swap,desc){
  return{arr:[...arr],comparing:[...cmp],swapping:[...swp],sorted:[...srt],pivot:[...pvt],comp,swap,desc};
}

/* ══════════════════════════════════════════════════════
   SORTING ALGORITHMS — all return frame arrays
══════════════════════════════════════════════════════ */
function recordBubble(a) {
  const arr=[...a],n=arr.length,R=[];let c=0,s=0,srt=[];
  for(let p=0;p<n-1;p++){let sw=false;
    for(let j=0;j<n-p-1;j++){
      c++; R.push(mkF(arr,[j,j+1],[],srt,[],c,s,`Pass ${p+1}: comparing ${arr[j]} and ${arr[j+1]}`));
      if(arr[j]>arr[j+1]){
        [arr[j],arr[j+1]]=[arr[j+1],arr[j]]; s++; sw=true;
        R.push(mkF(arr,[],[j,j+1],srt,[],c,s,`Swapped! ${arr[j+1]} ↔ ${arr[j]}`));
      }
    }
    srt=[n-1-p,...srt];
    R.push(mkF(arr,[],[],[...srt],[],c,s,`🕯 Candle ${n-1-p} melted into place`));
    if(!sw)break;
  }
  srt=[...new Set([0,...srt])];
  R.push(mkF(arr,[],[],[...Array(n).keys()],[],c,s,'✓ All candles sorted — melting complete!'));
  return R;
}

function recordSelection(a) {
  const arr=[...a],n=arr.length,R=[];let c=0,s=0,srt=[];
  for(let i=0;i<n-1;i++){
    let mi=i;
    for(let j=i+1;j<n;j++){
      c++; R.push(mkF(arr,[j,mi],[],srt,[],c,s,`Scanning: ${arr[j]} vs current min ${arr[mi]}`));
      if(arr[j]<arr[mi]) mi=j;
    }
    if(mi!==i){
      [arr[i],arr[mi]]=[arr[mi],arr[i]]; s++;
      R.push(mkF(arr,[],[i,mi],srt,[],c,s,`Placed min ${arr[i]} at position ${i}`));
    }
    srt=[...srt,i];
    R.push(mkF(arr,[],[],[...srt],[],c,s,`🕯 Candle ${i} melted into place`));
  }
  srt=[...srt,n-1];
  R.push(mkF(arr,[],[],[...Array(n).keys()],[],c,s,'✓ All candles sorted — melting complete!'));
  return R;
}

function recordInsertion(a) {
  const arr=[...a],n=arr.length,R=[];let c=0,s=0,srt=[0];
  for(let i=1;i<n;i++){
    const key=arr[i]; let j=i-1;
    R.push(mkF(arr,[i],[],[...srt],[],c,s,`Inserting candle with value ${key}`));
    while(j>=0&&arr[j]>key){
      c++; arr[j+1]=arr[j]; s++;
      R.push(mkF(arr,[j,j+1],[j+1],[...srt],[],c,s,`Shifting ${arr[j]} right`));
      j--;
    }
    c++; arr[j+1]=key; srt.push(i);
    R.push(mkF(arr,[],[j+1],[...srt],[],c,s,`🕯 ${key} placed — candle melts`));
  }
  R.push(mkF(arr,[],[],[...Array(n).keys()],[],c,s,'✓ All candles sorted — melting complete!'));
  return R;
}

function recordMerge(a) {
  const arr=[...a],R=[];let c=0,s=0;
  function ms(x,l,r){if(l>=r)return;const m=Math.floor((l+r)/2);ms(x,l,m);ms(x,m+1,r);mg(x,l,m,r);}
  function mg(x,l,m,r){
    const L=x.slice(l,m+1),Rv=x.slice(m+1,r+1);let i=0,j=0,k=l;
    while(i<L.length&&j<Rv.length){
      c++; R.push(mkF(x,[l+i,m+1+j],[],[],[],c,s,`Merge: ${L[i]} vs ${Rv[j]}`));
      x[k++]=L[i]<=Rv[j]?L[i++]:Rv[j++]; s++;
      R.push(mkF(x,[],[k-1],[],[],c,s,`Placed ${x[k-1]}`));
    }
    while(i<L.length){x[k++]=L[i++];s++;R.push(mkF(x,[],[k-1],[],[],c,s,'Copy left'));}
    while(j<Rv.length){x[k++]=Rv[j++];s++;R.push(mkF(x,[],[k-1],[],[],c,s,'Copy right'));}
  }
  ms(arr,0,arr.length-1);
  R.push(mkF(arr,[],[],[...Array(arr.length).keys()],[],c,s,'✓ All candles sorted — melting complete!'));
  return R;
}

function recordQuick(a) {
  const arr=[...a],R=[];let c=0,s=0;
  function qs(x,lo,hi){if(lo<hi){const p=pt(x,lo,hi);qs(x,lo,p-1);qs(x,p+1,hi);}}
  function pt(x,lo,hi){
    const pv=x[hi];
    R.push(mkF(x,[],[],[],[hi],c,s,`Pivot = ${pv} (crimson torch)`));
    let i=lo-1;
    for(let j=lo;j<hi;j++){
      c++; R.push(mkF(x,[j,hi],[],[],[hi],c,s,`${x[j]} vs pivot ${pv}`));
      if(x[j]<=pv){i++;[x[i],x[j]]=[x[j],x[i]];s++;R.push(mkF(x,[],[i,j],[],[hi],c,s,'Swap'));}
    }
    [x[i+1],x[hi]]=[x[hi],x[i+1]]; s++;
    R.push(mkF(x,[],[i+1],[],[],c,s,`🕯 Pivot ${x[i+1]} melts into place`));
    return i+1;
  }
  qs(arr,0,arr.length-1);
  R.push(mkF(arr,[],[],[...Array(arr.length).keys()],[],c,s,'✓ All candles sorted — melting complete!'));
  return R;
}

function buildFrames() {
  switch(selectedAlgo){
    case 'bubble':    frames=recordBubble(array);    break;
    case 'selection': frames=recordSelection(array); break;
    case 'insertion': frames=recordInsertion(array); break;
    case 'merge':     frames=recordMerge(array);     break;
    case 'quick':     frames=recordQuick(array);     break;
  }
  currentFrame=-1;
}

/* ══════════════════════════════════════════════════════
   FRAME DISPLAY
══════════════════════════════════════════════════════ */
function showFrame(idx) {
  if(idx<0||idx>=frames.length) return;
  currentFrame=idx;
  const f=frames[idx];
  renderCandles(barContainer, f.arr, f.comparing, f.swapping, f.sorted, f.pivot);
  updateStats(f.comp, f.swap);
  const pct = frames.length>1 ? (idx/(frames.length-1))*100 : 0;
  progressFill.style.width = pct+'%';
  statStep.textContent = `Step ${idx+1} / ${frames.length}`;
  setStatus('active', f.desc);
  syncButtons();
}

/* ══════════════════════════════════════════════════════
   AUTO-PLAY
══════════════════════════════════════════════════════ */
function startPlay() {
  isPlaying=true; rbRing.className='rb-ring active';
  btnStart.classList.add('paused'); btnStartLabel.textContent='Pause';
  btnStart.querySelector('.play-icon').style.display='none';
  playTimer=setInterval(()=>{
    if(currentFrame+1>=frames.length){
      stopPlay(); celebrate(()=>{ if(chainMode) startNextChainAlgo(); }); return;
    }
    showFrame(currentFrame+1);
  }, getDelay());
}

function stopPlay() {
  if(playTimer){clearInterval(playTimer);playTimer=null;}
  isPlaying=false; rbRing.className='rb-ring';
  btnStart.classList.remove('paused'); btnStartLabel.textContent='Start Sorting';
  const ic=btnStart.querySelector('.play-icon'); if(ic) ic.style.display='';
}

function getDelay() { return Math.round(1300/Math.pow(parseInt(speedSlider.value),1.5)); }

/* ══════════════════════════════════════════════════════
   CHAIN MODE
══════════════════════════════════════════════════════ */
function startNextChainAlgo() {
  const idx=ALGO_ORDER.indexOf(selectedAlgo);
  if(idx<0||idx>=ALGO_ORDER.length-1){
    chainRunning=false; updateChainProgress(null,true);
    showToast('🎉 All 5 algorithms complete!');
    setStatus('done','🎉 All 5 sorting algorithms done!');
    return;
  }
  const next=ALGO_ORDER[idx+1];
  transFlash.classList.add('flash-in');
  setTimeout(()=>{
    transFlash.classList.remove('flash-in');
    switchAlgo(next); generateArray();
    updateChainProgress(next);
    showToast(`▶ Now: ${ALGO_INFO[next].name}`);
    setTimeout(()=>{ buildFrames(); showFrame(0); startPlay(); },500);
  },220);
}

function startChain() {
  chainRunning=true; switchAlgo('bubble'); generateArray();
  updateChainProgress('bubble'); showToast('▶ Starting: Bubble Sort');
  setTimeout(()=>{ buildFrames(); showFrame(0); startPlay(); },350);
}

function updateChainProgress(current,allDone=false){
  document.querySelectorAll('.cp-item').forEach(item=>{
    const algo=item.dataset.algo; item.className='cp-item';
    if(allDone) item.classList.add('done-chain');
    else if(algo===current) item.classList.add('active-chain');
    else { const ai=ALGO_ORDER.indexOf(algo),ci=ALGO_ORDER.indexOf(current); if(ai<ci) item.classList.add('done-chain'); }
  });
}

/* ══════════════════════════════════════════════════════
   ALL-TOGETHER MODE
══════════════════════════════════════════════════════ */
function buildAllPanels() {
  allGrid.innerHTML='';
  ALGO_ORDER.forEach(algo=>{
    if(togBgId[algo]){cancelAnimationFrame(togBgId[algo]);togBgId[algo]=null;}
    togBgP[algo]=[]; togMergeT[algo]=0;
  });

  const sz=parseInt(allSizeSlider.value);
  const shared=Array.from({length:sz},()=>Math.floor(Math.random()*93)+7);

  ALGO_ORDER.forEach(algo=>{
    let fr;
    switch(algo){
      case 'bubble':    fr=recordBubble(shared);    break;
      case 'selection': fr=recordSelection(shared); break;
      case 'insertion': fr=recordInsertion(shared); break;
      case 'merge':     fr=recordMerge(shared);     break;
      case 'quick':     fr=recordQuick(shared);     break;
    }
    togState[algo]={frames:fr,cursor:0,done:false,prevSrt:new Set()};
  });

  ALGO_ORDER.forEach(algo=>{
    const info=ALGO_INFO[algo], accent=ALGO_ACCENT[algo];

    const panel=document.createElement('div');
    panel.className='mini-panel'; panel.id=`mp-${algo}`;

    const hdr=document.createElement('div'); hdr.className='mini-header';
    const ring=document.createElement('span'); ring.className='mini-ring'; ring.id=`mr-${algo}`; ring.style.background=accent;
    const title=document.createElement('span'); title.className='mini-title'; title.textContent=info.name;
    const badge=document.createElement('span'); badge.className='mini-badge';
    badge.style.color=accent; badge.style.borderColor=accent; badge.style.background=`${accent}18`;
    badge.textContent=info.worst;
    hdr.appendChild(ring); hdr.appendChild(title); hdr.appendChild(badge);

    const wrap=document.createElement('div'); wrap.className='mini-wrap';
    const mc=document.createElement('canvas'); mc.className='mini-canvas'; mc.id=`mc-${algo}`;
    const bars=document.createElement('div'); bars.className='mini-bars'; bars.id=`mb-${algo}`;
    wrap.appendChild(mc); wrap.appendChild(bars);

    const stats=document.createElement('div'); stats.className='mini-stats'; stats.id=`ms-${algo}`;
    stats.innerHTML=`Comp:<b id="mc-c-${algo}">0</b> &nbsp; Swaps:<b id="mc-s-${algo}">0</b>`;

    panel.appendChild(hdr); panel.appendChild(wrap); panel.appendChild(stats);
    allGrid.appendChild(panel);

    const miniCtx=mc.getContext('2d');
    function resizeMini(){mc.width=wrap.clientWidth||200;mc.height=wrap.clientHeight||180;}
    resizeMini();
    window.addEventListener('resize',resizeMini);

    const pArr=togBgP[algo];
    initBgFor(algo,miniCtx,pArr);
    (function miniTick(){
      togMergeT[algo]=(togMergeT[algo]||0)+.5;
      drawBgFor(algo,miniCtx,pArr,togMergeT[algo]);
      togBgId[algo]=requestAnimationFrame(miniTick);
    })();

    const f0=togState[algo].frames[0];
    renderCandles(bars,f0.arr,f0.comparing,f0.swapping,f0.sorted,f0.pivot);
  });
}

function startTogether(){
  if(togTimer){clearInterval(togTimer);togTimer=null;}
  const delay=Math.round(1300/Math.pow(parseInt(allSpeedSlider.value),1.5));

  togTimer=setInterval(()=>{
    let allDone=true;
    ALGO_ORDER.forEach(algo=>{
      const st=togState[algo]; if(!st||st.done)return;
      allDone=false; st.cursor++;
      if(st.cursor>=st.frames.length){st.cursor=st.frames.length-1;st.done=true;markMiniDone(algo);}
      const f=st.frames[st.cursor];
      const mb=document.getElementById(`mb-${algo}`);
      if(mb) renderCandles(mb,f.arr,f.comparing,f.swapping,f.sorted,f.pivot);
      const cc=document.getElementById(`mc-c-${algo}`); if(cc)cc.textContent=f.comp;
      const cs=document.getElementById(`mc-s-${algo}`); if(cs)cs.textContent=f.swap;
    });
    if(allDone){
      clearInterval(togTimer);togTimer=null;
      allStatus.textContent='✓ All 5 algorithms complete!';
      showToast('🎉 All sorted!');
      btnAllLabel.textContent='Run All 5'; btnAllStart.classList.remove('paused');
    }
  },delay);
}

function markMiniDone(algo){
  const p=document.getElementById(`mp-${algo}`); if(p){p.classList.remove('running');p.classList.add('finished');}
  const r=document.getElementById(`mr-${algo}`); if(r){r.className='mini-ring done';r.style.background='';}
  const ms=document.getElementById(`ms-${algo}`);
  if(ms){const t=document.createElement('span');t.className='mini-done-tag';t.textContent='✓ Done';ms.appendChild(t);}
}

function stopTogether(){
  if(togTimer){clearInterval(togTimer);togTimer=null;}
  btnAllLabel.textContent='Run All 5'; btnAllStart.classList.remove('paused');
}

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
function syncButtons(){
  const tog=viewMode==='together';
  const atEnd=frames.length>0&&currentFrame>=frames.length-1;
  const atStart=currentFrame<=0, none=frames.length===0;
  btnStart.disabled=tog||((atEnd&&!isPlaying)||(chainRunning&&!isPlaying&&currentFrame<0));
  btnPrev.disabled=tog||atStart||none||isPlaying||chainRunning;
  btnNext.disabled=tog||atEnd||isPlaying||chainRunning;
  btnReset.disabled=tog?false:(none&&currentFrame<0);
}

function setStatus(state,msg){
  statusStrip.className='status-strip'+(state!=='idle'?' '+state:'');
  statusText.textContent=msg;
}
function updateStats(comp,swap){ statComp.textContent=comp; statSwap.textContent=swap; }

function switchAlgo(algo){
  selectedAlgo=algo;
  document.querySelectorAll('.algo-btn').forEach(b=>b.classList.toggle('active',b.dataset.algo===algo));
  updateTheme();
}

function updateTheme(){
  const info=ALGO_INFO[selectedAlgo];
  badgeName.textContent=info.name; themeBadge.textContent='● '+info.name;
  cBest.textContent=info.best; cAvg.textContent=info.avg;
  cWorst.textContent=info.worst; cSpace.textContent=info.space;
  document.body.className='algo-'+selectedAlgo;
  if(viewMode==='separate') startBg();
}

function celebrate(cb){
  rbRing.className='rb-ring done';
  setStatus('done',`✓ ${ALGO_INFO[selectedAlgo].name} complete — all candles melted! 🕯`);
  progressFill.style.width='100%'; syncButtons();
  const bars=barContainer.querySelectorAll('.bar');
  bars.forEach((b,i)=>setTimeout(()=>{b.classList.add('popping');setTimeout(()=>b.classList.remove('popping'),400);},i*14));
  if(cb) setTimeout(cb,bars.length*14+500);
}

function showToast(msg){
  const old=document.querySelector('.toast'); if(old)old.remove();
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(),2400);
}

/* ══════════════════════════════════════════════════════
   VIEW MODE SWITCHING
══════════════════════════════════════════════════════ */
function setViewMode(mode){
  viewMode=mode;
  document.querySelectorAll('.main-tab').forEach(t=>t.classList.toggle('active',t.dataset.mode===mode));
  if(mode==='separate'){
    pageIndividual.classList.add('active'); pageAll.classList.remove('active');
    stopTogether();
    ALGO_ORDER.forEach(a=>{if(togBgId[a]){cancelAnimationFrame(togBgId[a]);togBgId[a]=null;}});
    startBg(); renderCandles(barContainer,array,[],[],[],[]); syncButtons();
    btnStartLabel.textContent=chainMode?'Run All Algos':'Start Sorting';
  } else {
    pageAll.classList.add('active'); pageIndividual.classList.remove('active');
    stopPlay(); if(bgAnimId){cancelAnimationFrame(bgAnimId);bgAnimId=null;}
    buildAllPanels(); allStatus.textContent='● Press Run All 5 to start.';
  }
}

/* ══════════════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════════════ */
btnGenerate.addEventListener('click',()=>{chainRunning=false;generateArray();});

btnStart.addEventListener('click',()=>{
  if(chainMode&&!chainRunning&&!isPlaying){startChain();return;}
  if(isPlaying){stopPlay();syncButtons();return;}
  if(frames.length===0||currentFrame>=frames.length-1) buildFrames();
  if(currentFrame<0) showFrame(0);
  startPlay();
});

btnNext.addEventListener('click',()=>{
  if(frames.length===0) buildFrames();
  if(currentFrame<0) showFrame(0);
  else showFrame(currentFrame+1);
  if(currentFrame>=frames.length-1) celebrate(null);
});

btnPrev.addEventListener('click',()=>{
  if(currentFrame>0){
    prevSortedSet=new Set(frames[currentFrame-1].sorted);
    showFrame(currentFrame-1);
  }
});

btnReset.addEventListener('click',()=>{
  chainRunning=false; stopPlay();
  frames=[]; currentFrame=-1; prevSortedSet=new Set();
  rbRing.className='rb-ring';
  renderCandles(barContainer,array,[],[],[],[]);
  updateStats(0,0); progressFill.style.width='0%'; statStep.textContent='Step 0 / 0';
  document.querySelectorAll('.cp-item').forEach(i=>i.className='cp-item');
  setStatus('idle','Reset — press Start Sorting.'); syncButtons();
});

sizeSlider.addEventListener('input',()=>{sizeVal.textContent=sizeSlider.value;generateArray();});
speedSlider.addEventListener('input',()=>{
  speedVal.textContent=speedSlider.value;
  if(isPlaying){clearInterval(playTimer);
    playTimer=setInterval(()=>{
      if(currentFrame+1>=frames.length){stopPlay();celebrate(()=>{if(chainMode)startNextChainAlgo();});return;}
      showFrame(currentFrame+1);
    },getDelay());}
});

document.querySelectorAll('.algo-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    if(chainRunning)return; if(isPlaying)stopPlay();
    switchAlgo(btn.dataset.algo);
    frames=[]; currentFrame=-1; prevSortedSet=new Set();
    renderCandles(barContainer,array,[],[],[],[]);
    updateStats(0,0); progressFill.style.width='0%'; statStep.textContent='Step 0 / 0';
    rbRing.className='rb-ring';
    setStatus('idle',`${ALGO_INFO[selectedAlgo].name} selected.`); syncButtons();
  });
});

document.querySelectorAll('.main-tab').forEach(t=>t.addEventListener('click',()=>setViewMode(t.dataset.mode)));

chainToggle.addEventListener('change',()=>{
  chainMode=chainToggle.checked;
  chainLabel.textContent=chainMode?'ON':'OFF';
  chainProgress.style.display=chainMode?'flex':'none';
  if(!chainMode){chainRunning=false;document.querySelectorAll('.cp-item').forEach(i=>i.className='cp-item');}
  syncButtons(); btnStartLabel.textContent=chainMode?'Run All Algos':'Start Sorting';
});

btnAllGenerate.addEventListener('click',()=>{buildAllPanels();allStatus.textContent='● New array — press Run All 5.';stopTogether();btnAllLabel.textContent='Run All 5';btnAllStart.classList.remove('paused');});

btnAllStart.addEventListener('click',()=>{
  if(togTimer){stopTogether();allStatus.textContent='⏸ Paused.';return;}
  ALGO_ORDER.forEach(algo=>{
    const st=togState[algo]; if(!st)return;
    st.cursor=0;st.done=false;st.prevSrt=new Set();
    const p=document.getElementById(`mp-${algo}`);if(p){p.classList.remove('finished');p.classList.add('running');}
    const r=document.getElementById(`mr-${algo}`);if(r){r.className='mini-ring active';r.style.background=ALGO_ACCENT[algo];}
    const ms=document.getElementById(`ms-${algo}`);if(ms){const tg=ms.querySelector('.mini-done-tag');if(tg)tg.remove();}
    const f0=st.frames[0], mb=document.getElementById(`mb-${algo}`);
    if(mb&&f0) renderCandles(mb,f0.arr,f0.comparing,f0.swapping,f0.sorted,f0.pivot);
    const cc=document.getElementById(`mc-c-${algo}`);if(cc)cc.textContent='0';
    const cs=document.getElementById(`mc-s-${algo}`);if(cs)cs.textContent='0';
  });
  btnAllLabel.textContent='Pause'; btnAllStart.classList.add('paused');
  allStatus.textContent='⚡ Running all 5 simultaneously...';
  startTogether();
});

btnAllReset.addEventListener('click',()=>{stopTogether();buildAllPanels();allStatus.textContent='● Reset — press Run All 5.';});

allSpeedSlider.addEventListener('input',()=>{allSpeedVal.textContent=allSpeedSlider.value;});
allSizeSlider.addEventListener('input',()=>{allSizeVal.textContent=allSizeSlider.value;buildAllPanels();allStatus.textContent='● Array size changed — press Run All 5.';});

document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  if(e.key===' '){e.preventDefault();viewMode==='together'?btnAllStart.click():btnStart.click();}
  else if(e.key==='ArrowRight'&&!btnNext.disabled) btnNext.click();
  else if(e.key==='ArrowLeft' &&!btnPrev.disabled) btnPrev.click();
  else if(e.key==='g'||e.key==='G') viewMode==='together'?btnAllGenerate.click():btnGenerate.click();
  else if(e.key==='r'||e.key==='R') viewMode==='together'?btnAllReset.click():btnReset.click();
  else if(e.key==='a'||e.key==='A'){chainToggle.checked=!chainToggle.checked;chainToggle.dispatchEvent(new Event('change'));}
  else if(e.key==='1') setViewMode('separate');
  else if(e.key==='2') setViewMode('together');
});

/* ── BOOT ───────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded',()=>{
  generateArray(); updateTheme(); syncButtons(); buildAllPanels();
});
