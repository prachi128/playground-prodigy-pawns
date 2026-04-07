import { useMemo, useState } from "react"
import type { PuzzleData } from "./types"

type MovePos = [number, number]

export function useNeonChessPuzzle(puzzle: PuzzleData | null) {
  const [board, setBoard] = useState(() => puzzle?.board.map((row) => [...row]) ?? [])
  const [selected, setSelected] = useState<MovePos | null>(null)
  const [status, setStatus] = useState("Select a piece to move")
  const [solved, setSolved] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const [hintActive, setHintActive] = useState(false)

  const validMoves = useMemo(() => {
    if (!puzzle || !selected) return [] as MovePos[]
    const [r, c] = selected
    if (puzzle.sol.fr[0] === r && puzzle.sol.fr[1] === c) return [puzzle.sol.to]
    return [] as MovePos[]
  }, [puzzle, selected])

  function reset(nextPuzzle: PuzzleData | null) {
    setBoard(nextPuzzle?.board.map((row) => [...row]) ?? [])
    setSelected(null)
    setStatus("Select a piece to move")
    setSolved(false)
    setFailed(false)
    setAttemptsLeft(3)
    setHintActive(false)
  }

  function selectCell(r: number, c: number) {
    if (!puzzle || solved || failed) return
    if (!selected) {
      if (board[r]?.[c]) setSelected([r, c])
      return
    }

    const [sr, sc] = selected
    const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c)
    if (!isValid) {
      if (board[r]?.[c]) setSelected([r, c])
      else setSelected(null)
      return
    }

    const next = board.map((row) => [...row])
    const moving = next[sr][sc]
    next[sr][sc] = null
    next[r][c] = moving
    setBoard(next)
    setSelected(null)

    const ok =
      sr === puzzle.sol.fr[0] &&
      sc === puzzle.sol.fr[1] &&
      r === puzzle.sol.to[0] &&
      c === puzzle.sol.to[1]
    if (ok) {
      setSolved(true)
      setStatus(`Correct! ${puzzle.explain}`)
      return
    }

    const remaining = attemptsLeft - 1
    setAttemptsLeft(remaining)
    if (remaining <= 0) {
      setFailed(true)
      setStatus(`Out of tries. ${puzzle.explain}`)
      return
    }
    setStatus(`Wrong move. ${remaining} tries left.`)
    setBoard(puzzle.board.map((row) => [...row]))
  }

  function activateHint() {
    if (!puzzle || hintActive) return false
    setHintActive(true)
    setSelected([puzzle.hint[0], puzzle.hint[1]])
    setStatus("Hint active: move the highlighted piece.")
    return true
  }

  return {
    board,
    selected,
    validMoves,
    solved,
    failed,
    attemptsLeft,
    hintActive,
    status,
    reset,
    selectCell,
    activateHint,
  }
}
