(function () {
  const SYMBOL = { 0: 'X', 1: 'O' };
  const root = document.getElementById('root');

  // Makes untrusted text (like nicknames) safe to put into HTML
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  function send(name, ...args) {
    parent.postMessage({ type: 'move', name, args }, '*');
  }

  function render(msg) {
    const { view, playerID, names, state } = msg;
    const { G, ctx } = state;
    const name = (id) => esc(names[id] || `Player ${Number(id) + 1}`);
    const myTurn = view === 'player' && ctx.currentPlayer === playerID && !ctx.gameover;

    let status;
    if (ctx.gameover) {
      status = ctx.gameover.draw ? "It's a draw!" : `${name(ctx.gameover.winner)} wins! 🎉`;
    } else {
      status = `${name(ctx.currentPlayer)}'s turn (${SYMBOL[ctx.currentPlayer]})`;
    }

    const cells = G.cells
      .map((c, i) => {
        const enabled = myTurn && c === null;
        return `<button class="cell" data-cell="${i}" ${enabled ? '' : 'disabled'}>${
          c === null ? '' : SYMBOL[c]
        }</button>`;
      })
      .join('');

    root.innerHTML =
      (view === 'player' ? `<h2>You are ${SYMBOL[playerID]}</h2>` : '') +
      `<h2>${status}</h2><div class="board">${cells}</div>`;

    root.querySelectorAll('[data-cell]').forEach((b) => {
      b.onclick = () => send('clickCell', Number(b.dataset.cell));
    });
  }

  window.addEventListener('message', (e) => {
    if (e.source === parent && e.data && e.data.type === 'state') render(e.data);
  });
  parent.postMessage({ type: 'ready' }, '*');
})();