import { game } from './server.js';

function play(moves) {
  const G = game.setup();
  const results = moves.map(([id, cell]) =>
    game.moves.clickCell({ G, ctx: { currentPlayer: id }, playerID: id }, cell)
  );
  const last = moves[moves.length - 1][0];
  return { G, results, over: game.endIf({ G, ctx: { currentPlayer: last } }) };
}

// Test 1: player 0 wins with the top row
const win = play([['0', 0], ['1', 3], ['0', 1], ['1', 4], ['0', 2]]);
console.log('Win (should be { winner: "0" }):', win.over);

// Test 2: a taken square is rejected
const clash = play([['0', 4], ['1', 4]]);
console.log('Taken square rejected (should be INVALID_MOVE):', clash.results[1]);

// Test 3: a full board with no line is a draw
const draw = play([
  ['0', 0], ['1', 1], ['0', 2], ['1', 4], ['0', 3],
  ['1', 5], ['0', 7], ['1', 6], ['0', 8],
]);
console.log('Draw (should be { draw: true }):', draw.over);