const INVALID_MOVE = 'INVALID_MOVE';

// Timings. Exported so the tests can shorten them.
export const config = { drawMs: 60000, chooseMs: 25000 };

// The canvas and its limits. view.js has copies of these numbers.
export const CANVAS = { w: 640, h: 480 };
const PALETTE_SIZE = 10;
const BRUSH_SIZES = 3;
const MAX_STROKES = 250;
const MAX_POINTS = 2500;
const MAX_CHUNK = 80; // numbers (x,y pairs) in one drawing move
const MAX_GUESS_LEN = 40;
const MAX_GUESSES = 40; // per player per turn
const DRAWER_BONUS = 30;

// Original word list
export const WORDS = [
  'apple', 'banana', 'pizza', 'hamburger', 'ice cream', 'cupcake', 'popcorn', 'pancake',
  'spaghetti', 'watermelon', 'pineapple', 'carrot', 'sandwich', 'birthday cake', 'bicycle',
  'airplane', 'helicopter', 'submarine', 'sailboat', 'hot air balloon', 'school bus',
  'fire truck', 'train', 'rocket', 'umbrella', 'lighthouse', 'volcano', 'snowman',
  'pirate ship', 'castle', 'rainbow', 'tornado', 'fireworks', 'campfire', 'tent',
  'tree house', 'windmill', 'bridge', 'guitar', 'piano', 'drum', 'trumpet', 'elephant',
  'giraffe', 'penguin', 'octopus', 'butterfly', 'spider', 'snail', 'kangaroo', 'crocodile',
  'dolphin', 'owl', 'turtle', 'dragon', 'unicorn', 'mermaid', 'dinosaur', 'robot',
  'astronaut', 'ghost', 'vampire', 'wizard', 'princess', 'knight', 'clown', 'dentist',
  'chef', 'firefighter', 'scarecrow', 'backpack', 'skateboard', 'surfboard', 'kite',
  'trampoline', 'swing', 'balloon', 'present', 'key', 'scissors', 'hammer', 'ladder',
  'toothbrush', 'mirror', 'sunglasses', 'crown', 'sword', 'shield', 'treasure map',
  'compass', 'telescope', 'light bulb', 'clock', 'bathtub', 'wheelbarrow', 'snowboard',
  'basketball', 'bowling', 'fishing rod', 'hourglass', 'anchor', 'lantern', 'headphones',
  'camera', 'suitcase', 'sunflower', 'cactus', 'mushroom', 'igloo', 'pyramid',
];

// ---- Helpers ----
// Compares guesses fairly: ignores capitals, accents, spaces and punctuation
const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');

// How many single-letter edits separate two strings (used to spot near misses)
function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

const seated = (G, id) => G.players.includes(id);
const live = (G) => G.phase === 'drawing' && Date.now() < G.endsAt;

// Drawing and guessing moves carry a sequence number, so a move that is resent
// after a lost reply is only ever applied once, and always in order.
function takeSeq(G, id, seq) {
  if (seq !== (G.seqs[id] || 0) + 1) return false;
  G.seqs[id] = seq;
  return true;
}

function addLog(G, entry) {
  G.log.push(entry);
  if (G.log.length > 40) G.log.splice(0, G.log.length - 40);
}

function startTurn(G, random) {
  G.drawer = G.players[G.turn % G.players.length];
  if (G.deck.length < 3) G.deck = random.Shuffle(WORDS.map((_, i) => i));
  G.options = [G.deck.pop(), G.deck.pop(), G.deck.pop()].map((i) => WORDS[i]);
  G.word = null;
  G.phase = 'choosing';
  G.chooseBy = Date.now() + config.chooseMs;
  G.endsAt = null;
  G.strokes = [];
  G.points = 0;
  G.guessed = {};
  G.guesses = {};
  G.log = [];
}

function advance(G, random) {
  G.turn += 1;
  if (G.turn >= G.totalTurns) {
    G.phase = 'gameover';
    G.word = null;
    G.options = [];
    G.endsAt = null;
    return;
  }
  startTurn(G, random);
}

function finishTurn(G) {
  G.recap = {
    turn: G.turn,
    drawer: G.drawer,
    word: G.word,
    got: Object.keys(G.guessed).map((who) => ({ who, pts: G.guessed[who] })),
    passed: false,
  };
  G.phase = 'turnEnd';
  G.endsAt = null;
}

// Validates and adds a piece of a stroke. Bad or over-limit pieces are dropped.
function addChunk(G, chunk) {
  if (!chunk || typeof chunk !== 'object') return;
  const { c, w, p, n } = chunk;
  if (!Number.isInteger(c) || c < 0 || c >= PALETTE_SIZE) return;
  if (!Number.isInteger(w) || w < 0 || w >= BRUSH_SIZES) return;
  if (!Array.isArray(p) || p.length < 2 || p.length > MAX_CHUNK || p.length % 2 !== 0) return;
  if (!p.every((v) => Number.isFinite(v))) return;
  const pts = p.map((v, i) => Math.max(0, Math.min(i % 2 === 0 ? CANVAS.w : CANVAS.h, Math.round(v))));
  const count = pts.length / 2;
  if (G.points + count > MAX_POINTS) return;
  const last = G.strokes[G.strokes.length - 1];
  if (n !== true && last && last.c === c && last.w === w) {
    last.p.push(...pts);
  } else {
    if (G.strokes.length >= MAX_STROKES) return;
    G.strokes.push({ c, w, p: pts });
  }
  G.points += count;
}

export const game = {
  name: 'draw',
  minPlayers: 2,
  maxPlayers: 10,

  // Everyone acts at the same time (guessing, ending a turn).
  // Each move checks for itself who is allowed to make it.
  turn: { activePlayers: { all: null } },

  setup: ({ ctx, random }) => {
    const players = Array.from({ length: ctx.numPlayers }, (_, i) => String(i));
    const scores = {};
    for (const id of players) scores[id] = 0;
    const rounds = ctx.numPlayers <= 5 ? 2 : 1;
    const G = {
      phase: 'choosing', // choosing -> drawing -> turnEnd -> ... -> gameover
      players,
      scores,
      turn: 0,
      totalTurns: players.length * rounds,
      deck: random.Shuffle(WORDS.map((_, i) => i)), // never sent to any device
      drawer: null,
      options: [],
      word: null, // the secret word
      chooseBy: null,
      endsAt: null,
      strokes: [],
      points: 0,
      guessed: {}, // id -> points scored this turn
      guesses: {}, // id -> how many guesses this turn
      log: [],
      seqs: {},
      recap: null,
    };
    startTurn(G, random);
    return G;
  },

  moves: {
    // The drawer picks one of three words and the clock starts
    choose: {
      client: false,
      move: ({ G, playerID }, index) => {
        if (G.phase !== 'choosing' || playerID !== G.drawer) return INVALID_MOVE;
        if (!Number.isInteger(index) || index < 0 || index >= G.options.length) return INVALID_MOVE;
        G.word = G.options[index];
        G.options = [];
        G.phase = 'drawing';
        G.endsAt = Date.now() + config.drawMs;
      },
    },

    draw: {
      client: false,
      move: ({ G, playerID }, seq, chunk) => {
        if (!live(G) || playerID !== G.drawer) return INVALID_MOVE;
        if (!takeSeq(G, playerID, seq)) return INVALID_MOVE;
        addChunk(G, chunk);
      },
    },

    undo: {
      client: false,
      move: ({ G, playerID }, seq) => {
        if (!live(G) || playerID !== G.drawer) return INVALID_MOVE;
        if (!takeSeq(G, playerID, seq)) return INVALID_MOVE;
        const last = G.strokes.pop();
        if (last) G.points -= last.p.length / 2;
      },
    },

    clear: {
      client: false,
      move: ({ G, playerID }, seq) => {
        if (!live(G) || playerID !== G.drawer) return INVALID_MOVE;
        if (!takeSeq(G, playerID, seq)) return INVALID_MOVE;
        G.strokes = [];
        G.points = 0;
      },
    },

    // A guess. Right answers are scored and announced without the word.
    guess: {
      client: false,
      move: ({ G, playerID }, seq, text) => {
        if (!live(G) || !seated(G, playerID) || playerID === G.drawer) return INVALID_MOVE;
        if (!takeSeq(G, playerID, seq)) return INVALID_MOVE;
        if (G.guessed[playerID] !== undefined) return;
        if (typeof text !== 'string') return;
        const guess = text.trim();
        if (!guess || guess.length > MAX_GUESS_LEN) return;
        G.guesses[playerID] = (G.guesses[playerID] || 0) + 1;
        if (G.guesses[playerID] > MAX_GUESSES) return;

        const g = norm(guess);
        const w = norm(G.word);
        if (g === w) {
          const left = Math.max(0, G.endsAt - Date.now());
          const pts = 50 + Math.round((100 * left) / config.drawMs);
          G.guessed[playerID] = pts;
          G.scores[playerID] += pts;
          G.scores[G.drawer] += DRAWER_BONUS;
          addLog(G, { type: 'got', who: playerID, pts });
          if (G.players.every((id) => id === G.drawer || G.guessed[id] !== undefined)) finishTurn(G);
        } else if (g.length >= 4 && distance(g, w) <= 1) {
          addLog(G, { type: 'close', who: playerID }); // the text stays hidden
        } else {
          addLog(G, { type: 'guess', who: playerID, text: guess });
        }
      },
    },

    // When time is up, any player may end the turn (the server checks the clock itself)
    endTurn: {
      client: false,
      move: ({ G, playerID }) => {
        if (G.phase !== 'drawing' || !seated(G, playerID)) return INVALID_MOVE;
        if (Date.now() < G.endsAt) return INVALID_MOVE;
        finishTurn(G);
      },
    },

    // Any player moves on. The turn number stops a late second tap skipping a turn.
    nextTurn: {
      client: false,
      move: ({ G, playerID, random }, turn) => {
        if (G.phase !== 'turnEnd' || !seated(G, playerID) || turn !== G.turn) return INVALID_MOVE;
        advance(G, random);
      },
    },

    // If the drawer takes too long to choose, anyone else can skip their turn
    passTurn: {
      client: false,
      move: ({ G, playerID, random }) => {
        if (G.phase !== 'choosing' || !seated(G, playerID) || playerID === G.drawer) return INVALID_MOVE;
        if (Date.now() < G.chooseBy) return INVALID_MOVE;
        G.recap = { turn: G.turn, drawer: G.drawer, word: null, got: [], passed: true };
        advance(G, random);
      },
    },
  },

  // THE PRIVACY RULES:
  //  - the word options are sent only to the drawer, while choosing
  //  - the secret word is sent only to the drawer while drawing, and to everyone once the turn ends
  //  - everyone else gets only the shape of the word, like "___ ____"
  //  - the deck and the deadlines are never sent (only the time left)
  playerView: ({ G, playerID }) => {
    const isPlayer = playerID !== null && playerID !== undefined && seated(G, playerID);
    const role = !isPlayer ? 'spectator' : playerID === G.drawer ? 'drawer' : 'guesser';
    const now = Date.now();

    let timer = null;
    if (G.phase === 'choosing') {
      timer = { id: `c${G.turn}`, kind: 'choose', left: Math.max(0, G.chooseBy - now) };
    } else if (G.phase === 'drawing') {
      timer = { id: `d${G.turn}`, kind: 'draw', left: Math.max(0, G.endsAt - now) };
    }

    let word = null;
    let hint = null;
    if (G.phase === 'drawing') {
      if (role === 'drawer') word = G.word;
      else hint = G.word.replace(/[\p{L}\p{N}]/gu, '_');
    } else if (G.phase === 'turnEnd') {
      word = G.word;
    }

    return {
      phase: G.phase,
      players: G.players,
      scores: G.scores,
      turn: G.turn,
      totalTurns: G.totalTurns,
      drawer: G.drawer,
      role,
      options: G.phase === 'choosing' && role === 'drawer' ? G.options : null,
      word,
      hint,
      timer,
      strokes: G.strokes,
      ink: Math.min(1, G.points / MAX_POINTS),
      guessed: G.guessed,
      log: G.log,
      recap: G.recap,
      mySeq: isPlayer ? G.seqs[playerID] || 0 : 0,
    };
  },

  endIf: ({ G }) => {
    if (G.phase !== 'gameover') return;
    const best = Math.max(...Object.values(G.scores));
    return { winners: G.players.filter((id) => G.scores[id] === best) };
  },
};