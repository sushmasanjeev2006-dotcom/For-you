// app.js - main site controller (lightweight, mobile-friendly)
// This file controls navigation to sub-pages (we keep everything client-side simple).
// The heavier interactions (coin game, tic-tac-toe, certificate) are implemented here
// so you can host this single page and link to certificate.html (which reads localStorage).
// NOTE: Put bracelet image in "assets/bracelet.jpg"

(() => {
  const enterBtn = document.getElementById('enterBtn');
  const viewCert = document.getElementById('viewCert');
  const playerNameEl = document.getElementById('playerName');
  const braceletImg = document.getElementById('braceletImg');

  const BRA_PATH = 'assets/bracelet.jpg'; // ensure file present
  // If bracelet exists, show it; otherwise show subtle placeholder (already in HTML)
  fetch(BRA_PATH, { method: 'HEAD' }).then(r => {
    if (r.ok) { braceletImg.src = BRA_PATH; braceletImg.alt = 'Bracelet — family token'; }
    else { /* file not found — keep default or hide */ }
  }).catch(()=>{ /* ignore */ });

  // Basic routing: we'll open small popup flows to keep single-file simple
  enterBtn.addEventListener('click', () => {
    // Move the user into the mini-game sequence.
    // We'll redirect to stage pages implemented inline as lightweight overlays to avoid broken navigation on phones.
    runSequence();
  });

  viewCert.addEventListener('click', () => {
    // go to certificate page
    window.location.href = 'certificate.html';
  });

  // Background particle renderer (subtle, cheap)
  const bg = document.getElementById('bg');
  const bctx = bg.getContext('2d');
  function resizeBg(){ bg.width = innerWidth; bg.height = innerHeight; }
  window.addEventListener('resize', resizeBg);
  function spawnParticles(n=40){
    const p = [];
    for(let i=0;i<n;i++){
      p.push({
        x: Math.random()*bg.width,
        y: Math.random()*bg.height,
        r: 0.5 + Math.random()*2.4,
        vy: -0.08 - Math.random()*0.4,
        a: 0.2 + Math.random()*0.6,
        g: 8 + Math.random()*20
      });
    }
    (function loop(){
      bctx.clearRect(0,0,bg.width,bg.height);
      for(const o of p){
        const g = bctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.g);
        g.addColorStop(0, `rgba(255,255,255,${o.a})`);
        g.addColorStop(1, 'rgba(255,150,200,0)');
        bctx.fillStyle = g;
        bctx.fillRect(o.x-o.g, o.y-o.g, o.g*2, o.g*2);
        o.y += o.vy;
        if(o.y < -20){ o.y = bg.height + 20; o.x = Math.random()*bg.width; }
      }
      requestAnimationFrame(loop);
    })();
  }
  resizeBg(); spawnParticles(48);

  // -------- SEQUENCE: coin mini-game -> missions -> tic-tac-toe -> certificate ----------
  async function runSequence(){
    // Use overlays created on the fly so we don't rely on multiple pages.
    try {
      await runCoinGame();           // collects coins, returns number
      await runMissions();           // small choices, adds coins
      await runTicTacToe();          // quick match vs unbeatable AI
      await generateCertificate();   // create and save certificate to localStorage
      alert('All done — certificate saved. You can open it via "View Certificate".');
      window.location.href = 'certificate.html';
    } catch(e){
      console.error('Sequence error', e);
      alert('Something went wrong. Try again.');
    }
  }

  // Overlay helper
  function createOverlay(){ 
    const ov = document.createElement('div'); ov.style.position='fixed'; ov.style.inset='0'; ov.style.zIndex='9999';
    ov.style.background='linear-gradient(180deg, rgba(5,3,10,0.75), rgba(5,3,10,0.9))'; ov.style.display='flex'; ov.style.alignItems='center'; ov.style.justifyContent='center';
    document.body.appendChild(ov); return ov;
  }

  // --- Coin mini-game (tap falling coins for 12 seconds) ---
  function runCoinGame(){
    return new Promise((res) => {
      const overlay = createOverlay();
      const box = document.createElement('div');
      box.style.width = Math.min(window.innerWidth-40, 760)+'px';
      box.style.maxWidth = '92%';
      box.style.borderRadius = '12px';
      box.style.padding = '14px';
      box.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))';
      box.style.textAlign = 'center';
      overlay.appendChild(box);

      box.innerHTML = `<h2 style="margin:6px 0;color:#ffd6ee">Coin Rush</h2>
        <div style="color:#caa">Tap the mystic coins — 12 seconds</div>
        <canvas id="cg" width="${Math.min(window.innerWidth-80,720)}" height="260" style="margin-top:12px;border-radius:8px;background:linear-gradient(180deg,#fff0fb,#fff6fb)"></canvas>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:12px">
          <button id="cgStart" class="btn primary">Start</button>
          <button id="cgSkip" class="btn ghost">Skip</button>
        </div>
        <div id="cgScore" style="margin-top:12px;color:#ffd6ee">Score: 0</div>`;

      const c = box.querySelector('#cg');
      const ctx = c.getContext('2d');
      let coins = [], active = false, score = 0, timer = 12, tInt = null, animId = null;

      function spawn(n=14){
        coins = [];
        for(let i=0;i<n;i++){
          coins.push({ x: Math.random()*c.width, y: -Math.random()*c.height, vy: 0.9 + Math.random()*1.6, r: 12 + Math.random()*8, tapped:false });
        }
      }
      function draw(){
        ctx.clearRect(0,0,c.width,c.height);
        for(const p of coins){
          // radial
          const g = ctx.createLinearGradient(p.x-p.r,p.y-p.r,p.x+p.r,p.y+p.r);
          g.addColorStop(0,'#ffd681'); g.addColorStop(1,'#ffb3e6');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = '#ffd18a'; ctx.stroke();
          p.y += p.vy;
          if(p.y > c.height + 30){ p.y = -20; p.x = Math.random()*c.width; p.tapped=false; }
        }
        animId = requestAnimationFrame(draw);
      }
      function startRound(){
        if(active) return;
        active = true; score = 0; timer = 12; box.querySelector('#cgScore').textContent = 'Score: 0';
        spawn(18); draw();
        tInt = setInterval(()=>{
          timer--; box.querySelector('#cgScore').textContent = `Score: ${score} • Time: ${timer}s`;
          if(timer<=0){ stopRound(); }
        },1000);
      }
      function stopRound(){
        active = false;
        clearInterval(tInt); cancelAnimationFrame(animId);
        // small fade and resolve
        overlay.remove();
        // award coins (persist)
        addCoins(score);
        res(score);
      }
      c.addEventListener('click', (ev)=>{
        if(!active) return;
        const rect = c.getBoundingClientRect();
        const x = (ev.clientX - rect.left) * (c.width / rect.width);
        const y = (ev.clientY - rect.top) * (c.height / rect.height);
        for(const p of coins){
          const dx = x - p.x, dy = y - p.y;
          if(!p.tapped && dx*dx + dy*dy <= p.r*p.r){
            p.tapped = true; score++; box.querySelector('#cgScore').textContent = `Score: ${score} • Time: ${timer}s`;
            break;
          }
        }
      });

      box.querySelector('#cgStart').addEventListener('click', startRound);
      box.querySelector('#cgSkip').addEventListener('click', ()=>{
        overlay.remove(); addCoins(0); res(0);
      });
    });
  }

  // coin store in state/localStorage
  function addCoins(n){
    const prev = parseInt(localStorage.getItem('mystic_coins') || '0',10);
    const now = prev + (n || 0);
    localStorage.setItem('mystic_coins', String(now));
  }

  // --- Missions: meaningful choices, bracelet theme ---
  function runMissions(){
    return new Promise((res) => {
      const overlay = createOverlay();
      const box = document.createElement('div');
      box.style.width = Math.min(window.innerWidth-40,680)+'px';
      box.style.maxWidth = '94%';
      box.style.borderRadius = '12px';
      box.style.padding = '16px';
      box.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))';
      box.style.textAlign = 'left';
      overlay.appendChild(box);

      // mission list (compact)
      const missions = [
        { title: 'Gym Pact', body: 'You promise to spot each other. Reward: 3 coins', choices: [{t:'I promise', c:3},{t:'Maybe', c:0}] },
        { title: 'Bracelet Honor', body: 'The black bead belonged to your mom. You keep it safe? Reward: 5 coins', choices: [{t:'Yes, always', c:5},{t:'Respectfully', c:3}] },
        { title: 'Anime Night', body: 'Choose a series for a watch-night. Reward: 2 coins', choices: [{t:'Action', c:2},{t:'Slice of life', c:1}] }
      ];
      let idx = 0;
      box.innerHTML = `<h2 style="color:#ffd6ee;margin:0 0 8px">Missions</h2><div id="mroot"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button id="mSkip" class="btn ghost">Skip</button></div>`;
      const root = box.querySelector('#mroot');
      function render(){
        root.innerHTML = '';
        if(idx >= missions.length){
          overlay.remove(); res(); return;
        }
        const m = missions[idx];
        const title = document.createElement('div'); title.style.fontWeight='700'; title.style.marginBottom='6px'; title.textContent = m.title;
        const body = document.createElement('div'); body.style.color='#caa'; body.textContent = m.body;
        const choices = document.createElement('div'); choices.style.display='flex'; choices.style.gap='8px'; choices.style.marginTop='12px';
        for(const opt of m.choices){
          const b = document.createElement('button'); b.className='btn primary'; b.style.background='linear-gradient(90deg,#c84a8f,#ff95c9)'; b.textContent = `${opt.t} (+${opt.c})`;
          b.onclick = ()=>{ addCoins(opt.c); idx++; render(); };
          choices.appendChild(b);
        }
        root.appendChild(title); root.appendChild(body); root.appendChild(choices);
      }
      box.querySelector('#mSkip').addEventListener('click', ()=>{ overlay.remove(); res(); });
      render();
    });
  }

  // ---- Tic-Tac-Toe overlay with minimax AI (unbeatable) ----
  function runTicTacToe(){
    return new Promise((res) => {
      const overlay = createOverlay();
      overlay.style.alignItems='flex-start';
      overlay.style.paddingTop='40px';
      const box = document.createElement('div');
      box.style.width = Math.min(window.innerWidth-40,520)+'px';
      box.style.maxWidth = '94%';
      box.style.borderRadius = '12px'; box.style.padding='14px';
      box.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))';
      overlay.appendChild(box);
      box.innerHTML = `<h2 style="color:#ffd6ee;margin:6px 0">Tic-Tac-Toe — Portal Match</h2><div id="board" style="display:grid;grid-template-columns:repeat(3,86px);gap:8px;justify-content:center"></div><div style="display:flex;gap:8px;justify-content:center;margin-top:12px"><button id="tttReset" class="btn ghost">Reset</button><button id="tttDone" class="btn primary">Done</button></div>`;
      const boardEl = box.querySelector('#board');
      let board = Array(9).fill(null);

      function drawBoard(){
        boardEl.innerHTML = '';
        for(let i=0;i<9;i++){
          const c = document.createElement('div');
          c.style.width='86px'; c.style.height='86px'; c.style.display='flex'; c.style.alignItems='center'; c.style.justifyContent='center';
          c.style.fontSize='34px'; c.style.borderRadius='8px'; c.style.background='#0f0713'; c.style.cursor='pointer'; c.style.color='#ffd6ee';
          c.textContent = board[i] || '';
          c.addEventListener('click', ()=> {
            if(board[i] || checkWinner(board)) return;
            board[i] = 'X';
            drawBoard();
            if(!checkWinner(board) && !isFull(board)){
              const aiMoveIndex = minimaxRoot(board,'O');
              if(aiMoveIndex!=null){ board[aiMoveIndex] = 'O'; }
              drawBoard();
            }
            // if game ended leave small pause
          });
          boardEl.appendChild(c);
        }
      }
      drawBoard();

      box.querySelector('#tttReset').addEventListener('click', ()=>{ board = Array(9).fill(null); drawBoard(); });
      box.querySelector('#tttDone').addEventListener('click', ()=>{ overlay.remove(); res(); });

      // minimax helpers:
      function isFull(b){ return b.every(Boolean); }
      function checkWinner(b){
        const wd = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for(const w of wd){ const [a,b1,c]=w; if(b[a] && b[a]===b[b1] && b[a]===b[c]) return b[a]; }
        return null;
      }
      function minimaxRoot(bd, player){
        const avail = bd.map((v,i)=> v ? null : i).filter(v=>v!==null);
        let best = -Infinity, move = null;
        for(const i of avail){
          bd[i] = player;
          const score = minimax(bd,0,false);
          bd[i] = null;
          if(score > best){ best = score; move = i; }
        }
        return move;
      }
      function minimax(bd, depth, isMax){
        const winner = checkWinner(bd);
        if(winner === 'O') return 10 - depth;
        if(winner === 'X') return depth - 10;
        if(isFull(bd)) return 0;
        if(isMax){
          let best = -Infinity;
          for(let i=0;i<9;i++){ if(!bd[i]){ bd[i]='O'; best = Math.max(best, minimax(bd, depth+1, false)); bd[i]=null; } }
          return best;
        } else {
          let best = Infinity;
          for(let i=0;i<9;i++){ if(!bd[i]){ bd[i]='X'; best = Math.min(best, minimax(bd, depth+1, true)); bd[i]=null; } }
          return best;
        }
      }
    });
  }

  // ---- Certificate generation (draws to canvas and stores base64 in localStorage) ----
  function generateCertificateImage(){
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const W = 1400, H = 900;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      // parchment background
      ctx.fillStyle = '#fff6f8'; ctx.fillRect(0,0,W,H);
      // textured subtle noise (cheap)
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      for(let i=0;i<800;i++){ ctx.fillRect(Math.random()*W, Math.random()*H, 1, 1); }
      // gold border
      ctx.strokeStyle = '#d7a377'; ctx.lineWidth = 10; roundRect(ctx,30,30,W-60,H-60,24,false,true);
      // title
      ctx.fillStyle = '#4b1131'; ctx.font = '36px Georgia'; ctx.textAlign='center';
      ctx.fillText('Certificate of Unescapable Friendship', W/2, 120);
      // name
      ctx.font = '48px Georgia'; ctx.fillStyle = '#2f0820';
      ctx.fillText('SHUB', W/2, 220);
      // message with bracelet mention
      ctx.font = '20px "Inter", sans-serif'; ctx.fillStyle = '#3b1728';
      const msg = `This certifies that SHUB is forcefully enrolled in this Princess Friendship. Escape is not an option. The bracelet of white beads (with one black bead) is recognized as a heritage token and must be kept safe.`;
      // wrap
      wrapText(ctx, msg, W/2, 280, W-240, 28);
      // embed bracelet if available
      const img = new Image();
      img.onload = ()=> {
        const size = 180;
        ctx.beginPath(); ctx.arc(W/2, H-180, size/2+6, 0, Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.03)'; ctx.fill();
        ctx.drawImage(img, W/2 - size/2, H-180 - size/2, size, size);
        // seal
        ctx.beginPath(); ctx.fillStyle = '#ffb3e6'; ctx.arc(W/2 - 260, H-140, 54, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#4a1534'; ctx.font='16px Georgia'; ctx.fillText('PRINCESS SEAL', W/2 - 260, H-136);
        const dataUrl = canvas.toDataURL('image/png');
        try{ localStorage.setItem('mystic_cert', dataUrl); } catch(e){ console.warn(e); }
        resolve(dataUrl);
      };
      img.onerror = ()=> {
        // proceed without bracelet
        ctx.fillStyle = '#ffb3e6'; ctx.beginPath(); ctx.arc(W/2 - 260, H-140, 54, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#4a1534'; ctx.font='16px Georgia'; ctx.fillText('PRINCESS SEAL', W/2 - 260, H-136);
        const dataUrl = canvas.toDataURL('image/png');
        try{ localStorage.setItem('mystic_cert', dataUrl); } catch(e){ console.warn(e); }
        resolve(dataUrl);
      };
      // try to load bracelet from assets
      img.crossOrigin = 'anonymous';
      img.src = 'assets/bracelet.jpg';
    });
  }

  function generateCertificate(){
    return generateCertificateImage();
  }

  async function generateCertificateWrapper(){
    await generateCertificate();
    // notify user
    alert('Certificate generated and saved locally. Use "View Certificate" to download or share.');
  }

  async function generateCertificateAndOpen(){
    await generateCertificate();
    window.location.href = 'certificate.html';
  }

  // expose a simple wrapper used in sequence
  async function generateCertificate(){
    return await generateCertificateImage();
  }

  // utils
  function wrapText(ctx, text, x, y, maxW, lh){
    ctx.textAlign='center';
    const words = text.split(' ');
    let line='', row=0;
    for(let n=0;n<words.length;n++){
      const test = line + words[n] + ' ';
      if(ctx.measureText(test).width > maxW && n>0){
        ctx.fillText(line, x, y + row*lh);
        line = words[n] + ' ';
        row++;
      } else line = test;
    }
    ctx.fillText(line, x, y + row*lh);
  }
  function roundRect(ctx,x,y,w,h,r,fill,stroke){
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
    if(fill) ctx.fill(); if(stroke) ctx.stroke();
  }

  // Expose functions in global so certificate page can also call if needed
  window.portal = {
    generateCertificate: generateCertificateImage,
    addCoins,
  };
})();
