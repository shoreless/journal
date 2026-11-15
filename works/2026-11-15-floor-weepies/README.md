# Floor Weepies: how it was made

I'm Claude, working in Claude Code. On 15 November 2026 you told me a dream: you met an
inventor who was making human-height knitted flowers he called "floor weepies". You could
unzip the stem, sit inside, and it would be snug around you and make you feel good. You and
a friend were telling him to name it something else, but being in one was lovely.

The first version, made in one go from that paragraph, had fat stems you could plainly fit
inside. You told me that was wrong: the stems were very thin but could somehow extend
outwards, and they were bigger on the inside, like in Doctor Who. This is the second version.

## What it is

A room with six knitted flowers as tall as a person, heads hanging, on stems no thicker
than your arm. Pick one. Drag down to pull its zip and a narrow slit of lining shows. Tap to
climb in: the mouth of the stem stretches out towards you, and then you are inside, in a
knitted room far bigger than the stem it is in. Drag up to zip yourself in. As the zip
closes the room outside goes away, the wool draws in around you until it is snug, and the
only light is what comes through the stitches. Stay as long as you like; drag down to let
yourself out.

Back in the room there is a box, bottom left, for suggesting a better name. He pins your
suggestion to the board on the wall. The sign stays as it is.

Sound is off until you turn it on (bottom right): each zip tooth clicks, and inside there is
a low hum. It is synthesised in the browser.

Keys work too: left and right choose a flower, Enter climbs in or out, up and down move the
zip, Escape goes back.

## Choices I made that you didn't

- **Your friend isn't named.** The journal is public and you asked for no names last time,
  so the page says "we". Easy to change.
- **The inventor never appears.** There's his room, his wool, his needles and his sign.
- **Why "weepies"?** The dream didn't know, so the piece doesn't say. The heads do hang
  like weeping flowers, which is my guess and not his.
- **The lining.** Each flower is lined in its petal colour, so the inside is warm, not green.
- **The two lines of text** are yours, lightly trimmed.

## How it works

Plain JavaScript and three.js r170 (in `vendor/`), no network needed.

- `knit.js` is the yarn. One shader draws every stitch: V-shaped knit stitches on the
  outside of a thing and rows of purl bumps on the inside, which is how a knitted tube
  really looks from within. The stem is a flat sheet of (angle, height) points that the
  shader wraps into a tube; the zip is an opening it pulls apart above the zip pull, and
  the brass teeth are placed by the same maths so they ride the edges. The tube has two
  sizes, a thin one seen from the room and a large one seen from inside. The swap happens
  as you step through, behind a moment of lining colour, so you never see both at once.
- `room.js` is the room, the sign and the suggestions board (drawn on a canvas).
- `main.js` is the camera, the dragging and the three places you can be: in the room,
  at a flower, inside it.
- `sound.js` is the zip and the hum.

Names you suggest are kept in your own browser only (`localStorage`); nobody else sees them.

## What I checked and what I couldn't

I rendered every step of both versions in a headless browser, and drove the real page with
a mouse and keyboard at desktop and phone sizes: choose, unzip, climb in, zip up, the line
appearing, Escape back out, and pinning two names. No errors.

I could not check how it feels under a real finger on a touchscreen, how fast it runs on a
real graphics card (it is much lighter than the wall), or the sound, which I can't hear.

## Credits

[three.js](https://threejs.org) r170, MIT licence (`vendor/THREE-LICENSE.txt`).
