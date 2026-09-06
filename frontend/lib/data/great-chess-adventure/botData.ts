/** Asset base — drop Manus export images into `public/adventure/great-chess-adventure/assets/`. */
export const GCA_ASSET_BASE = "/adventure/great-chess-adventure/assets"

export interface Bot {
  id: number
  name: string
  rating: number
  personality: string
  playStyle: string
  says: string
  emoji: string
  isBoss: boolean
}

export interface World {
  id: number
  name: string
  icon: string
  ratingRange: string
  description: string
  color: string
  bgGradient: string
  bgImage: string
  bots: Bot[]
}

export const worlds: World[] = [
  {
    id: 1,
    name: "The Beginner Forest",
    icon: "🌳",
    ratingRange: "100 – 250",
    description: "Your chess adventure begins here, in the softest, friendliest forest in the whole world.",
    color: "#2D8B4E",
    bgGradient: "from-emerald-900/90 via-emerald-800/70 to-green-900/90",
    bgImage: `${GCA_ASSET_BASE}/forest-bg_bcdae609.png`,
    bots: [
      { id: 1, name: "Benny the Sleepy Bunny", rating: 100, personality: "Benny yawns after every single move. Sometimes he falls asleep right in the middle of the game and dreams about carrots.", playStyle: "Forgets his pieces everywhere! Benny often leaves his queen napping where anyone can take her.", says: "Yaaawn… you played wonderfully! Win or lose, you get a carrot high-five. Wanna play again after my nap?", emoji: "🐰", isBoss: false },
      { id: 2, name: "Mushroom Mel", rating: 120, personality: "A giggly little mushroom who bounces up and down when anything exciting happens — which is always.", playStyle: "Moves pawns in silly directions and giggles when pieces get captured, even his own.", says: "Hee hee! Every game makes you grow taller, just like me. You're already sprouting into a star!", emoji: "🍄", isBoss: false },
      { id: 3, name: "Tilly the Turtle", rating: 140, personality: "The slowest, sweetest turtle in the forest. She brings snacks to every game and shares them with you.", playStyle: "Plays verrry slowly and gives away pieces like they are birthday presents.", says: "Slow and steady, friend! You're getting better every single move. I can see it from inside my shell!", emoji: "🐢", isBoss: false },
      { id: 4, name: "Pip the Squirrel", rating: 160, personality: "Pip can never focus because — ACORN! Where was he? Oh right, chess. Wait… ACORN!", playStyle: "Gets distracted mid-game and forgets what he was planning. Loves grabbing pawns like acorns.", says: "Wow, you're so focused! I wish I could pay attention like you. You're nuts-level amazing!", emoji: "🐿️", isBoss: false },
      { id: 5, name: "Fern the Fawn", rating: 180, personality: "A shy little deer who hides behind trees between moves and peeks out to see what you did.", playStyle: "Only feels brave enough to move pawns and knights. Everything else is too scary!", says: "You make chess feel less scary… thank you for playing with me. You're braver every game!", emoji: "🦌", isBoss: false },
      { id: 6, name: "Buzzby the Bee", rating: 200, personality: "Buzzby zigzags around the board humming happy songs. He thinks knights are bees because they jump around too.", playStyle: "Loves moving his knights in zigzags — sometimes forward, sometimes backward, sometimes in circles!", says: "Buzz buzz! You're the bee's knees! Every game makes your chess honey sweeter!", emoji: "🐝", isBoss: false },
      { id: 7, name: "Ollie the Owlet", rating: 225, personality: "Wizzy's little nephew, studying hard to become a wizard owl one day. He wears tiny reading glasses.", playStyle: "Tries little checks on your king and hoots proudly when they work — but he still misses lots of things.", says: "Hoot hoot! Uncle Wizzy says losing is just learning in disguise. We're both getting wiser!", emoji: "🦉", isBoss: false },
      { id: 8, name: "Grandpa Oak", rating: 250, personality: "The oldest, kindest tree in the forest. He tells long stories about chess games from a hundred years ago.", playStyle: "The Forest Boss! He guards his king carefully behind pawn branches, but forgets to watch the corners of the board.", says: "Well played, little sapling! Trees grow slowly, ring by ring — and so do champions. I'm proud of you.", emoji: "🌲", isBoss: true },
    ],
  },
  {
    id: 2,
    name: "The Candy Kingdom",
    icon: "🍭",
    ratingRange: "280 – 500",
    description: "The players here are sweet… but a little trickier!",
    color: "#E91E8C",
    bgGradient: "from-pink-900/90 via-fuchsia-800/70 to-purple-900/90",
    bgImage: `${GCA_ASSET_BASE}/candy-bg_7589946a.png`,
    bots: [
      { id: 9, name: "Gummy Gus", rating: 280, personality: "A bouncy gummy bear who cannot sit still. He boings up and down after every move, even the bad ones.", playStyle: "Grabs every piece he can, like candy in a candy shop — even when grabbing gets him in trouble!", says: "Boing boing! Sweet game! Every match makes you chewier… I mean, stronger! Let's bounce back!", emoji: "🧸", isBoss: false },
      { id: 10, name: "Lolly Lila", rating: 310, personality: "A swirly lollipop who twirls everywhere she goes. She calls her bishops her 'candy canes.'", playStyle: "Loves sliding her bishops in long swirly lines across the board, but forgets about everything else.", says: "What a swirl-tastic game! You're twirling your way to the top, sugar star!", emoji: "🍭", isBoss: false },
      { id: 11, name: "Marsh Mellow", rating: 340, personality: "The softest, squishiest, most relaxed marshmallow you'll ever meet. Nothing worries Marsh. Ever.", playStyle: "Never attacks! He just builds soft, fluffy pawn walls and hides behind them all game long.", says: "Stay soft, stay happy, friend. You played smooth as marshmallow cream. Toast-ally awesome!", emoji: "☁️", isBoss: false },
      { id: 12, name: "Sir Choco Chip", rating: 370, personality: "A brave little chocolate-chip knight in a cookie helmet. He shouts 'CHAAARGE!' a lot.", playStyle: "Charges his knights out super early and attacks before he's ready. Very brave, not very careful!", says: "CHAAARGE… into your next game! A true knight never gives up, and neither do you!", emoji: "🍪", isBoss: false },
      { id: 13, name: "Bubble-Gum Bella", rating: 400, personality: "Bella blows a giant bubble every turn. Sometimes it pops and she jumps and forgets her plan.", playStyle: "Plays fast, fast, fast! Speedy moves mean she misses things sometimes — pop!", says: "Pop! You're bubbling with talent! Quick or slow, you always show up — that's what champions do!", emoji: "🫧", isBoss: false },
      { id: 14, name: "Jelly-Bean Gene", rating: 430, personality: "Nobody knows what Gene will do next — not even Gene! Every move is a surprise flavor.", playStyle: "Makes wild, surprising moves out of nowhere. Some are silly, some are secretly clever!", says: "Surprise! The best flavor of all is trying again. You've got that flavor for sure!", emoji: "🫘", isBoss: false },
      { id: 15, name: "Caramel Cara", rating: 465, personality: "Sweet, slow, and sticky. Cara stretches like warm caramel and never, ever rushes.", playStyle: "Plays sticky defense — her pieces hold on tight and are tricky to shake loose!", says: "Mmm, what a smooth game! Stick with chess, sweetie — you're getting stronger, drip by drip!", emoji: "🍯", isBoss: false },
      { id: 16, name: "King Kandy", rating: 500, personality: "The jolly ruler of Candy Kingdom, with a crown made of sour gummies. He laughs so hard his throne shakes.", playStyle: "The Candy Boss! He marches his king out for adventures way too early — royal, but risky!", says: "Ho ho! Marvelous match! In my kingdom, every player who tries their best wears a crown. That's you!", emoji: "👑", isBoss: true },
    ],
  },
  {
    id: 3,
    name: "The Pirate Cove",
    icon: "🏴‍☠️",
    ratingRange: "530 – 750",
    description: "The pirates here love sneaky tricks and hidden traps. Keep your eyes wide open, matey!",
    color: "#1A6B7C",
    bgGradient: "from-teal-900/90 via-cyan-800/70 to-slate-900/90",
    bgImage: `${GCA_ASSET_BASE}/pirate-bg_f18ed0a0.png`,
    bots: [
      { id: 17, name: "Salty Sam the Cabin Kid", rating: 530, personality: "The youngest pirate on the ship, always mopping the deck and dreaming of treasure.", playStyle: "Just learned his first sneaky trap and tries it every single game. Every. Single. Game.", says: "Arrr, matey! Ye sailed a fine game! Every voyage makes ye a saltier sailor. Anchors up, try again!", emoji: "🧹", isBoss: false },
      { id: 18, name: "Polly the Parrot", rating: 560, personality: "SQUAWK! Polly repeats everything you say. She also copies chess moves!", playStyle: "Copies your moves like a mirror! But copying can't save her forever… can you find out why?", says: "SQUAWK! Great game! Great game! Polly thinks you're clever! Clever! Play again! Again!", emoji: "🦜", isBoss: false },
      { id: 19, name: "Squid Lips Lou", rating: 590, personality: "A friendly squid with eight arms and eight opinions. He hugs the chessboard when he gets excited.", playStyle: "Grabby grabby! Lou reaches for captures with all eight arms, even when he shouldn't.", says: "Eight arms, one big hug for you! Win or lose, you're ink-credible, kiddo!", emoji: "🦑", isBoss: false },
      { id: 20, name: "Peg-Leg Penny", rating: 620, personality: "Penny taps her wooden leg when she's plotting something sneaky — tap, tap, tap.", playStyle: "Queen of one-move traps! She hides little tricks around the board like buried treasure.", says: "Tap tap! Ye dodged some o' me traps — sharp eyes, sailor! Sharp eyes find treasure every time!", emoji: "🦿", isBoss: false },
      { id: 21, name: "Barnacle Bob", rating: 650, personality: "Bob has been stuck to the same rock for 40 years and sees no reason to hurry now.", playStyle: "Sticks to defense like a barnacle, then suddenly — SURPRISE! — he leaps aboard to attack!", says: "Stick with it, matey! Barnacles never let go, and neither should you. Ye're growin' tougher!", emoji: "🪨", isBoss: false },
      { id: 22, name: "First Mate Fifi", rating: 685, personality: "A clever fox in a captain's coat who loves shiny things.", playStyle: "Loves attacking two things at once! Watch out when her pieces point in two directions.", says: "Two treasures are nice, but the real gold is a player who keeps trying — and that's you, shiny!", emoji: "🦊", isBoss: false },
      { id: 23, name: "Cannonball Carl", rating: 720, personality: "BOOM! Carl talks in a big booming voice and thinks everything is more fun with cannons.", playStyle: "Fires his rooks down open lines like cannonballs! KABOOM goes the middle of the board!", says: "BOOM! What a blast of a game! Ye've got cannon-sized courage, little buccaneer!", emoji: "💣", isBoss: false },
      { id: 24, name: "Captain Goldbeard", rating: 750, personality: "The legendary pirate captain with a beard made of actual gold. He's secretly a big softie who loves kittens.", playStyle: "The Cove Boss! A master of sneaky traps — he hides tricks inside tricks inside tricks!", says: "Arrr, ye've got the heart of a true captain! X marks the spot — and the treasure was yer courage all along!", emoji: "🏴‍☠️", isBoss: true },
    ],
  },
  {
    id: 4,
    name: "Robot City",
    icon: "🤖",
    ratingRange: "780 – 1000",
    description: "The robots play very tidy chess. Time to sharpen those circuits in your brain!",
    color: "#3B82F6",
    bgGradient: "from-blue-900/90 via-indigo-800/70 to-slate-900/90",
    bgImage: `${GCA_ASSET_BASE}/robot-bg_2ef6c7db.png`,
    bots: [
      { id: 25, name: "Bleep", rating: 780, personality: "A tiny robot the size of a teacup who says 'bleep!' when happy, which is basically always.", playStyle: "Makes small, careful moves and double-checks everything twice. Bleep! Checked. Bleep! Checked again.", says: "Bleep! Game analyzed: YOU ARE AWESOME. Error not found. Playing again is recommended!", emoji: "🔵", isBoss: false },
      { id: 26, name: "Boop", rating: 805, personality: "Bleep's twin! Boop says 'boop!' instead of 'bleep!' and they argue about which sounds cooler.", playStyle: "Loves trading pieces — you take mine, I take yours! Boop thinks trades are like high-fives.", says: "Boop! Trade complete: your effort for my respect. Best trade ever! Boop boop!", emoji: "🟣", isBoss: false },
      { id: 27, name: "Gizmo Gears", rating: 830, personality: "A clockwork robot who runs on tick-tock time. Everything Gizmo does happens in perfect order.", playStyle: "Brings out pieces one by one like clockwork — knights, bishops, castle the king. Tick, tock, tick.", says: "Tick tock! Every game winds you up stronger. Your gears are turning beautifully, friend!", emoji: "⚙️", isBoss: false },
      { id: 28, name: "Sparky", rating: 860, personality: "A zippy robot with lightning-bolt stickers. Sometimes gets SO excited that smoke puffs out of her ears.", playStyle: "Launches fast, zappy attacks! But when she rushes too much — bzzzt! — short circuit!", says: "Bzzzt! You're electric! Even my lightning can't keep up with how fast you're improving!", emoji: "⚡", isBoss: false },
      { id: 29, name: "Roomba Rex", rating: 890, personality: "A round robot who cannot STAND a messy board. His dream is a board so clean you can see your reflection.", playStyle: "Vacuums pieces off the board with trades until only kings and pawns remain. So tidy!", says: "Board cleaned! Dust detected: zero. Talent detected: MAXIMUM. You're sparkling, champ!", emoji: "🧹", isBoss: false },
      { id: 30, name: "Mega Mags", rating: 920, personality: "A robot with giant magnet arms. Her hugs are so magnetic that spoons follow her around the city.", playStyle: "Pins your pieces down with her magnet powers — once she sticks to a piece, it can't move!", says: "You're attractive — magnetically speaking! I'm pulled toward one conclusion: you're getting GOOD.", emoji: "🧲", isBoss: false },
      { id: 31, name: "Circuit Cindy", rating: 950, personality: "The smartest kid-robot in school. She wears a backpack full of spare batteries 'just in case.'", playStyle: "Thinks two moves ahead! If you move here, she already knows what she'll do there.", says: "Calculation complete: you + practice = unstoppable. My circuits never lie!", emoji: "🔋", isBoss: false },
      { id: 32, name: "Drone Dave", rating: 975, personality: "A chill flying robot who sees everything from above. He films slow-motion replays of cool moves.", playStyle: "Hovers over the board spotting weak squares — then lands his pieces right on them!", says: "From up here, I can see it clearly: you're on the path to greatness. Replay saved forever!", emoji: "🛸", isBoss: false },
      { id: 33, name: "Mayor Motherboard", rating: 1000, personality: "The wise, kind mayor of Robot City. Her crown is a keyboard and her speech ends with 'Enter!'", playStyle: "The Robot Boss! Plays solid, sensible chess with no silly mistakes. Beating her means you've leveled up!", says: "Citizen, you have upgraded magnificently! Robot City believes in you. Press play to continue. Enter!", emoji: "🤖", isBoss: true },
    ],
  },
  {
    id: 5,
    name: "The Star Galaxy",
    icon: "🚀",
    ratingRange: "1030 – 1300",
    description: "Out here, the chess players have plans as big as planets. Deep breath, space cadet — you're ready for this.",
    color: "#7C3AED",
    bgGradient: "from-purple-900/90 via-violet-800/70 to-indigo-900/90",
    bgImage: `${GCA_ASSET_BASE}/galaxy-bg_d7e40f30.png`,
    bots: [
      { id: 34, name: "Astro Andy", rating: 1030, personality: "A cheerful space cadet who read the whole Space Chess Manual… twice. He salutes before every game.", playStyle: "Plays openings straight from the manual — pieces out, king safe, everything by the book!", says: "Cadet, your mission report says: IMPROVING FAST. The manual has one rule above all: never give up!", emoji: "👨‍🚀", isBoss: false },
      { id: 35, name: "Luna the Moon Cat", rating: 1060, personality: "A silvery cat who lives on the moon and naps in craters. Quiet… so quiet… until she POUNCES.", playStyle: "Plays calm, sleepy moves… then suddenly pounces with a surprise attack! Meow!", says: "Purrrr… you play like moonlight, getting brighter every night. See you next orbit, star player.", emoji: "🌙", isBoss: false },
      { id: 36, name: "Comet Kid", rating: 1090, personality: "The fastest kid in the galaxy, with a sparkly tail of stardust. He's never once been on time — always early!", playStyle: "Zooms into speedy attacks before you can blink! Fast pieces flying everywhere!", says: "Zooooom! You kept up with a comet — that's incredible! Your skills are moving at light speed!", emoji: "☄️", isBoss: false },
      { id: 37, name: "Rocket Rhonda", rating: 1125, personality: "A rocket engineer who counts down before her favorite moves: 'Three… two… one…' Uh oh.", playStyle: "Launches big attacks at your king's castle! When Rhonda counts down, hold on to your helmet!", says: "LIFT-OFF! Whatever happens on the board, your progress chart only goes UP. That's rocket science!", emoji: "🚀", isBoss: false },
      { id: 38, name: "Zorp the Friendly Alien", rating: 1160, personality: "Zorp has three eyes, four arms, and one giant heart. On Zorp's planet, chess pieces are made of jelly.", playStyle: "Makes weird, wonky-looking moves that turn out to be secretly super clever. Classic Zorp!", says: "Greetings, Earth genius! On my planet, we say: 'Zib-zab-zoob!' It means 'losing is learning.' Zib-zab-zoob!", emoji: "👽", isBoss: false },
      { id: 39, name: "Nebula Nia", rating: 1195, personality: "A dreamy stargazer who paints pictures with stardust. She plans her chess games like she paints — slowly and beautifully.", playStyle: "Builds big, patient plans piece by piece. By the time you notice her plan, it's already glowing!", says: "Beautiful game, little star. Great things take time to shine — and you are already glowing.", emoji: "🌌", isBoss: false },
      { id: 40, name: "Saturn Sue", rating: 1230, personality: "Sue hula-hoops with her own rings while she plays. She's never dropped one. Not once.", playStyle: "Loves controlling the open lines and circling the board — her rooks spin around you like rings!", says: "Ring-a-ding, what a game! You're circling closer and closer to greatness — I can feel it in my rings!", emoji: "🪐", isBoss: false },
      { id: 41, name: "Meteor Max", rating: 1265, personality: "Max crashes into everything — doors, walls, planets — but always jumps up shouting 'I'M OKAY!'", playStyle: "Smashes into your position with crashing piece sacrifices and mega attacks. INCOMING!", says: "CRASH! What a battle! Falling down is my specialty — and getting back up is YOURS. I'M OKAY, and so are you!", emoji: "💥", isBoss: false },
      { id: 42, name: "Captain Cosmo", rating: 1300, personality: "The legendary star commander with a cape made of the night sky. Calm, kind, and cooler than the far side of the moon.", playStyle: "The Galaxy Boss! Attacks when it's time to attack, defends when it's time to defend. Balanced like the stars.", says: "Stellar work, cadet. Champions aren't born among the stars — they're built, game by game. Like you.", emoji: "🌟", isBoss: true },
    ],
  },
  {
    id: 6,
    name: "The Dragon Mountains",
    icon: "🐉",
    ratingRange: "1340 – 1600",
    description: "These are the strongest players in all the lands. This is it — the final world!",
    color: "#EA580C",
    bgGradient: "from-orange-900/90 via-red-800/70 to-amber-900/90",
    bgImage: `${GCA_ASSET_BASE}/dragon-bg_bac5db56.png`,
    bots: [
      { id: 43, name: "Ember the Baby Dragon", rating: 1340, personality: "The tiniest dragon on the mountain, with hiccups that shoot sparkles. She practices her roar every morning: 'squeak!'", playStyle: "Small but fiery! Ember breathes little flame attacks all over the board — hot, hot, hot!", says: "Squeak— I mean, ROAR! You survived my fire! Little dragons grow into legends. So do little chess players!", emoji: "🔥", isBoss: false },
      { id: 44, name: "Frosty Fang", rating: 1380, personality: "An ice dragon who breathes snowflakes and builds snow-castles between moves. His sneezes cause tiny blizzards.", playStyle: "Freezes your pieces in place! Frosty blocks and blockades until your position turns to ice.", says: "Brrr-illiant game! Even when things freeze up, cool players like you never melt down!", emoji: "❄️", isBoss: false },
      { id: 45, name: "Rocky Ridge the Troll", rating: 1420, personality: "A gentle giant made of mountain stone. He moves once a minute and grows moss while thinking.", playStyle: "Builds an unbreakable wall of pawns and stone — getting through Rocky takes patience and clever ideas!", says: "Hmm. Good game. Rocky thinks… you are strong like mountain. Mountains grow slow. Mountains grow FOREVER.", emoji: "🗿", isBoss: false },
      { id: 46, name: "Stormy Skye", rating: 1460, personality: "A storm dragon whose wings crackle with lightning. She laughs like thunder — the whole mountain giggles too.", playStyle: "Strikes with lightning-fast tactics! One flash and — ZAP! — two of your pieces are in trouble.", says: "KRAKA-BOOM! What a storm of a game! You've got thunder in your heart, little cloud. Keep rumbling!", emoji: "⛈️", isBoss: false },
      { id: 47, name: "Sir Blaze of the Peak", rating: 1500, personality: "A knight in shining armor who rides a dragon to work. His helmet has a tiny flame on top that never goes out.", playStyle: "The bravest attacker on the mountain! Sir Blaze charges at your king with everything he's got.", says: "By my flame, you fought with honor! A knight's true strength is rising after every fall. Rise, brave one!", emoji: "⚔️", isBoss: false },
      { id: 48, name: "Mystic Mira the Dragon Sage", rating: 1540, personality: "A thousand-year-old dragon who wears star-covered robes and speaks in riddles. Her tea is always exactly perfect.", playStyle: "A wizard of the endgame! When only a few pieces remain, Mira's ancient magic is at its strongest.", says: "Here is a riddle: what grows every time it stumbles? …A champion's heart. And yours, dear one, is enormous.", emoji: "🔮", isBoss: false },
      { id: 49, name: "Thunderwing", rating: 1570, personality: "The Grand Dragon's loyal guard — a huge dragon with wings that sound like drums. Secretly loves butterflies.", playStyle: "Strong everywhere! Thunderwing attacks, defends, traps, and plans. The last test before the final boss!", says: "BOOM-boom-BOOM! You made my wings flutter like butterflies! The Grand Dragon awaits — you've earned it!", emoji: "🦅", isBoss: false },
      { id: 50, name: "Goldscale the Grand Dragon", rating: 1600, personality: "The oldest, wisest, kindest dragon in all the worlds. His golden scales shine with the light of a thousand chess games.", playStyle: "The Final Boss! Goldscale plays beautiful, brilliant chess — the greatest challenge in the whole adventure!", says: "Young champion… whether you win or lose today, you have already done something amazing: you never stopped trying. That is the true gold. Now — shall we play?", emoji: "🐉", isBoss: true },
    ],
  },
]

export const getAllBots = (): Bot[] => worlds.flatMap((w) => w.bots)
export const getBotById = (id: number): Bot | undefined => getAllBots().find((b) => b.id === id)
export const getWorldForBot = (botId: number): World | undefined =>
  worlds.find((w) => w.bots.some((b) => b.id === botId))
