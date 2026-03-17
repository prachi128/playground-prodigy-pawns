## Future Scope Ideas

- **Adaptive puzzle difficulty by student performance**  
  - Introduce a separate **puzzle rating** per student (distinct from game rating).  
  - After each puzzle attempt, update puzzle rating based on success/failure and time taken, similar to Lichess/Chess.com.  
  - Use this puzzle rating to automatically select the **next puzzle** so that difficulty gradually increases (or decreases) to match the student's current tactical strength.  
  - Define clear bands (e.g., Beginner/Intermediate/Advanced/Expert) that map to puzzle rating ranges, and allow students to move between bands as their puzzle rating improves.  
  - Avoid sending students back to a static puzzle list; keep them in a continuous training flow within the right band.

- **Glicko‑2 rating system for players (and puzzles)**  
  - Adopt a **Glicko‑2–based rating system** for students' puzzle performance (and later for games), tracking rating, rating deviation (RD), and volatility.  
  - Start by using Glicko‑2 to rate **players only**, with puzzles grouped into difficulty bands, and later consider also rating individual puzzles.  
  - Use the Glicko‑2 rating to drive **fair matchmaking** in puzzle races, show more meaningful progress to students/parents/coaches, and improve adaptive puzzle selection.  
  - Keep the implementation compatible with popular systems (e.g., Lichess) so ratings feel familiar and can potentially be compared or explained using well‑known benchmarks.  

- **Richer online gameplay (inspired by chess.com / lichess)**  
  - **Time controls & formats**: support multiple presets beyond 10+0 (e.g., 3+0 blitz, 5+3 with increment, 15+10 rapid) and store per‑game time control in the model so ratings and stats can be split by speed category.  
  - **Variants & kid‑friendly modes**: optionally add fun variants like Chess960, "hand & brain" (coach calls the piece, student chooses the move), or odds games (extra time or material for beginners) that keep learning playful.  
  - **Matchmaking & rematches**: add quick‑pairing by rating band, "rematch" / "new opponent" buttons at game end, and short mini‑matches (best‑of‑3) so students can play short series instead of only one‑off games.  
  - **In‑game coaching overlays**: lightweight hints such as highlighting safe squares, warning on hanging pieces, or showing simple post‑game feedback ("this was the turning point move") without overwhelming the student.  
  - **Better endgame feedback**: distinguish checkmate, resignation, timeout, and aborted games in the result (with a `result_reason`), and show tailored, child‑friendly messages and confetti/animations for wins and good effort.  
  - **Spectating & coach tools**: let coaches spectate live student games, jump into a post‑game analysis board, and tag key moves with very simple annotations (e.g. "!" on good moves, "?" on blunders) to review in class.  
  - **Fair‑play and connectivity**: handle disconnects gracefully with short reconnection windows, classify very short games as "aborted" instead of rated, and later explore light‑weight engine checks to flag suspicious play.  
  - **Quests and achievements inside games**: tie in‑game actions to achievements and quests (e.g., "castle in 3 games", "win without hanging a piece"), turning standard games into a structured learning and rewards loop.

- **Real-time infrastructure (WebSockets and scaling)**  
  - **When to introduce WebSockets**: Polling (e.g. 1–2s for game state, 2–3s for invites) is sufficient for ~50 concurrent players. Introduce WebSockets when adding: live spectating, rich presence, or push notifications, or when scaling to hundreds of concurrent players for market launch.  
  - **Live spectating for coaches**: Coaches subscribe to a game channel; server pushes moves, clock updates, and game-over so coaches can watch student games in real time without polling.  
  - **Rich presence**: "Opponent is online/offline", "typing" or similar indicators; requires push (WebSockets or equivalent) so clients receive connect/disconnect/activity events.  
  - **Push-style notifications**: Replace polling for the bell and invite list with server-push events (e.g. "new notification", "invite accepted") so the UI updates instantly.  
  - **Scaling to hundreds of players**: When opening to the market, move hot paths (game updates, invites, notifications) to WebSockets to reduce DB/HTTP load and improve latency; keep REST for initial load and reconnection. Design APIs to be stateless and event-friendly so a WebSocket layer can be added without reworking game logic.
