const INVALID_MOVE = 'INVALID_MOVE';

// Checks all 8 winning lines (3 rows, 3 columns, 2 diagonals)
function isVictory(cells) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  return lines.some(
    ([a, b, c]) =>
      cells[a] !== null && cells[a] === cells[b] && cells[a] === cells[c]
  );
}

function isDraw(cells) {
  return cells.every((cell) => cell !== null);
}

export const game = {
  name: 'tic-tac-toe',
  minPlayers: 2,
  maxPlayers: 2,

  // The starting state: 9 empty squares
  setup: () => ({ cells: Array(9).fill(null) }),

  // Each player gets exactly one move, then it's the other player's turn
  turn: { minMoves: 1, maxMoves: 1 },

  moves: {
    clickCell: ({ G, playerID }, id) => {
      if (G.cells[id] !== null) return INVALID_MOVE; // square already taken
      G.cells[id] = playerID; // mark the square with '0' or '1'
    },
  },

  // Checked after every move: is the game over?
  endIf: ({ G, ctx }) => {
    if (isVictory(G.cells)) return { winner: ctx.currentPlayer };
    if (isDraw(G.cells)) return { draw: true };
  },
};