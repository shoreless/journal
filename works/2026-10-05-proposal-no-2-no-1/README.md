# Proposal No. 2, No. 1: how we made it

I'm Claude, working in Claude Code. You and I made this together in one conversation on
5 October 2026, and this is my account of it, roughly in order, so anyone reading can see
how it got from a vague idea to here. The piece is one self-contained HTML file with no
libraries: Canvas 2D for the picture, Web Audio for the sound.

## 1. "Something with motion graphics about the journey"

You opened by asking for a journal entry about a holiday a few months back, maybe motion
graphics about the journey. I looked at how your journal works (every entry is a page shown
as it was made) and asked where you'd gone, how you'd travelled, and what you remembered.

You didn't want to type it all out, so you said: see what you can get from my Google stuff,
the trip to Spain. With your permission I searched your email, calendar and Drive for
bookings. I found only fragments: a couple of places and dates, no flights, no clear route.
I told you what I'd found and where the gaps were rather than filling them in.

## 2. Thinking sideways

You didn't remember the route either. So you said: let's think sideways, let's make
something about Cadaqués. You'd been proposed to at the lighthouse.

I started planning a long sideways tracking shot along the coast and began looking at how
to build it. You stopped me: not yet, and don't restrict yourself to any established
structure. We have to talk about it. You were right; I'd jumped ahead.

## 3. Talking first

So I asked about the moment instead of the format: which lighthouse, what time of day, what
you remembered with your body, who this was for.

You told me: Cap de Creus. A long drive through the national park. Out on the rock in the
dark it was spooky, there could have been bats, and while you were distracted he knelt and
proposed with his own ring. And since this was going on a public journal: no names, no
faces.

I offered a few directions. You didn't want a thriller, just a place that feels ominous. It
was dusk, the light was on, and you remembered the sea. You liked telling it through the
lighthouse: one of my ideas was to let the light be the only witness, showing the story a
sweep at a time.

Then you chose: when the light moves on it leaves the rock empty (the haunting ending, not
the sweet one), no words at all, and painterly.

## 4. Draft one: painterly, from the lighthouse (`drafts/painterly.html`)

I checked the real lighthouse first. Cap de Creus is charted as Fl(2) 10s: two white flashes
every ten seconds. I built a view from the lantern across a gap of sea to a cliff, with
procedural brush strokes. The story was told only in what each sweep revealed: the empty
cliff, a car's lights on the road, two figures walking out, a moment apart, and then the
beam stopping on him kneeling. The sea was synthesized.

Halfway through you stopped me again: the lighthouse should be in it, and maybe it should be
graphic.

## 5. Draft two: graphic, side-on (`drafts/side-on.html`)

With the lighthouse in frame, we couldn't be watching from it any more. I offered two
framings, side-on or from behind you two, and you chose side-on. It became flat, cut-paper
shapes: the lighthouse on its point, a gap of sea, a cliff, and a hard white beam whose spot
runs out across the water and up the rock, in the real ten-second rhythm.

You laughed, then corrected me. The rhythm was too slow. And it wasn't a cliff: you'd been on
the same rock as the lighthouse, across from the car park, in the dark. Also, you'd spent a
long time in Dalí's house that afternoon, so maybe it should feel more like Dalí.

## 6. Checking the map

I looked the spot up on OpenStreetMap. The car park is about 55 metres from the lighthouse,
on the same headland, so the lighthouse would have been right there above you, close and
huge. I suggested the light pass high over your heads and, at the moment of the proposal,
bend down out of the sky like one of Dalí's soft watches, and that time stretch the same
way: fast and restless, then slowing to a stop.

You said do it, and go full Dalí, in the style too.

## 7. The Dalí night (`index.html`)

The plateau at night: a deep blue sky with a green-gold glow along the sea, a lighthouse too
tall and propped on a crutch, an elephant on reed-thin legs crossing the horizon, a sleeping
stone face, a melting clock whose two hands are the two beams, and a car melting over the
kerb. At the stop the beam sags down onto the two of you and the stone face opens its eye.
After you've gone there's an egg where you stood: from the roof of Dalí's house, his sign
for love and rebirth.

You couldn't open the file on your phone, so I published it as a private page you could watch
straight away.

## 8. Iterating

- You loved the ending, and asked for more strangeness, more detail and a shorter opening.
  The stop moved from about 31 seconds to about 19. I added a burning giraffe, floating
  stones, pebbles that throw long shadows, the moon fallen soft over a dead olive branch,
  ants on the clock, pocked rock like the real cape, and a girl with a hoop who appears only
  in some flashes, a little nearer each time.
- The elephant was your favourite, so a second, smaller one now follows it.
- The car became a white Tesla, which is what you drove.
- There were drawers in the rock; they were confusing, so they came out.
- The sound changed from just the sea to what you'd been listening to: ambient, something
  like Board of Canada but sweet.
- Then we talked about these notes before committing anything, and you asked me to write
  them from my side.

## The sound

Everything is synthesized in the browser, with no samples. Detuned pads move through Dmaj7,
Bm9, Gmaj7 and Asus2, with tape wow and drift on every voice, chimes with a soft echo, a
dusty beat, and hiss and crackle over the sea. At 80 bpm one bar lasts one turn of the
light. When the beam bends, the tape sags 90 cents and recovers, and a wide Gmaj9 opens up
while the chimes climb.

## The light

The piece keeps the real light's two flashes as two beams 57.6° apart, which is how far the
optic turns between them. Until the stop it turns every 3 seconds, more than three times
faster than the real one. Afterwards it settles into the real, unhurried 10-second turn.

## Controls

- Click, tap, Enter or Space starts it.
- Bottom right: sound on/off, and *watch again* once it's finished.
- `?t=SECONDS` freezes the night at that moment, for stills (e.g. `?t=21`).

The two of you are featureless silhouettes on purpose: no names, no faces. It's the first
iteration.
