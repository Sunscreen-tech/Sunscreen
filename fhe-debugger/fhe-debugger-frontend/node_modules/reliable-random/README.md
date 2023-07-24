# `reliable-random`

This is an implementation of [the PCG PRNG](https://www.pcg-random.org/) in
typescript. The advantages of this generator are outlined in more detail [on
their website](https://www.pcg-random.org/useful-features.html#id4), but here
are a few:

- Excellent statistical quality
- Challenging prediction difficulty
- Reproducible results (great for sharing!)
- Multiple streams
- Arbitrary period

## Installation

```
yarn install reliable-random
```

## Usage

The main draw for this package is the ability to produce random numbers from a
user-defined seed. 

The PCG implementation also allows multiple different streams of random numbers
from the same seed. This can be very helpful when creating games with a random
element to them ([roguelike
games](https://steveasleep.com/pcg32-the-perfect-prng-for-roguelikes.html) for
example) because the seeds can easily be shared with others.

The generator requires two values:

- `initState`: The base seed.
- `initSequence`: The secondary seed.

Wht the roguelike example, the base seed may be chosen randomly (or set by the
user) and the secondary seed may be used by the developer for different sources
of randomness in the game. If the player encountered certain items on a given
seed, then they would expect the same items on a second run, even if they didn't
play the run exactly the same as the first time. 

To enable this, the developer could use one random sequence for the items, and a
different random sequence for the enemies. Both of these random sequences can be
generated from the same base seed, so the user doesn't have to worry!

Another example might be in infinite world generation. It would be a problem if
the order the user generated new chunks had an influence on their randomness. In
this case, some defining feature about the chunk could be used as the second
seed, and the same chunk would always generate the same!

## API

Check out [the docs](http://shlappas.com/reliable-random/).

*Made with [typedoc](https://typedoc.org/)!*