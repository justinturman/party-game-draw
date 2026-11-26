import { game, config, WORDS } from './server.js';

let failures = 0;
const check = (label, ok) => {
  console.log(ok ? 'PASS' : 'FAIL', label);
  if (!ok) failures++;
};
const REJECT = 'INVALID_MOVE';
const random = { Shuffle: (a) => [...a].sort(() => Math.random() - 0.5) };

// A room with 16 seats, nobody in it yet. People arrive with g.join('3', '5', ...)
function newGame() {
  const ctx = { numPlayers: 16, currentPlayer: '0' };
  const G = game.setup({ ctx, random });
  const g = {
    G,
    play: (name, id, ...args) => game.moves[name].move({ G, ctx, playerID: id, random }, ...args),
    view: (id) => game.playerView({ G, ctx, playerID: id }),
    join: (...ids) => ids.forEach((id) => g.play('here', id)),
    // pretend a seat has not been heard from for a long time
    leave: (id) => { G.seen[id] = Date.now() - config.presenceMs - 1000; },
  };
  const nextSeq = (id) => (G.seqs[id] || 0) + 1;
  g.draw = (id, chunk) => g.play('draw', id, nextSeq(id), chunk);
  g.undo = (id) => g.play('undo', id, nextSeq(id));
  g.clear = (id) => g.play('clear', id, nextSeq(id));
  g.guess = (id, text) => g.play('guess', id, nextSeq(id), text);
  // the recap has been on screen long enough
  g.skipRecap = () => { G.recap.endAt = Date.now() - config.recapMs - 1; };
  return g;
}
const stroke = (c = 2, w = 1, p = [10, 10, 40, 40], n = true) => ({ c, w, p, n });
// Start a round with a known word, drawn by the first player to join
function startDrawing(ids = ['0', '1', '2'], word = 'Orange Tree') {
  const g = newGame();
  g.join(...ids);
  g.play('choose', g.G.drawer, 0);
  g.G.word = word;
  return g;
}

// ---- The word list ----
check('the word list has no repeats', new Set(WORDS).size === WORDS.length && WORDS.length >= 400);

// ---- Joining ----
{
  const g = newGame();
  check('a room starts empty and waiting', g.G.phase === 'waiting' && g.view(null).players.length === 0);
  check('a spectator cannot report in', g.play('here', null) === REJECT);
  check('a seat that does not exist cannot report in', g.play('here', '16') === REJECT && g.play('here', 'x') === REJECT);
  g.join('5');
  check('one player alone has to wait for company', g.G.phase === 'waiting' && g.view('5').present.join() === '5');
  check('the waiting room says who will draw first', g.view('5').upNext === '5' && g.view(null).upNext === '5');
  g.join('5');
  check('reporting in again changes nothing', g.G.phase === 'waiting' && g.G.order.length === 1);
  g.join('2');
  check('the game starts when a second player arrives', g.G.phase === 'choosing' && g.G.round === 1);
  check('the first player to join draws first, whatever their seat number', g.G.drawer === '5');
  check('the second player is a guesser', g.view('2').role === 'guesser' && g.view('5').role === 'drawer');
  check('the TV is a spectator', g.view(null).role === 'spectator');
}
{
  const g = newGame();
  g.join('3');
  g.leave('3');
  g.join('8', '1');
  check('if the first player left before anyone came, the first still here draws',
    g.G.phase === 'choosing' && g.G.drawer === '8');
}

// ---- Secrets ----
{
  const g = newGame();
  g.join('0', '1', '2');
  check('three different words to choose from', g.G.options.length === 3 && new Set(g.G.options).size === 3);
  check('only the drawer sees the options',
    g.view('0').options.length === 3 && ['1', '2', null].every((id) => g.view(id).options === null));
  check('nobody sees a word or a hint yet', ['0', '1', '2', null].every((id) => g.view(id).word === null && g.view(id).hint === null));
  check('the deck is never sent', ['0', '1', '2', null].every((id) => !('deck' in g.view(id))));
  const t = g.view('1').timer;
  check('the choosing timer is sent as time left, not a deadline', t.kind === 'choose' && t.left > 0 && !('chooseBy' in g.view('1')));
}

// ---- Choosing a word ----
{
  const g = newGame();
  g.join('0', '1', '2');
  check('only the drawer can choose', g.play('choose', '1', 0) === REJECT && g.play('choose', null, 0) === REJECT);
  check('a bad choice is rejected', g.play('choose', '0', 5) === REJECT && g.play('choose', '0', '1') === REJECT);
  const picked = g.G.options[1];
  g.play('choose', '0', 1);
  check('the drawer starts the round with the chosen word', g.G.phase === 'drawing' && g.G.word === picked);
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
  const g = startDrawing();
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
{
  const g = startDrawing();
  for (let i = 0; i < 300; i++) g.draw('0', stroke(2, 1, [i, 5], true));
  check('there is a maximum number of strokes', g.G.strokes.length === 250);
  g.clear('0');
  for (let i = 0; i < 80; i++) g.draw('0', stroke(2, 1, Array.from({ length: 80 }, (_, k) => (k * 7) % 400), i === 0));
  check('there is a maximum amount of ink', g.G.points <= 2500 && g.G.points >= 2400);
  check('the ink meter is sent', g.view('1').ink > 0.9);
}

// ---- Guessing: the first right answer wins the round ----
{
  const g = startDrawing();
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
  check('the round goes on while nobody has it', g.G.phase === 'drawing');
  g.guess('2', 'ORANGE  tree!');
  check('capitals, spaces and punctuation do not matter', g.G.phase === 'turnEnd');
  check('the first right answer ends the round at once', g.G.recap.winner === '2' && g.G.recap.reason === 'guessed');
  check('the guesser scores by time left (about 75 here)', g.G.scores['2'] >= 70 && g.G.scores['2'] <= 80);
  check('the drawer earns half as much', g.G.scores['0'] === Math.round(g.G.scores['2'] / 2));
  check('the log announces it without the word', g.view(null).log.slice(-1)[0].type === 'got' && !('text' in g.view(null).log.slice(-1)[0]));
  check('the word is revealed to everyone', ['0', '1', '2', null].every((id) => g.view(id).word === 'Orange Tree'));
  check('nobody can guess after the round', g.play('guess', '1', 5, 'orange tree') === REJECT);
  check('the winner is told they draw next', g.view('1').upNext === '2' && g.view(null).upNext === '2');
}

// ---- The winner draws next ----
{
  const g = startDrawing(['0', '1', '2', '3']);
  g.guess('3', 'orange tree');
  check('the next round cannot start straight away', g.play('nextTurn', '1', g.G.round) === REJECT);
  g.skipRecap();
  check('the wrong round number is rejected', g.play('nextTurn', '1', 9) === REJECT);
  check('a spectator cannot move on', g.play('nextTurn', null, g.G.round) === REJECT);
  g.play('nextTurn', '1', 1);
  check('the guesser who won now draws', g.G.drawer === '3' && g.G.phase === 'choosing' && g.G.round === 2);
  check('on a fresh canvas', g.G.strokes.length === 0 && g.G.log.length === 0 && g.G.word === null);
  check('and they see the word choices', g.view('3').options.length === 3 && g.view('0').options === null);
  check('a repeated "next" is ignored', g.play('nextTurn', '2', 1) === REJECT);
  check('scores carry on', g.view(null).scores['3'] > 0 && g.view(null).scores['0'] > 0);
}
{
  const g = startDrawing(['0', '1', '2']);
  g.guess('2', 'orange tree');
  g.leave('2'); // the winner walks off before the next round
  g.skipRecap();
  g.play('nextTurn', '1', 1);
  check('if the winner has left, the next player in line draws', g.G.drawer === '0' || g.G.drawer === '1');
}

// ---- Nobody gets it ----
{
  const g = startDrawing(['0', '1', '2']);
  g.draw('0', stroke());
  check('the round cannot end before time is up', g.play('endTurn', '2') === REJECT);
  g.G.endsAt = Date.now() - 1;
  check('drawing after time is up is rejected', g.play('draw', '0', 2, stroke()) === REJECT);
  check('guessing after time is up is rejected', g.play('guess', '1', 1, 'orange tree') === REJECT);
  check('a spectator cannot end the round', g.play('endTurn', null) === REJECT);
  g.play('endTurn', '2');
  check('any player can end the round after time is up', g.G.phase === 'turnEnd' && g.G.recap.winner === null && g.G.recap.reason === 'time');
  check('the word is still revealed', g.view('1').word === 'Orange Tree');
  check('nobody scored', g.G.scores['0'] === 0 && g.G.scores['1'] === 0);
  check('the finished drawing is still shown', g.view(null).strokes.length === 1);
  check('the turn moves round to the next player', g.view(null).upNext === '1');
  g.skipRecap();
  g.play('nextTurn', '2', 1);
  check('and they draw', g.G.drawer === '1');
  g.G.chooseBy = Date.now() - 1;
  g.play('passTurn', '0');
  check('a turn nobody wins goes round the whole room', g.G.drawer === '2');
}

// ---- A drawer who is slow, or gone ----
{
  const g = newGame();
  g.join('0', '1', '2');
  check('a turn cannot be passed too early', g.play('passTurn', '1') === REJECT);
  g.G.chooseBy = Date.now() - 1;
  check('the drawer cannot pass their own turn', g.play('passTurn', '0') === REJECT);
  check('a spectator cannot pass a turn', g.play('passTurn', null) === REJECT);
  g.play('passTurn', '2');
  check('another player can pass a stalled turn', g.G.round === 2 && g.G.drawer === '1' && g.G.phase === 'choosing');
  check('everyone is told who was skipped', g.view('2').recap.reason === 'passed' && g.view('2').recap.drawer === '0');
  check('the new turn has a fresh timer', g.view('2').timer.left > 0);
}
{
  const g = newGame();
  g.join('0', '1', '2');
  g.leave('0');
  check('the TV notices the drawer has gone', g.view(null).drawerAway === true && !g.view(null).present.includes('0'));
  g.play('passTurn', '1');
  check('a drawer who has left can be skipped straight away', g.G.drawer === '1' || g.G.drawer === '2');
}
{
  const g = startDrawing(['0', '1', '2']);
  g.leave('0');
  check('a drawer who is still here cannot be cut short', startDrawing().play('endTurn', '1') === REJECT);
  g.play('endTurn', '1');
  check('if the drawer leaves mid-round, anyone can end it', g.G.phase === 'turnEnd' && g.G.recap.reason === 'left');
}

// ---- Coming and going ----
{
  const g = startDrawing(['0', '1']);
  g.draw('0', stroke());
  g.join('9');
  check('someone can join in the middle of a round', g.view('9').role === 'guesser' && g.view(null).present.includes('9'));
  check('and see the drawing so far', g.view('9').strokes.length === 1);
  g.guess('9', 'orange tree');
  check('and win it straight away', g.G.recap.winner === '9' && g.G.scores['9'] > 0);
}
{
  const g = startDrawing(['0', '1', '2']);
  g.guess('1', 'orange tree');
  g.leave('1');
  g.leave('2');
  const v = g.view(null);
  check('a player who left keeps their score on the board', v.players.includes('1') && v.scores['1'] > 0);
  check('a player who left with no points is dropped', !v.players.includes('2'));
  check('the board says who is still here', v.present.join() === '0');
}
{
  const g = startDrawing(['0', '1']);
  g.guess('1', 'orange tree');
  g.leave('0');
  g.skipRecap();
  g.play('nextTurn', '1', 1);
  check('the game waits when only one player is left', g.G.phase === 'waiting' && g.view('1').upNext === '1');
  g.join('4');
  check('and carries on when someone arrives, with the winner drawing', g.G.phase === 'choosing' && g.G.drawer === '1');
}
{
  const g = startDrawing(['0', '1']);
  g.G.endsAt = Date.now() - 1;
  g.leave('0');
  g.play('endTurn', '1');
  g.skipRecap();
  g.play('nextTurn', '1', 1);
  check('if everyone else left, the room waits instead of drawing alone', g.G.phase === 'waiting');
}

// ---- It never ends ----
{
  const g = newGame();
  g.join('0', '1', '2', '3', '4');
  let drawers = new Set();
  let ok = true;
  for (let r = 0; r < 60; r++) {
    drawers.add(g.G.drawer);
    g.play('choose', g.G.drawer, 0);
    const others = g.G.order.filter((id) => id !== g.G.drawer);
    const guesser = others[r % others.length]; // a different winner each time
    if (r % 4 === 3) g.G.endsAt = Date.now() - 1, g.play('endTurn', '1');
    else g.guess(guesser, g.G.word);
    ok = ok && g.G.phase === 'turnEnd';
    g.skipRecap();
    g.play('nextTurn', '0', g.G.round);
    ok = ok && g.G.phase === 'choosing';
  }
  check('sixty rounds in a row, and the game is still going', ok && g.G.round === 61);
  check('everyone gets to draw', drawers.size >= 4);
  check('the game has no end', game.endIf === undefined);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
