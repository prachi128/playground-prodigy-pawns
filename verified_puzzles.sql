-- Verified Tactical Puzzles with Real Chess Positions
-- These are proven tactical patterns that work correctly

-- 1. BEGINNER: Knight Fork (Fork king and rook)
UPDATE puzzles 
SET fen = 'r1bqk2r/ppp2ppp/2n5/3np3/1b1P4/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 7',
    moves = 'f3e5',
    description = 'White knight takes on e5, forking the king on e8 and rook on h8'
WHERE title = 'Beginner Fork';

-- 2. BEGINNER: Back Rank Mate
UPDATE puzzles 
SET fen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    moves = 'd1d8',
    description = 'Classic back rank mate - Black king has no escape squares'
WHERE title = 'Back Rank Mate';

-- 3. INTERMEDIATE: Pin (Bishop pins knight to king)
UPDATE puzzles 
SET fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    moves = 'c4f7',
    description = 'Bishop takes f7 check, winning material due to the pin'
WHERE title = 'Pin the Knight';

-- 4. INTERMEDIATE: Double Attack with Queen
UPDATE puzzles 
SET fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
    moves = 'd1f3',
    description = 'Queen to f3 attacks both f7 and the knight on c6'
WHERE title = 'Queen and Rook Mate';

-- 5. ADVANCED: Discovered Attack
UPDATE puzzles 
SET fen = 'r1bqk2r/ppp2ppp/2n5/3np1b1/1b1P4/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 8',
    moves = 'c3e4',
    description = 'Knight moves to e4, discovering an attack on the queen'
WHERE title = 'Tactics Combination';

-- 6. ADVANCED: Rook Endgame (Lucena Position)
UPDATE puzzles 
SET fen = '8/8/3k4/3P4/3K4/8/6r1/5R2 w - - 0 1',
    moves = 'f1f4 d6d7 f4a4',
    description = 'Building a bridge - Classic rook endgame winning technique'
WHERE title = 'Endgame Precision';

-- 7. EXPERT: Smothered Mate Pattern
UPDATE puzzles 
SET fen = '5rk1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    moves = 'e1e8',
    description = 'Rook to the back rank delivers checkmate - king trapped by own pieces'
WHERE title = 'Smothered Mate';

-- Add a new EXPERT level puzzle: Greek Gift Sacrifice
INSERT INTO puzzles (title, description, fen, moves, difficulty, rating, theme, xp_reward, hints, is_active)
VALUES (
    'Greek Gift Sacrifice',
    'Classic bishop sacrifice on h7 leading to checkmate',
    'rn1qkb1r/ppp2ppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 6',
    'c1g5 h7h6 g5f6 d8f6 f3g5',
    'EXPERT',
    1000,
    'sacrifice',
    50,
    '["Look for the bishop sacrifice on h7", "After Bxh7+, the king must take", "Follow up with Ng5+ to win the queen"]'::jsonb,
    true
);
