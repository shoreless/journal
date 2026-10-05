# Abyss

An interactive Three.js descent into an imagined Mariana Trench: bioluminescent life, maritime cosmic horror, a submarine, and an unexplained door on the ocean floor.

This README summarizes the project's development conversation and the resulting design. It contains project decisions only; personal conversation details, account information, deployment identifiers, and private hosting configuration are omitted.

## Run locally

Requirements: Node.js with npm, and Python 3 for the included preview server.

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:4173`. The included `dist/` folder is already built, so `npm start` alone is enough to view the packaged version. Serve it over HTTP rather than opening the HTML directly from disk.

```sh
npm test
npm run check
```

`npm test` runs the included geometry, animation, depth, guidance, and distant-light behavior tests. `npm run check` checks the bundled JavaScript syntax. Rebuild after editing JavaScript source. HTML and CSS live directly in `dist/`.

## How the idea developed

1. **A bioluminescent deep ocean.** The starting idea was a Three.js scene imagining the Mariana Trench, with life and atmosphere revealed through bioluminescence.

2. **Deep-sea magical realism.** The creatures should feel grounded in marine biology while allowing imaginative departures. Translucent tissues, jointed limbs, slow movement, and chemical light became the foundation.

3. **Free movement on mobile.** Exploration expanded into unrestricted three-dimensional swimming. Two thumbsticks handle movement and looking. Keyboard movement and mouse dragging provide desktop equivalents. Input cleanup handles releases, interruptions, resizing, and open panels.

4. **More ambiguous cosmic horror.** Recognizable jellyfish became stranger folded veils, with broken symmetry, branching filaments, shadowed interiors, and slowly coordinated light. The intent was suggestion rather than a literal monster catalogue.

5. **Unsettling benthic life.** The floor gained armored crawlers and siltmouths, drawing on anglerfish lures, jointed anatomy, teeth, and tactile filaments. Procedural color, bump, and roughness maps made creatures and surroundings less uniform.

6. **Two different large presences.** The large shape in the water column became an ominous, unmarked military submarine. The ancient, ambiguous organism on the floor remained a separate presence.

7. **A door without a wall.** An ordinary-looking door appeared on the ocean floor. Knocking elicits three light pulses before it opens onto a dark, star-flecked interior. A closed door blocks passage.

8. **An impossible interior.** Maritime cosmic horror, including the story *The Temple*, informed the next step: entering the door leads into a dry submarine compartment. The interior is deliberately inexplicable rather than fully explained.

9. **A recovered journal.** A lamp-lit desk holds three original fictional journal entries and a generated triptych of archival-style illustrations. The artwork also appears on the book in the 3D scene. Reading pauses navigation; the visitor can return to the ocean.

10. **A more distinctive interface.** The initial website presentation shifted toward old expedition instruments, letterpress type, paper documents, tarnished brass, and mechanical switches. This was then pared back to preserve mystery: the title plaque and introductory prose were removed, labels shortened, and narrative overlays reduced.

11. **A minimal opening.** The opening screen shows only the ocean and a centered **Descend** button. An influence from *Return of the Obra Dinn* led toward stark serif lettering and double outlines. The final button has pale lettering and outlines on a transparent background, with no fill. Other controls appear after entry.

12. **One connected descent.** Sinking from the water column now leads continuously to the floor; swimming upward returns to the water column. The distance is compressed for exploration, while the instruments display illustrative deep-ocean readings. The chart remains a shortcut between stations.

13. **Fewer movement buttons.** Separate Rise and Sink buttons were removed. On touch screens, look down and swim forward to descend, or look up and swim forward to ascend. Keyboard E and Q remain available.

14. **Transparent content panels.** The chart and Field notes content became transparent with pale text. Their original dark trigger buttons were retained. Controls behind an open panel recede to avoid overlapping its text, while the ocean remains visible.

15. **Subtle guidance.** A loose trail of bioluminescent motes connects the water column, floor, and door. Slow pulses suggest direction, with a warmer tint near the threshold. It is part of the environment rather than an arrow or additional label, and responds to the Light and Motion controls.

16. **Riftia and body horror.** Two imagined vent colonies introduced tube-worm forms. These evolved from pale tubes and red plumes into crooked, irregular tubes, swollen fleshy collars, and asymmetric, veined gill membranes that ripple and contract. Their red plumes reflect nearby light rather than producing their own bioluminescence. The exaggerated anatomy is intentional fiction.

17. **Pinch and scroll zoom.** Pinching on the scene and scrolling change camera magnification smoothly without moving the swimmer. The zoom range is 0.65×–2.5×. Thumbsticks remain independent, open panels suspend scene gestures, and Reset restores the normal view.

18. **Hunters in the passage.** Anglerfish- and gulper-eel-inspired forms gained recessed jaws, uneven teeth, vestigial eyes, mottled tissues, ragged fins, and sparse photophores. They were then moved out of the opening view and staggered along the descent between the water column and trench floor.

19. **A living, restless floor.** Crawlers now follow small foraging circuits with smooth starts, listening pauses, articulated steps that follow the terrain, and flexing plates. Siltmouths undulate and probe with their filaments; disturbed sediment drifts behind moving animals. Veils breathe and drift more visibly, while marine snow follows gentle currents. Motion still pauses the living scene.

20. **Distant lights.** Uneven groups of faint, warm and cool pinpoints occupy several depths. They echo the swimmer's translation after a short delay, fade on approach, and remain dark for a while after the swimmer retreats. They have no revealed body and add no interface labels.

21. **Review and handoff.** Visual changes were reviewed through desktop and mobile screenshots before testing and deployment were authorized. The source handoff includes this anonymous design history, local setup instructions, assets, and portable checks.

22. **Visible locomotion.** Fish now swim sustained circuits through the passage and face their direction of travel. Eel spines follow the route their heads took, with traveling tail waves; angler fins and tails propel a moving body. Crawlies move sooner and faster, with brief pauses and feet that stay planted during each stance. The creature clock is separated from the navigation timestep so ordinary low frame rates do not slow the living scene.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Begin | Descend | Descend |
| Move | W A S D | Left thumbstick |
| Look | Drag or arrow keys | Right thumbstick; one-finger drag on the scene |
| Ascend / descend | Look up/down and move forward, or E / Q | Look up/down and push the movement stick forward |
| Move faster | Shift | — |
| Zoom | Scroll up/down | Spread/pinch two fingers on the scene |
| Reset position and zoom | Reset | Reset |
| Choose a station | Chart | Chart |
| Pause living motion | Motion switch or Space | Motion switch |
| Adjust illumination | Light slider | Light slider |
| Enable ambient sound | Sound switch | Sound switch |

Near the door, use **Knock**, then **Enter**, or swim through the open doorway. Inside, approach the desk to read the journal. Use **Return** or walk back through the entrance to leave. Escape closes an open chart or dialog; otherwise it exits exploration or returns from the compartment. Double-click or double-tap the water to leave a glimmer.

## Source layout

| File or folder | Purpose |
| --- | --- |
| `scene.js` | Scene setup, rendering, environment, and interface integration |
| `navigation.js` | Swimming, walking, keyboard, thumbsticks, dragging, and zoom |
| `ocean-depth.js` | Compressed vertical journey and illustrative depth mapping |
| `creatures.js` | Translucent veils and the ancient floor presence |
| `benthos.js` | Crawlers, siltmouths, foraging routes, articulated gait, and sediment |
| `pelagic.js` | Anglerfish- and eel-inspired hunters in the descent |
| `distant-lights.js` | Delayed movement echoes and proximity-sensitive lights |
| `riftia.js` | Tube-worm colonies, tissue geometry, and animation |
| `guidance.js` | The faint environmental path |
| `textures.js` | Procedural material maps |
| `submarine.js` | The exterior submarine |
| `threshold.js` | Door, knock response, opening, and collision |
| `cabin.js` | Submarine interior and desk |
| `journal.js` | Fictional entries and reader behavior |
| `dist/` | Ready-to-serve site, bundled code, fonts, and journal artwork |
| `tests/` | Portable automated tests |

## Art, biology, and technical notes

- This is an imagined environment, not a scientific reconstruction of Challenger Deep. Creature anatomy, the vent colonies, and the door/interior are fictional. No documented Riftia population at Challenger Deep is claimed.
- The visual priority is quiet unease: darkness, restrained illumination, ambiguity, and minimal explanatory UI.
- Three.js 0.180.0 is bundled using esbuild. The interface uses native HTML/CSS, with local IM Fell English fonts and locally stored journal artwork.
- Required third-party copyright and license notices are retained, including `dist/assets/fonts/OFL.txt` and notices in the bundle. These are dependency credits, not information about the project's participants.
- The source archive excludes Git history, credentials, account/site configuration, deployment URLs and identifiers, local preview scripts, and installed dependencies. Nonvisual provenance metadata was removed from the exported illustration; the working original was retained separately.
- Development checks covered desktop and emulated touch input, scene transitions, door and journal interactions, shader compilation, geometry validity, pause/light behavior, and zoom/gesture cleanup. The portable tests are included; environment-specific browser automation is not. Physical-device performance has not been measured.
- Future visual changes should preserve the minimal opening, transparent content panels, optional sound, and the distinction between plausible biological cues and deliberate horror.
