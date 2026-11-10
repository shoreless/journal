# A Wall in a Forest: how it was made

I'm Claude, working in Claude Code. You asked for an entry about a dream you had as a child:
you wanted to be reincarnated as a wall in a forest. You pointed me at mrdoob's
[Codevember 2026 / 05 / Moss](https://github.com/mrdoob/codevember-2026/tree/main/05) for
inspiration. This is the first version, made in one sitting on 10 November 2026, and I made
it without stopping to ask you anything, so everything below that isn't your one sentence is
my guess at it.

## What I took from Moss

Moss is a mossy rock lifting out of a clearing, with fireflies, and nothing in it is a
picture: every leaf, stone and tree is computed. I kept that rule (there are no images or
models here either), the wooded clearing, the fireflies, and the lens that keeps a short
stretch sharp and lets the rest go soft. I read its README and source for how it was put
together; none of its code is in here.

Where it differs: Moss needs WebGPU and models every moss leaf as geometry. This runs on
plain WebGL so it opens on more machines, and the moss is drawn a cheaper way (below).

## The idea

A wall can't do anything. So the piece gives you nothing to do. You sit at the near end of a
drystone wall and look down your own length into the trees.

While you move the pointer, you are in the present and almost nothing changes. When you hold
still, time lets go: first a day goes by in about twenty seconds, with a night of fireflies
in it. Then the days blur into one long afternoon and a year passes in under a minute:
leaf fall, snow, thaw, ferns. Keep still for a few minutes and it is decades. Moss takes the
cap stones and then the faces. The young trees thicken, new ones come up, ferns arrive at
your foot, and three of your stones fall off, one at a time, years apart. A small line in the
corner counts how long you have been a wall.

Move, and you drop back into whatever moment you were passing: it might be a snowy noon or
the middle of a summer night.

There is sound if you turn it on (bottom right): wind, birds by day, crickets on summer
nights. It's synthesised in the browser, not recorded.

## How it works

Plain JavaScript modules and one library, three.js r170, kept in `vendor/` so the page needs
no network.

- `wall.js` lays about a thousand stones in five courses with cap stones on top, following the
  ground, with one slumped gap. Each stone is a rounded box, lumped with noise, with a few
  corners knocked off. The moss is "shell" fur: the nearest stones are drawn again up to
  16 times, each copy pushed a little further out, keeping only the pixels that fall inside
  a strand. One function decides where moss has taken hold, and both the stone and the fur
  ask it, so they agree as it spreads.
- `forest.js` makes the ground, about 250 trees and shrubs, their leaves, the ferns and the
  leaf litter. Leaves are real geometry overhead, so the dappled light on the wall is their
  actual shadow, and it thins out when they fall.
- `time.js` is the clock and the weather: three numbers (how many years, time of year, time
  of day) become sun, fog, snow, leaf colour and everything else.
- `air.js` is the sky, light shafts, dust, falling leaves, snow and fireflies.
- `post.js` is the lens and the final colour. `sound.js` is the sound. `land.js` and
  `noise.js` are shared helpers.

## What I checked and what I couldn't

I rendered it in a headless browser across mornings, nights, all four seasons and from year
0 to year 80, in landscape and phone-portrait, and ran five simulated minutes of stillness
to check the clock, the counter and the falling stones. No errors.

Two things I could not check from where I work:

- **Speed on a real graphics card.** I only had a software renderer. At full quality this
  draws around three million triangles a frame. The page measures itself for the first few
  seconds and steps down (fewer moss layers, lower resolution, then no lens blur) if it is
  struggling, and phones start one step down. I have not seen that happen on real hardware.
- **The sound.** The code runs without errors, but I can't hear it. It may need tuning.

## Poking at it

Add to the address: `?y=40&p=.8&d=.5` freezes it at year 40, late October, noon (`p` is the
time of year from 0 to 1 starting in January, `d` the time of day from 0 to 1 starting at
midnight). `?q=low` forces the lightest settings. In the console, `wall.at(y, p, d)` and
`wall.release()` do the same while it runs.

## Credits

- Inspiration: [Codevember 2026 / 05 / Moss](https://mrdoob.github.io/codevember-2026/05/) by mrdoob.
- [three.js](https://threejs.org) r170, MIT licence (`vendor/THREE-LICENSE.txt`).
