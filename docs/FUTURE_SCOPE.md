## Future Scope Ideas

- **Adaptive puzzle difficulty by student performance**  
  - Introduce a separate **puzzle rating** per student (distinct from game rating).  
  - After each puzzle attempt, update puzzle rating based on success/failure and time taken, similar to Lichess/Chess.com.  
  - Use this puzzle rating to automatically select the **next puzzle** so that difficulty gradually increases (or decreases) to match the student’s current tactical strength.  
  - Define clear bands (e.g., Beginner/Intermediate/Advanced/Expert) that map to puzzle rating ranges, and allow students to move between bands as their puzzle rating improves.  
  - Avoid sending students back to a static puzzle list; keep them in a continuous training flow within the right band.

- **Glicko‑2 rating system for players (and puzzles)**  
  - Adopt a **Glicko‑2–based rating system** for students’ puzzle performance (and later for games), tracking rating, rating deviation (RD), and volatility.  
  - Start by using Glicko‑2 to rate **players only**, with puzzles grouped into difficulty bands, and later consider also rating individual puzzles.  
  - Use the Glicko‑2 rating to drive **fair matchmaking** in puzzle races, show more meaningful progress to students/parents/coaches, and improve adaptive puzzle selection.  
  - Keep the implementation compatible with popular systems (e.g., Lichess) so ratings feel familiar and can potentially be compared or explained using well‑known benchmarks.  

