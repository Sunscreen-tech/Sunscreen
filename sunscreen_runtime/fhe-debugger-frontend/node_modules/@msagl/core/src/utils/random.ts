// if max is an integer then returns random in the range [0, max-1]
import {Random} from 'reliable-random'
let generator: Random
export function randomInt(max: number): number {
  if (generator == null) {
    generator = new Random(0, 0)
  }

  return generator.randint(max)
}

export function initRandom(seed: number) {
  generator = new Random(seed, 0)
}

export function random(): number {
  if (generator == null) {
    generator = new Random(0, 0)
  }

  return generator.random()
}
