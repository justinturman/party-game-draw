(function () {
  const root = document.getElementById('root');

  // Drawing constants. These must match server.js.
  const CW = 640;
  const CH = 480;
  const MAX_POINTS = 2500;
  const MAX_CHUNK = 80;
  const COLORS = ['#111111', '#ffffff', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#6d4c41', '#ec407a'];
  const WIDTHS = [4, 10, 22];

  // Anything players typed is escaped before it goes into the page
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  const send = (name, ...args) => parent.postMessage({ type: 'move', name, args }, '*');
  const nm = (names, id) => esc((names && names[id]) || `Player ${Number(id) + 1}`);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const $ = (id) => document.getElementById(id);

  let last = null; // the most recent message from the platform
  let layoutKey = null; // which screen layout is currently built
  let nudgeAt = 0;
  let hereAt = 0; // when we last said "I'm here"
  let awayAt = 0; // when we first noticed the drawer had gone
  const tool = { color: 0, width: 1 };
  let mirror = { round: -1, strokes: [] }; // the drawer's own copy of the drawing
  const deadlines = {}; // timer id -> the local time when it ends

  // ---------------- Clock ----------------
  // The server sends "time left". We turn it into a local deadline the first time
  // we see each timer, so re-sent copies of old states don't restart the countdown.
  function track(S) {
    if (S.timer && deadlines[S.timer.id] === undefined) {
      deadlines[S.timer.id] = Date.now() + S.timer.left;
    }
  }
  function remaining() {
    if (!last) return null;
    const t = last.state.G.timer;
    if (!t || deadlines[t.id] === undefined) return null;
    return deadlines[t.id] - Date.now();
  }

  // Runs several times a second: updates the clock, and asks the server to move on
  // once time is up (the server checks the clock itself, so asking early does nothing)
  function tick() {
    if (!last) return;
    const S = last.state.G;
    const r = remaining();
    const clock = $('clock');
    if (clock) {
      if (r === null) {
        clock.textContent = '';
      } else {
        const s = Math.max(0, Math.ceil(r / 1000));
        clock.textContent = `⏱ ${s}`;
        clock.classList.toggle('low', s <= 10 && S.timer.kind !== 'recap');
      }
    }
    if (last.view !== 'player' || S.role === 'spectator' || Date.now() < nudgeAt) return;

    // players take turns asking, so the server is not asked 16 times at once
    const slot = 300 + 300 * Math.max(0, S.present.indexOf(last.playerID));
    let go = null;
    if (S.timer && r !== null && r <= -slot) {
      if (S.timer.kind === 'recap') go = ['nextTurn', S.round];
      else if (S.timer.kind === 'draw') go = ['endTurn'];
      else if (S.timer.kind === 'choose' && S.role !== 'drawer') go = ['passTurn'];
    }
    // a drawer who has gone away should not hold everyone up
    if (!go && S.drawerAway && S.role !== 'drawer') {
      if (!awayAt) awayAt = Date.now();
      if (Date.now() - awayAt >= slot) {
        if (S.phase === 'drawing') go = ['endTurn'];
        else if (S.phase === 'choosing') go = ['passTurn'];
      }
    } else if (!S.drawerAway) {
      awayAt = 0;
    }
    if (go) {
      nudgeAt = Date.now() + 3000;
      send(...go);
    }
  }
  setInterval(tick, 250);

  // ---------------- "I'm here" ----------------
  // The server cannot see who is connected, so each phone says so every few seconds.
  // Until it shows up in the list of players who are here, it says so more often
  // (a message can be refused when the room is busy).
  function heartbeat() {
    if (!last || last.view !== 'player') return;
    const S = last.state.G;
    if (S.role === 'spectator') return;
    const gap = S.present.includes(last.playerID) ? 8000 : 1500;
    if (Date.now() - hereAt >= gap) {
      hereAt = Date.now();
      send('here');
    }
  }
  setInterval(heartbeat, 500);

  // ---------------- Reliable sending ----------------
  // Drawing and guessing moves carry a sequence number. We send one at a time and
  // resend it until the server's count (mySeq) shows it was accepted.
  const rel = { queue: [], inflight: null, sentAt: 0, ack: 0 };
  function relReset() {
    rel.queue = [];
    rel.inflight = null;
  }
  function relSend() {
    const op = rel.inflight;
    if (!op) return;
    rel.sentAt = Date.now();
    if (op.type === 'draw') send('draw', op.seq, { c: op.c, w: op.w, n: op.n, p: op.p });
    else if (op.type === 'guess') send('guess', op.seq, op.text);
    else send(op.type, op.seq); // undo, clear
  }
  function relPump() {
    if (!rel.inflight && rel.queue.length) {
      rel.inflight = rel.queue.shift();
      rel.inflight.seq = rel.ack + 1;
      relSend();
    }
  }
  function relAck(ack) {
    rel.ack = ack;
    if (rel.inflight && ack >= rel.inflight.seq) rel.inflight = null;
    else if (rel.inflight && Date.now() - rel.sentAt > 250) relSend(); // probably refused as stale: try again
    relPump();
  }
  setInterval(() => {
    if (rel.inflight && Date.now() - rel.sentAt > 800) relSend();
  }, 400);
  function relAdd(op) {
    rel.queue.push(op);
    relPump();
  }
  // Points that arrive while a move is in flight are merged into the next one
  function relAddDraw(c, w, pts, n) {
    const tail = rel.queue[rel.queue.length - 1];
    if (!n && tail && tail.type === 'draw' && tail.c === c && tail.w === w && tail.p.length + pts.length <= MAX_CHUNK) {
      tail.p.push(...pts);
    } else {
      rel.queue.push({ type: 'draw', c, w, n, p: [...pts] });
    }
    relPump();
  }

  // ---------------- Painting ----------------
  function paintStroke(ctx, s) {
    ctx.strokeStyle = COLORS[s.c];
    ctx.fillStyle = COLORS[s.c];
    ctx.lineWidth = WIDTHS[s.w];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const p = s.p;
    if (p.length === 2) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], WIDTHS[s.w] / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.stroke();
  }
  function paintAll(cv, strokes) {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CW, CH);
    strokes.forEach((s) => paintStroke(ctx, s));
  }
  const usedPoints = () => mirror.strokes.reduce((n, s) => n + s.p.length / 2, 0);

  function syncMirror(S) {
    if (mirror.round !== S.round) mirror = { round: S.round, strokes: JSON.parse(JSON.stringify(S.strokes)) };
  }

  // The drawer's canvas: draws on the spot, and sends the strokes in the background
  function attachDrawing(cv) {
    const ctx = cv.getContext('2d');
    let cur = null;
    let lastPt = null;
    const pointOf = (e) => {
      const r = cv.getBoundingClientRect();
      return [
        clamp(Math.round(((e.clientX - r.left) / r.width) * CW), 0, CW),
        clamp(Math.round(((e.clientY - r.top) / r.height) * CH), 0, CH),
      ];
    };
    cv.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (usedPoints() >= MAX_POINTS) return;
      e.preventDefault();
      try {
        cv.setPointerCapture(e.pointerId);
      } catch (err) {
        /* not needed everywhere */
      }
      const [x, y] = pointOf(e);
      cur = { c: tool.color, w: tool.width, p: [x, y] };
      mirror.strokes.push(cur);
      paintStroke(ctx, cur);
      lastPt = [x, y];
      relAddDraw(cur.c, cur.w, [x, y], true);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!cur) return;
      e.preventDefault();
      if (usedPoints() >= MAX_POINTS) return;
      const [x, y] = pointOf(e);
      if (Math.abs(x - lastPt[0]) + Math.abs(y - lastPt[1]) < 3) return;
      ctx.strokeStyle = COLORS[cur.c];
      ctx.lineWidth = WIDTHS[cur.w];
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPt[0], lastPt[1]);
      ctx.lineTo(x, y);
      ctx.stroke();
      cur.p.push(x, y);
      lastPt = [x, y];
      relAddDraw(cur.c, cur.w, [x, y], false);
    });
    const end = () => {
      cur = null;
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  }

  // ---------------- Shared pieces ----------------
  // Builds a screen layout once. Later updates only change the parts inside it,
  // so the canvas and the typing box are never torn down while someone is using them.
  function layout(key, html, onBuild) {
    if (key === layoutKey) return;
    layoutKey = key;
    relReset();
    root.innerHTML = html;
    if (onBuild) onBuild();
  }

  const hintText = (h) => (h ? [...h].join(' ') : '');

  // The scoreboard: everyone here, plus anyone who left with points (dimmed)
  function chips(S, names) {
    const ids = [...S.players].sort((a, b) => (S.scores[b] || 0) - (S.scores[a] || 0));
    if (!ids.length) return '';
    const inRound = S.phase === 'choosing' || S.phase === 'drawing';
    return (
      '<div class="chips">' +
      ids
        .map((id) => {
          const away = !S.present.includes(id);
          const isDrawer = inRound && id === S.drawer;
          const won = S.phase === 'turnEnd' && S.recap && S.recap.winner === id;
          return `<div class="chip${isDrawer ? ' drawer' : ''}${won ? ' done' : ''}${away ? ' away' : ''}">${
            isDrawer ? '✏️ ' : won ? '🏆 ' : ''
          }${nm(names, id)}: <strong>${S.scores[id] || 0}</strong></div>`;
        })
        .join('') +
      '</div>'
    );
  }

  function chatHTML(S, names, n) {
    const items = S.log.slice(-n).map((e) => {
      if (e.type === 'guess') return `<li><strong>${nm(names, e.who)}:</strong> ${esc(e.text)}</li>`;
      if (e.type === 'close') return `<li class="close">${nm(names, e.who)} is close! 🔥</li>`;
      if (e.type === 'got') return `<li class="good">✅ ${nm(names, e.who)} got it! +${e.pts}</li>`;
      return '';
    });
    return `<ul class="chat">${items.join('')}</ul>`;
  }

  // The result of a round: who won, and what everyone earned
  function recapHTML(S, names) {
    const r = S.recap;
    if (!r || r.round !== S.round || S.phase !== 'turnEnd') return '';
    if (r.winner !== null) {
      return `<h3>${nm(names, r.winner)} got it! 🎉</h3><ul class="chat">
        <li class="good">✅ ${nm(names, r.winner)} +${r.pts}</li>
        <li>✏️ ${nm(names, r.drawer)} +${r.drawerPts}</li></ul>`;
    }
    const why = r.reason === 'left' ? `${nm(names, r.drawer)} stepped away.` : 'Nobody got it 😅';
    return `<h3>${why}</h3>`;
  }

  function upNextHTML(S, names, playerID) {
    if (S.upNext === null || S.upNext === undefined) return '';
    if (S.upNext === playerID) return '<p class="turnnote">🎨 You draw next!</p>';
    return `<p class="turnnote">✏️ ${nm(names, S.upNext)} draws next</p>`;
  }

  function passedNotice(S, names) {
    const r = S.recap;
    if (r && r.reason === 'passed' && r.round === S.round - 1) {
      return `<p class="progress">${nm(names, r.drawer)} took too long and was skipped.</p>`;
    }
    return '';
  }

  // ---------------- TV and spectators ----------------
  function publicScreen(S, names) {
    if (S.phase === 'waiting') {
      layout(
        'tv:wait',
        `<h1>Draw</h1><h2>Waiting for players…</h2>
         <p class="waiting" id="wmsg"></p>
         <div id="scores"></div>`
      );
      $('wmsg').innerHTML =
        S.present.length === 0
          ? 'Join on your phone. Anyone can join or leave at any time.'
          : `${nm(names, S.upNext)} will draw first. The game starts as soon as a second player joins.`;
      $('scores').innerHTML = chips(S, names);
      return;
    }
    layout(
      `tv:${S.phase}:${S.round}`,
      `<h1>Draw</h1>
       <div id="headline"></div>
       <div class="bigclock" id="clock"></div>
       <div class="hint" id="hint"></div>
       <div class="stage">
         <canvas id="cv" class="tv" width="${CW}" height="${CH}"></canvas>
         <div id="side"></div>
       </div>
       <div id="scores"></div>`
    );
    const who = nm(names, S.drawer);
    if (S.phase === 'choosing') {
      $('headline').innerHTML = `<h2>🎨 ${who} is choosing a word…</h2>` + (S.drawerAway ? '<p class="progress">They seem to be away.</p>' : '');
    } else if (S.phase === 'drawing') {
      $('headline').innerHTML = `<h2>✏️ ${who} is drawing. Guess on your phone!</h2><p class="progress">First to guess it wins, and draws next.</p>`;
    } else {
      $('headline').innerHTML = `<h2>The word was <span class="word">${esc(S.word)}</span></h2>`;
    }
    $('hint').textContent = S.phase === 'drawing' ? hintText(S.hint) : '';
    paintAll($('cv'), S.strokes);
    $('side').innerHTML =
      S.phase === 'turnEnd'
        ? `${recapHTML(S, names)}${upNextHTML(S, names, null)}`
        : passedNotice(S, names) + chatHTML(S, names, 12);
    $('scores').innerHTML = chips(S, names);
  }

  // ---------------- Phone: waiting for company ----------------
  function waitScreen(S, names, playerID) {
    layout('p:wait', `<h2>Draw</h2><p class="waiting" id="wmsg"></p><div id="scores"></div>`);
    $('wmsg').innerHTML =
      S.upNext === playerID
        ? "You're in! You'll draw first. The game starts as soon as another player joins."
        : 'Waiting for another player to join…';
    $('scores').innerHTML = chips(S, names);
  }

  // ---------------- Phone: the end of a round (everyone) ----------------
  function endScreen(S, names, playerID) {
    layout(
      `p:end:${S.round}`,
      `<h2>The word was <span class="word" id="w"></span></h2>
       <canvas id="cv" class="view" width="${CW}" height="${CH}"></canvas>
       <div id="recap"></div>
       <div id="upnext"></div>
       <div class="bigclock" id="clock"></div>
       <div id="scores"></div>`
    );
    $('w').textContent = S.word;
    paintAll($('cv'), S.strokes);
    $('recap').innerHTML = recapHTML(S, names);
    $('upnext').innerHTML = upNextHTML(S, names, playerID);
    $('scores').innerHTML = chips(S, names);
  }

  // ---------------- Phone: the drawer ----------------
  function drawerChoose(S) {
    layout(
      `p:choose:${S.round}`,
      `<h2>Your turn to draw! 🎨</h2>
       <div class="bigclock" id="clock"></div>
       <p>Pick a word:</p>
       <div class="choices">${(S.options || [])
         .map((o, i) => `<button class="big" data-opt="${i}">${esc(o)}</button>`)
         .join('')}</div>`,
      () => {
        const key = layoutKey;
        document.querySelectorAll('[data-opt]').forEach((b) => {
          b.onclick = () => {
            document.querySelectorAll('[data-opt]').forEach((x) => (x.disabled = true));
            send('choose', Number(b.dataset.opt));
            setTimeout(() => {
              if (layoutKey === key) document.querySelectorAll('[data-opt]').forEach((x) => (x.disabled = false));
            }, 2500);
          };
        });
      }
    );
  }

  function drawerDraw(S) {
    layout(
      `p:draw:${S.round}`,
      `<div class="top slim"><span class="clock" id="clock"></span><span class="word">${esc(S.word || '')}</span></div>
       <canvas id="cv" class="ph" width="${CW}" height="${CH}"></canvas>
       <div class="tools">${COLORS.map(
         (c, i) =>
           `<button class="swatch${i === tool.color ? ' sel' : ''}" data-color="${i}" style="background:${c}" aria-label="colour ${i + 1}">${i === 1 ? '🧽' : ''}</button>`
       ).join('')}</div>
       <div class="tools">${WIDTHS.map(
         (w, i) =>
           `<button class="size${i === tool.width ? ' sel' : ''}" data-size="${i}"><span style="width:${6 + i * 7}px;height:${6 + i * 7}px"></span></button>`
       ).join('')}
         <button id="undo" class="secondary">↩ Undo</button>
         <button id="clear" class="secondary">🗑 Clear</button></div>
       <div class="inkbar"><div id="inkfill"></div></div>
       <p class="progress" id="info"></p>`,
      () => {
        syncMirror(S);
        const cv = $('cv');
        paintAll(cv, mirror.strokes);
        attachDrawing(cv);
        document.querySelectorAll('[data-color]').forEach((b) => {
          b.onclick = () => {
            tool.color = Number(b.dataset.color);
            document.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('sel', x === b));
          };
        });
        document.querySelectorAll('[data-size]').forEach((b) => {
          b.onclick = () => {
            tool.width = Number(b.dataset.size);
            document.querySelectorAll('[data-size]').forEach((x) => x.classList.toggle('sel', x === b));
          };
        });
        $('undo').onclick = () => {
          if (!mirror.strokes.length) return;
          mirror.strokes.pop();
          paintAll(cv, mirror.strokes);
          relAdd({ type: 'undo' });
        };
        $('clear').onclick = () => {
          if (!mirror.strokes.length) return;
          mirror.strokes = [];
          paintAll(cv, mirror.strokes);
          relAdd({ type: 'clear' });
        };
      }
    );
    const guessers = Math.max(0, S.present.length - 1);
    $('inkfill').style.width = `${Math.round(S.ink * 100)}%`;
    $('info').textContent =
      (S.ink >= 0.98 ? 'Out of ink! Undo or clear to keep drawing. ' : '') +
      `${guessers} ${guessers === 1 ? 'player is' : 'players are'} guessing`;
  }

  // ---------------- Phone: a guesser ----------------
  function guesserScreen(S, names) {
    const who = nm(names, S.drawer);
    if (S.phase === 'choosing') {
      layout(
        `p:wait:${S.round}`,
        `<h2 id="h"></h2><div class="bigclock" id="clock"></div><div id="scores"></div>`
      );
      $('h').innerHTML = `🎨 ${who} is choosing a word…` + (S.drawerAway ? '<br><small>(they seem to be away)</small>' : '');
      $('scores').innerHTML = passedNotice(S, names) + chips(S, names);
      return;
    }
    layout(
      `p:guess:${S.round}`,
      `<div class="top slim"><span class="clock" id="clock"></span><span id="who"></span></div>
       <div class="hint" id="hint"></div>
       <canvas id="cv" class="view" width="${CW}" height="${CH}"></canvas>
       <p class="progress">First to guess it wins, and draws next! ✏️</p>
       <div id="guessbox"><input id="gin" maxlength="40" autocomplete="off" autocapitalize="none" placeholder="Type your guess" />
         <button id="gsend">Guess</button></div>
       <div id="chat"></div>
       <div id="scores"></div>`,
      () => {
        const gin = $('gin');
        const submit = () => {
          const t = gin.value.trim();
          if (!t) return;
          relAdd({ type: 'guess', text: t.slice(0, 40) });
          gin.value = '';
          gin.focus();
        };
        $('gsend').onclick = submit;
        gin.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        });
      }
    );
    $('who').innerHTML = `✏️ ${who}`;
    $('hint').textContent = hintText(S.hint);
    paintAll($('cv'), S.strokes);
    $('chat').innerHTML = chatHTML(S, names, 6);
    $('scores').innerHTML = chips(S, names);
  }

  // ---------------- Render ----------------
  function render(msg) {
    last = msg;
    const { view, playerID, names, state } = msg;
    const S = state.G;
    track(S);
    const mine = view === 'player' && S.role !== 'spectator';
    if (view !== 'player') hereAt = 0; // say "I'm here" again as soon as this phone goes back to its own screen
    if (mine) relAck(S.mySeq);
    heartbeat(); // a phone that has just opened says so at once
    if (!mine) publicScreen(S, names);
    else if (S.phase === 'waiting') waitScreen(S, names, playerID);
    else if (S.phase === 'turnEnd') endScreen(S, names, playerID);
    else if (S.role === 'drawer') (S.phase === 'choosing' ? drawerChoose : drawerDraw)(S, names);
    else guesserScreen(S, names);
    tick();
  }

  window.addEventListener('message', (e) => {
    if (e.source === parent && e.data && e.data.type === 'state') render(e.data);
  });
  parent.postMessage({ type: 'ready' }, '*');
})();
