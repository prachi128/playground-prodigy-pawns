import {
  GROUND,
  BRICK,
  QUESTION,
  QUESTION_USED,
  PIPE_LEFT,
  PIPE_RIGHT,
  PIPE_TOP_LEFT,
  PIPE_TOP_RIGHT,
} from "./constants"

export function isSolid(type: number) {
  return (
    type === GROUND ||
    type === BRICK ||
    type === QUESTION ||
    type === QUESTION_USED ||
    type === PIPE_LEFT ||
    type === PIPE_RIGHT ||
    type === PIPE_TOP_LEFT ||
    type === PIPE_TOP_RIGHT
  )
}
