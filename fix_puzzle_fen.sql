-- Fix the FEN positions for puzzles (these are valid tactical positions)

-- Beginner Fork: Knight can fork king and rook
UPDATE puzzles 
SET fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    moves = 'f3e5 c6e5'
WHERE title = 'Beginner Fork';

-- Back Rank Mate: Classic back rank mate pattern
UPDATE puzzles 
SET fen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    moves = 'd1d8'
WHERE title = 'Back Rank Mate';

-- Pin the Knight: Pin knight to king
UPDATE puzzles 
SET fen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3',
    moves = 'c4f7'
WHERE title = 'Pin the Knight';

-- Queen and Rook Mate: Coordination mate
UPDATE puzzles 
SET fen = '6k1/5ppp/8/8/8/8/Q4PPP/4R1K1 w - - 0 1',
    moves = 'a2a8 g8h7 e1e7'
WHERE title = 'Queen and Rook Mate';

-- Tactics Combination: Complex tactical sequence  
UPDATE puzzles 
SET fen = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
    moves = 'f3e5 d6e5 d1d8'
WHERE title = 'Tactics Combination';

-- Endgame Precision: Rook endgame
UPDATE puzzles 
SET fen = '8/5pk1/6p1/8/8/6P1/5PK1/3R4 w - - 0 1',
    moves = 'd1d7 f7f6'
WHERE title = 'Endgame Precision';

-- Smothered Mate: Knight delivers checkmate
UPDATE puzzles 
SET fen = '6rk/5Npp/8/8/8/8/5PPP/6K1 w - - 0 1',
    moves = 'f7h6'
WHERE title = 'Smothered Mate';
