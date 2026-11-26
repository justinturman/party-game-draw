const INVALID_MOVE = 'INVALID_MOVE';

// Timings. Exported so the tests can shorten them.
export const config = {
  drawMs: 60000, // time to draw
  chooseMs: 25000, // time for the drawer to pick a word
  recapMs: 8000, // how long the result of a round is shown
  presenceMs: 26000, // a phone not heard from for this long counts as away
};

// The canvas and its limits. view.js has copies of these numbers.
export const CANVAS = { w: 640, h: 480 };
const PALETTE_SIZE = 10;
const BRUSH_SIZES = 3;
const MAX_STROKES = 250;
const MAX_POINTS = 2500;
const MAX_CHUNK = 80; // numbers (x,y pairs) in one drawing move
const MAX_GUESS_LEN = 40;
const MAX_GUESSES = 40; // per player per round

// Original word list
export const WORDS = [
  // --- Food & Drink ---
  'apple', 'banana', 'pizza', 'hamburger', 'ice cream', 'cupcake', 'popcorn', 
  'pancake', 'spaghetti', 'watermelon', 'pineapple', 'carrot', 'sandwich', 
  'birthday cake', 'taco', 'hot dog', 'pretzel', 'donut', 'cookie', 'cheese', 
  'egg', 'broccoli', 'cherry', 'lemon', 'milk', 'coffee', 'teapot', 
  'lollipop', 'popsicle', 'avocado', 'pear', 'peach', 'strawberry', 'grapes', 
  'corn', 'pumpkin', 'onion', 'potato', 'french fries', 'burrito', 
  'sushi', 'waffle', 'bread', 'chocolate',
  'pie', 'soup', 'fork', 'knife', 'spoon', 'plate', 
  'olive', 'pickle', 'coconut', 'lemonade', 'muffin', 'bacon', 'meatball',
  'fortune cookie', 'pepper', 'wine', 'milkshake', 'cereal', 'honey',

  // --- Vehicles & Transport ---
  'bicycle', 'airplane', 'helicopter', 'submarine', 'sailboat', 'hot air balloon', 
  'school bus', 'fire truck', 'train', 'rocket', 'pirate ship', 'motorcycle', 
  'tractor', 'canoe', 'skateboard', 'surfboard', 'snowboard', 'scooter', 'wagon', 
  'ambulance', 'police car', 'taxi', 'garbage truck', 'bulldozer', 'cement mixer', 
  'sports car', 'cruise ship', 'boat', 'blimp', 'parachute', 
  'hang glider', 'spaceship', 'ufo', 'tank', 'chariot', 'sled', 'roller skates', 
  'unicycle', 'dump truck', 'monster truck', 'double decker bus', 'kayak', 'jet ski', 'snowmobile', 'tow truck', 'limousine',

  // --- Landmarks & Nature ---
  'lighthouse', 'volcano', 'castle', 'rainbow', 'tornado', 
  'fireworks', 'campfire', 'tent', 'tree house', 'windmill', 'bridge', 'igloo', 
  'pyramid', 'cactus', 'mushroom', 'sunflower', 'mountain', 'island', 'waterfall', 
  'cloud', 'sun', 'moon', 'star', 'cave', 'beach', 'forest', 'spider web', 'tunnel',
  'canyon', 'desert', 'swamp', 'glacier', 'geyser', 'quicksand', 'coral', 
  'lightning', 'meteor',
  'cliff', 'crater', 'oasis',

  // --- Animals ---
  'elephant', 'giraffe', 'penguin', 'octopus', 'butterfly', 'spider', 'snail', 
  'kangaroo', 'dolphin', 'owl', 'turtle', 'dragon', 'unicorn', 'mermaid', 'dinosaur', 
  'monkey', 'lion', 'tiger', 'bear', 'rabbit', 'frog', 'duck', 'chicken', 'cow', 
  'pig', 'horse', 'sheep', 'bee', 'ant', 'shark', 'whale', 'crab', 'starfish', 
  'scorpion', 'peacock', 'flamingo', 'hedgehog', 'squirrel', 'zebra', 'rhino', 
  'hippo', 'camel', 'polar bear', 'koala', 'panda', 'sloth', 'bat', 'eagle', 
  'parrot', 'swan', 'pelican', 'seagull', 'ostrich', 'beaver', 'skunk', 'raccoon', 
  'fox', 'wolf', 'deer', 'moose', 'walrus', 'seal', 'jellyfish', 'lobster', 
  'pufferfish', 'swordfish', 'chameleon', 'lizard', 'snake', 't-rex', 
  'centipede', 'ladybug', 'dragonfly', 
  'porcupine', 'platypus', 
  'gorilla','cheetah', 
  'donkey', 
  'rooster', 'turkey', 'pigeon', 'crow', 'hummingbird', 
  'goldfish', 
  

  // --- People & Characters ---
  'robot', 'astronaut', 'ghost', 'vampire', 'wizard', 'princess', 'knight', 'clown', 
  'dentist', 'chef', 'firefighter', 'scarecrow', 'pirate', 'ninja', 'cowboy', 
  'superhero', 'mummy', 'zombie', 'alien', 'king', 'queen', 'baby', 'doctor', 
  'police officer', 'scientist', 'artist', 'musician', 'teacher', 'soldier', 
  'detective', 'caveman', 'viking', 'fairy', 'genie', 'leprechaun', 'snowman', 
  'santa claus', 'cupid', 'baker', 'barber', 'plumber', 'carpenter', 
  'electrician', 'mechanic', 'farmer', 'pilot', 'sailor',
  
  // --- Household & Everyday Objects ---
  'kite', 'trampoline', 'swing', 'balloon', 'present', 'key', 'scissors', 
  'hammer', 'ladder', 'toothbrush', 'mirror', 'sunglasses', 'clock', 'bathtub', 
  'wheelbarrow', 'anchor', 'lantern', 'headphones', 'camera', 'suitcase', 'broom', 
  'mop', 'bucket', 'soap', 'towel', 'pillow', 'blanket', 'candle', 'lightbulb', 
  'book', 'pencil', 'paintbrush', 'envelope', 'stamp', 'telephone', 'television', 
  'computer', 'chair', 'table', 'door', 'window', 'fence',
  'toaster', 'blender', 'microwave', 'refrigerator', 'washing machine',
  'hair dryer', 'comb', 'toilet', 'frying pan', 'teacup', 'vase',
  'picture frame', 'trash can', 'mailbox', 'basket',
  'birdhouse', 'birdcage', 'doghouse', 'thermometer', 'scale',
  'elevator', 'fireplace', 'chandelier', 'ceiling fan',
  'rug', 'curtain', 'bookshelf', 'desk',
  'notebook', 'calculator', 'printer','projector', 'microscope',
  'globe', 'map', 'atlas', 'calendar', 
  'stapler', 'tape dispenser', 'marker',

  // --- Clothing & Accessories ---
  'crown', 'hat', 'shoe', 'sock', 'glove', 'scarf', 'bow tie', 
  'necklace', 'ring', 'watch', 'boot', 'dress', 'shirt', 'pants',
  'mittens', 'swimsuit', 'raincoat', 'apron', 'belt', 'purse', 'wallet',
  'briefcase', 'umbrella', 'backpack', 'wizard hat', 'cowboy hat', 'helmet',
  'jacket', 'sweater', 'tie', 'slippers', 'flip flops', 'high heels', 'sandals',
  'baseball cap', 'beanie', 'top hat', 'beret', 'veil', 'tiara', 'bracelet',
  'earring', 'fanny pack',

  // --- Sports & Games ---
  'soccer ball', 'bowling ball', 'baseball bat', 'tennis racket', 
  'golf club', 'pool', 'dice', 'chess', 'puzzle', 'trophy', 
  'medal', 'fishing', 'dart', 'hula hoop', 'jump rope',
  'ping pong', 'volleyball', 'hockey', 'boxing', 'whistle',
  'stopwatch', 'scoreboard', 'net', 'goalpost', 'gym',
  'treadmill',

  // --- Music & Art ---
  'guitar', 'piano', 'drum', 'trumpet', 'violin', 'microphone', 'music', 
  'painting', 'easel','flute', 'harp', 'accordion',
  'banjo','maracas', 'xylophone', 'boombox', 
  'cello', 'tuba', 'trombone', 'clarinet', 
  'harmonica',  'canvas', 'sculpture',

  // --- Tools & Weapons ---
  'sword', 'shield', 'treasure map', 'compass', 'telescope', 'magnifying glass', 
  'flashlight', 'syringe', 'stethoscope', 'wrench', 'screwdriver', 'saw', 'shovel', 
  'pickaxe', 'magnet', 'binoculars', 'hourglass', 'lock', 'chain', 'plunger',
  'tape measure', 'toolbox', 'anvil', 'crowbar', 'fire extinguisher', 'safety pin',
  'paperclip', 'rubber band', 'pushpin',
  
 
  // --- Mythical & Fantasy ---
  'centaur', 'minotaur', 'cyclops', 'medusa', 'pegasus', 'phoenix', 
  'werewolf', 'bigfoot', 'loch ness monster',
  'sphinx', 
 'magic wand', 'crystal ball', 'cauldron', 'potion',
  'magic lamp',

  // --- Tricky Concepts (Easy to draw, fun to guess) ---
  'echo', 'gravity', 'shadow', 'reflection', 'footprint', 'fingerprint',
  'time', 'dream', 'nightmare', 'memory', 'sneeze', 'hiccup',
  'yawn', 'blush', 'whisper', 'scream', 'silence', 'taste', 'smell',
  'tickle', 'balance', 'electricity'
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

const isSeat = (G, id) => typeof id === 'string' && /^\d+$/.test(id) && Number(id) < G.seats;
const live = (G) => G.phase === 'drawing' && Date.now() < G.endsAt;

// ---- Who is here? ----
// The server cannot see who is connected, so every phone sends a small "I'm here"
// now and then (and every move counts as one). A seat not heard from for a while
// is treated as away. Players are kept in the order they first showed up.
const presentIds = (G) => {
  const now = Date.now();
  return G.order.filter((id) => now - (G.seen[id] || 0) < config.presenceMs);
};
const isPresent = (G, id) => presentIds(G).includes(id);

function touch(G, id) {
  if (!isSeat(G, id)) return false;
  G.seen[id] = Date.now();
  if (!G.order.includes(id)) G.order.push(id);
  return true;
}

// The next player who is here, after `id` in joining order (wrapping round).
// With no `id`, that is simply whoever joined first and is still here.
function nextPresent(G, id) {
  const here = presentIds(G);
  if (here.length === 0) return null;
  const start = G.order.indexOf(id);
  for (let k = 1; k <= G.order.length; k++) {
    const candidate = G.order[(start + k) % G.order.length];
    if (here.includes(candidate)) return candidate;
  }
  return here[0];
}

// `want` draws if they are still here, otherwise whoever comes after them
function pickDrawer(G, want) {
  if (want && isPresent(G, want)) return want;
  return nextPresent(G, want);
}

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

// ---- Rounds ----
function startTurn(G, random, drawer) {
  G.round += 1;
  G.drawer = drawer;
  G.planned = null;
  if (G.deck.length < 3) G.deck = random.Shuffle(WORDS.map((_, i) => i));
  G.options = [G.deck.pop(), G.deck.pop(), G.deck.pop()].map((i) => WORDS[i]);
  G.word = null;
  G.phase = 'choosing';
  G.chooseBy = Date.now() + config.chooseMs;
  G.endsAt = null;
  G.strokes = [];
  G.points = 0;
  G.guesses = {};
  G.log = [];
}

// Start the next round, or wait for company if nobody else is here
function advance(G, random, want) {
  const drawer = pickDrawer(G, want);
  if (!drawer || presentIds(G).length < 2) {
    G.phase = 'waiting';
    G.planned = drawer || want || null;
    G.drawer = null;
    G.options = [];
    G.word = null;
    G.endsAt = null;
    G.strokes = [];
    G.points = 0;
    G.log = [];
    return;
  }
  startTurn(G, random, drawer);
}

// win is { who, pts, drawerPts } when someone guessed it
function finishRound(G, win, reason) {
  G.recap = {
    round: G.round,
    drawer: G.drawer,
    word: G.word,
    winner: win ? win.who : null,
    pts: win ? win.pts : 0,
    drawerPts: win ? win.drawerPts : 0,
    reason, // 'guessed' | 'time' | 'left'
    // The guesser who won draws next. If nobody did, the turn moves round the room.
    next: win ? win.who : nextPresent(G, G.drawer),
    endAt: Date.now(),
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
  // There is no fixed player count: the room has 16 seats and people simply fill
  // them as they arrive (the platform's "Start" button, openJoin).
  minPlayers: 16,
  maxPlayers: 16,

  // Everyone acts at the same time (guessing, moving on).
  // Each move checks for itself who is allowed to make it.
  turn: { activePlayers: { all: null } },

  setup: ({ ctx, random }) => ({
    phase: 'waiting', // waiting -> choosing -> drawing -> turnEnd -> choosing -> ... (it never ends)
    seats: ctx.numPlayers,
    order: [], // seats in the order they first showed up
    seen: {}, // seat -> the last time we heard from it
    scores: {}, // seat -> points; kept when someone leaves
    round: 0,
    planned: null, // who draws as soon as there are two players
    deck: random.Shuffle(WORDS.map((_, i) => i)), // never sent to any device
    drawer: null,
    options: [],
    word: null, // the secret word
    chooseBy: null,
    endsAt: null,
    strokes: [],
    points: 0,
    guesses: {}, // id -> how many guesses this round
    log: [],
    seqs: {},
    recap: null,
  }),

  moves: {
    // "I'm here." Also starts the very first round once a second player has arrived.
    here: {
      client: false,
      move: ({ G, playerID, random }) => {
        if (!touch(G, playerID)) return INVALID_MOVE;
        if (G.scores[playerID] === undefined) G.scores[playerID] = 0;
        if (G.phase === 'waiting' && presentIds(G).length >= 2) {
          startTurn(G, random, pickDrawer(G, G.planned));
        }
      },
    },

    // The drawer picks one of three words and the clock starts
    choose: {
      client: false,
      move: ({ G, playerID }, index) => {
        if (G.phase !== 'choosing' || !touch(G, playerID) || playerID !== G.drawer) return INVALID_MOVE;
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
        if (!live(G) || !touch(G, playerID) || playerID !== G.drawer) return INVALID_MOVE;
        if (!takeSeq(G, playerID, seq)) return INVALID_MOVE;
        addChunk(G, chunk);
      },
    },

    undo: {
      client: false,
      move: ({ G, playerID }, seq) => {
        if (!live(G) || !touch(G, playerID) || playerID !== G.drawer) return INVALID_MOVE;
        if (!takeSeq(G, playerID, seq)) return INVALID_MOVE;
        const last = G.strokes.pop();
        if (last) G.points -= last.p.length / 2;
      },
    },

    clear: {
      client: false,
      move: ({ G, playerID }, seq) => {
        if (!live(G) || !touch(G, playerID) || playerID !== G.drawer) return INVALID_MOVE;
        if (!takeSeq(G, playerID, seq)) return INVALID_MOVE;
        G.strokes = [];
        G.points = 0;
      },
    },

    // A guess. The first right answer wins the round: the guesser scores more the
    // faster they were, the drawer earns half as much, and the guesser draws next.
    guess: {
      client: false,
      move: ({ G, playerID }, seq, text) => {
        if (!live(G) || !touch(G, playerID) || playerID === G.drawer) return INVALID_MOVE;
        if (!takeSeq(G, playerID, seq)) return INVALID_MOVE;
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
          const drawerPts = Math.round(pts / 2);
          G.scores[playerID] = (G.scores[playerID] || 0) + pts;
          G.scores[G.drawer] = (G.scores[G.drawer] || 0) + drawerPts;
          addLog(G, { type: 'got', who: playerID, pts });
          finishRound(G, { who: playerID, pts, drawerPts }, 'guessed');
        } else if (g.length >= 4 && distance(g, w) <= 1) {
          addLog(G, { type: 'close', who: playerID }); // the text stays hidden
        } else {
          addLog(G, { type: 'guess', who: playerID, text: guess });
        }
      },
    },

    // When time is up, or the drawer has gone, any player may end the round.
    // The server checks the clock and who is here for itself.
    endTurn: {
      client: false,
      move: ({ G, playerID }) => {
        if (G.phase !== 'drawing' || !touch(G, playerID)) return INVALID_MOVE;
        const timeUp = Date.now() >= G.endsAt;
        const drawerGone = playerID !== G.drawer && !isPresent(G, G.drawer);
        if (!timeUp && !drawerGone) return INVALID_MOVE;
        finishRound(G, null, timeUp ? 'time' : 'left');
      },
    },

    // Any player moves on after the result has been shown. The round number stops
    // a late second request skipping a round.
    nextTurn: {
      client: false,
      move: ({ G, playerID, random }, round) => {
        if (G.phase !== 'turnEnd' || !touch(G, playerID) || round !== G.round) return INVALID_MOVE;
        if (Date.now() - G.recap.endAt < config.recapMs) return INVALID_MOVE;
        advance(G, random, G.recap.next);
      },
    },

    // If the drawer takes too long to choose (or has gone), anyone else can skip them
    passTurn: {
      client: false,
      move: ({ G, playerID, random }) => {
        if (G.phase !== 'choosing' || !touch(G, playerID) || playerID === G.drawer) return INVALID_MOVE;
        if (Date.now() < G.chooseBy && isPresent(G, G.drawer)) return INVALID_MOVE;
        G.recap = {
          round: G.round, drawer: G.drawer, word: null, winner: null, pts: 0, drawerPts: 0,
          reason: 'passed', next: null, endAt: Date.now(),
        };
        advance(G, random, nextPresent(G, G.drawer));
      },
    },
  },

  // THE PRIVACY RULES:
  //  - the word options are sent only to the drawer, while choosing
  //  - the secret word is sent only to the drawer while drawing, and to everyone once the round ends
  //  - everyone else gets only the shape of the word, like "___ ____"
  //  - the deck and the deadlines are never sent (only the time left)
  playerView: ({ G, playerID }) => {
    const now = Date.now();
    const here = presentIds(G);
    const isPlayer = playerID !== null && playerID !== undefined && isSeat(G, playerID);
    const role = !isPlayer ? 'spectator' : playerID === G.drawer ? 'drawer' : 'guesser';

    let timer = null;
    if (G.phase === 'choosing') {
      timer = { id: `c${G.round}`, kind: 'choose', left: Math.max(0, G.chooseBy - now) };
    } else if (G.phase === 'drawing') {
      timer = { id: `d${G.round}`, kind: 'draw', left: Math.max(0, G.endsAt - now) };
    } else if (G.phase === 'turnEnd') {
      timer = { id: `r${G.round}`, kind: 'recap', left: Math.max(0, G.recap.endAt + config.recapMs - now) };
    }

    let word = null;
    let hint = null;
    if (G.phase === 'drawing') {
      if (role === 'drawer') word = G.word;
      else hint = G.word.replace(/[\p{L}\p{N}]/gu, '_');
    } else if (G.phase === 'turnEnd') {
      word = G.word;
    }

    // who draws next, once the result is in or while we wait for company
    let upNext = null;
    if (G.phase === 'turnEnd') upNext = pickDrawer(G, G.recap.next);
    else if (G.phase === 'waiting') upNext = pickDrawer(G, G.planned);

    // the scoreboard: everyone here, plus anyone who left with points
    const players = G.order.filter((id) => here.includes(id) || (G.scores[id] || 0) > 0);

    let recap = null;
    if (G.recap && G.phase === 'turnEnd') {
      recap = { ...G.recap, endAt: undefined };
    } else if (G.recap && G.recap.reason === 'passed') {
      recap = { round: G.recap.round, drawer: G.recap.drawer, reason: 'passed' };
    }

    return {
      phase: G.phase,
      round: G.round,
      players,
      present: here,
      scores: G.scores,
      drawer: G.drawer,
      drawerAway: G.drawer !== null && !here.includes(G.drawer),
      upNext,
      role,
      options: G.phase === 'choosing' && role === 'drawer' ? G.options : null,
      word,
      hint,
      timer,
      strokes: G.strokes,
      ink: Math.min(1, G.points / MAX_POINTS),
      log: G.log,
      recap,
      mySeq: isPlayer ? G.seqs[playerID] || 0 : 0,
    };
  },
};
