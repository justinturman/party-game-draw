import { game, config, WORDS } from './server.js';

let failures = 0;
const check = (label, ok) => {
  console.log(ok ? 'PASS' : 'FAIL', label);
  if (!ok) failures++;
};
const REJECT = 'INVALID_MOVE';

const random = { Shuffle: (a) => [...a].sort(() => Math.random() - 0.5) };

function newGame(n = 3) {
  const ctx = { numPlayers: n, currentPlayer: '0' };
  const G = game.setup({ ctx, random });
  const g = {
    G,
    play: (name, id, ...args) => game.moves[name].move({ G, ctx, playerID: id, random }, ...args),
    view: (id) => game.playerView({ G, ctx, playerID: id }),
    over: () => game.endIf({ G, ctx }),
  };
  // Moves that carry a sequence number get the next one automatically
  const nextSeq = (id) => (G.seqs[id] || 0) + 1;
  g.draw = (id, chunk) => g.play('draw', id, nextSeq(id), chunk);
  g.undo = (id) => g.play('undo', id, nextSeq(id));
  g.clear = (id) => g.play('clear', id, nextSeq(id));
  g.guess = (id, text) => g.play('guess', id, nextSeq(id), text);
  return g;
}
const stroke = (c = 2, w = 1, p = [10, 10, 40, 40], n = true) => ({ c, w, p, n });
const startDrawing = (g, word = 'Orange Tree') => {
  g.play('choose', g.G.drawer, 0);
  g.G.word = word; // a known word, so the checks below are predictable
};

// ---- Setup and choosing ----
{
  check('the word list has no repeats', new Set(WORDS).size === WORDS.length && WORDS.length >= 80);
  const g3 = newGame(3);
  check('4 players get 2 rounds, 6 players get 1', newGame(4).G.totalTurns === 8 && newGame(6).G.totalTurns === 6);
  check('player 0 draws first and is choosing', g3.G.phase === 'choosing' && g3.G.drawer === '0');
  check('three different words to choose from', g3.G.options.length === 3 && new Set(g3.G.options).size === 3);
  check('only the drawer sees the options',
    g3.view('0').options.length === 3 && ['1', '2', null].every((id) => g3.view(id).options === null));
  check('nobody sees a word or a hint yet',
    ['0', '1', '2', null].every((id) => g3.view(id).word === null && g3.view(id).hint === null));
  check('the deck is never sent', ['0', '1', '2', null].every((id) => !('deck' in g3.view(id))));
  const t = g3.view('1').timer;
  check('the choosing timer is sent as time left, not a deadline',
    t.kind === 'choose' && t.left > 0 && !('chooseBy' in g3.view('1')));
}

// ---- Choosing a word ----
{
  const g = newGame(3);
  check('only the drawer can choose', g.play('choose', '1', 0) === REJECT);
  check('a bad choice is rejected', g.play('choose', '0', 5) === REJECT && g.play('choose', '0', '1') === REJECT);
  const picked = g.G.options[1];
  g.play('choose', '0', 1);
  check('the drawer starts the turn with the chosen word', g.G.phase === 'drawing' && g.G.word === picked);
  check('choosing twice is rejected', g.play('choose', '0', 0) === REJECT);
  g.G.word = 'Orange Tree';
  check('the drawer sees the word', g.view('0').word === 'Orange Tree' && g.view('0').hint === null);
  const others = ['1', '2', null].map((id) => JSON.stringify(g.view(id))).join('').toLowerCase();
  check('nobody else sees the word in any form', !others.includes('orange') && !others.includes('tree'));
  check('guessers get only the shape of the word', g.view('1').hint === '______ ____');
  const t = g.view('1').timer;
  check('the drawing timer counts down', t.kind === 'draw' && t.left > 0 && t.left <= config.drawMs);
}

// ---- Drawing ----
{
  const g = newGame(3);
  startDrawing(g);
  check('a guesser cannot draw', g.play('draw', '1', 1, stroke()) === REJECT);
  check('a spectator cannot draw', g.play('draw', null, 1, stroke()) === REJECT);
  check('a wrong sequence number is rejected', g.play('draw', '0', 5, stroke()) === REJECT);
  g.draw('0', stroke());
  check('a stroke is added', g.G.strokes.length === 1 && g.G.seqs['0'] === 1);
  check('a repeated move is rejected', g.play('draw', '0', 1, stroke()) === REJECT && g.G.strokes.length === 1);
  g.draw('0', stroke(2, 1, [60, 60, 90, 90], false));
  check('a continuing piece joins the same stroke', g.G.strokes.length === 1 && g.G.strokes[0].p.length === 8);
  g.draw('0', stroke(3, 1, [5, 5, 9, 9], false));
  check('a new colour starts a new stroke', g.G.strokes.length === 2);
  g.draw('0', stroke(99));
  check('a bad colour is ignored but still counted', g.G.strokes.length === 2 && g.G.seqs['0'] === 4);
  g.draw('0', stroke(2, 1, Array(82).fill(5)));
  check('an oversized piece is ignored', g.G.strokes.length === 2);
  g.draw('0', stroke(4, 0, [-20, 9999], true));
  const p = g.G.strokes[g.G.strokes.length - 1].p;
  check('coordinates are kept on the canvas', p[0] === 0 && p[1] === 480);
  check('everyone sees the drawing', ['1', '2', null].every((id) => g.view(id).strokes.length === 3));
  g.undo('0');
  check('undo removes the last stroke', g.G.strokes.length === 2);
  check('a guesser cannot undo', g.play('undo', '1', 1) === REJECT);
  g.clear('0');
  check('clear empties the canvas', g.G.strokes.length === 0 && g.G.points === 0);
}

// ---- Limits ----
{
  const g = newGame(3);
  startDrawing(g);
  for (let i = 0; i < 300; i++) g.draw('0', stroke(2, 1, [i, 5], true));
  check('there is a maximum number of strokes', g.G.strokes.length === 250);
  g.clear('0');
  for (let i = 0; i < 80; i++) {
    g.draw('0', stroke(2, 1, Array.from({ length: 80 }, (_, k) => (k * 7) % 400), i === 0));
  }
  check('there is a maximum amount of ink', g.G.points <= 2500 && g.G.points >= 2400);
  check('the ink meter is sent', g.view('1').ink > 0.9);
}

// ---- Guessing ----
{
  const g = newGame(3);
  startDrawing(g);
  g.G.endsAt = Date.now() + 15000; // 15 seconds left, so the points are predictable
  check('the drawer cannot guess', g.play('guess', '0', 1, 'orange tree') === REJECT);
  check('a spectator cannot guess', g.play('guess', null, 1, 'orange tree') === REJECT);
  check('a wrong sequence number is rejected', g.play('guess', '1', 9, 'x') === REJECT);
  g.guess('1', 'banana');
  const wrong = g.view(null).log.slice(-1)[0];
  check('a wrong guess is shown to everyone', wrong.type === 'guess' && wrong.text === 'banana' && wrong.who === '1');
  g.guess('1', 'orangetre');
  const near = g.view(null).log.slice(-1)[0];
  check('a near miss is flagged but its text stays hidden', near.type === 'close' && !('text' in near));
  g.guess('1', '   ');
  g.guess('1', 'x'.repeat(41));
  check('empty and over-long guesses are ignored', g.G.log.length === 2);
  g.guess('1', 'ORANGE  tree!');
  check('capitals, spaces and punctuation do not matter', g.G.guessed['1'] !== undefined);
  const pts = g.G.guessed['1'];
  check('the guesser scores by time left (about 75 here)', pts >= 70 && pts <= 80);
  check('the drawer earns a bonus', g.G.scores['0'] === 30 && g.G.scores['1'] === pts);
  const entry = g.view(null).log.slice(-1)[0];
  check('a correct guess is announced without the word', entry.type === 'got' && !('text' in entry));
  check('nobody sees the word in the log', !JSON.stringify(g.view('2')).toLowerCase().includes('orange'));
  g.guess('1', 'orange tree');
  check('guessing again scores nothing more', g.G.scores['1'] === pts);
  check('the turn goes on while someone has not guessed', g.G.phase === 'drawing');
  g.guess('2', 'orangetree');
  check('the turn ends when everyone has guessed', g.G.phase === 'turnEnd' && g.G.recap.got.length === 2);
  check('the word is revealed to everyone', ['0', '1', '2', null].every((id) => g.view(id).word === 'Orange Tree'));
  check('guessing after the turn is rejected', g.play('guess', '2', 2, 'x') === REJECT);
}

// ---- The clock ----
{
  const g = newGame(3);
  startDrawing(g);
  g.draw('0', stroke());
  check('the turn cannot end before time is up', g.play('endTurn', '2') === REJECT);
  g.G.endsAt = Date.now() - 1; // time runs out
  check('drawing after time is up is rejected', g.play('draw', '0', 2, stroke()) === REJECT);
  check('guessing after time is up is rejected', g.play('guess', '1', 1, 'x') === REJECT);
  check('a spectator cannot end the turn', g.play('endTurn', null) === REJECT);
  g.play('endTurn', '2');
  check('any player can end the turn after time is up',
    g.G.phase === 'turnEnd' && g.G.recap.word === 'Orange Tree' && g.G.recap.got.length === 0);
  check('the finished drawing is still shown', g.view(null).strokes.length === 1);
  check('moving on with the wrong turn number is rejected', g.play('nextTurn', '1', 9) === REJECT);
  g.play('nextTurn', '2', 0);
  check('the next player draws next, on a fresh canvas',
    g.G.turn === 1 && g.G.drawer === '1' && g.G.phase === 'choosing' && g.G.strokes.length === 0 && g.G.log.length === 0);
  check('a repeated "next turn" is ignored', g.play('nextTurn', '2', 0) === REJECT);
}

// ---- Passing a stalled turn ----
{
  const g = newGame(3);
  check('a turn cannot be passed too early', g.play('passTurn', '1') === REJECT);
  g.G.chooseBy = Date.now() - 1;
  check('the drawer cannot pass their own turn', g.play('passTurn', '0') === REJECT);
  check('a spectator cannot pass a turn', g.play('passTurn', null) === REJECT);
  g.play('passTurn', '2');
  check('another player can pass a stalled turn',
    g.G.turn === 1 && g.G.drawer === '1' && g.G.recap.passed === true && g.G.recap.word === null);
  check('the new turn has a fresh timer', g.view('2').timer.left > 0);
}

// ---- A whole game ----
{
  const g = newGame(3);
  for (let t = 0; t < 6; t++) {
    const drawer = g.G.drawer;
    g.play('choose', drawer, 0);
    g.draw(drawer, stroke());
    for (const id of g.G.players.filter((p) => p !== drawer)) g.guess(id, g.G.word);
    g.play('nextTurn', '0', g.G.turn);
  }
  check('the game ends after everyone has drawn twice', g.G.phase === 'gameover');
  check('everyone scored', g.G.players.every((id) => g.G.scores[id] > 0));
  const best = Math.max(...Object.values(g.G.scores));
  const result = g.over();
  check('the winners have the top score', result.winners.length >= 1 && result.winners.every((id) => g.G.scores[id] === best));
  check('nothing secret is shown at the end',
    ['0', '1', null].every((id) => g.view(id).word === null && g.view(id).options === null));
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);