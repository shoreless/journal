ABYSS — Giant Squid in Three.js

Run locally:
  cd dist
  python3 -m http.server 8000
Then open http://localhost:8000 in a browser.

Three.js is bundled locally. Google Fonts are optional.
Drag to orbit; scroll or pinch to zoom. Use the depth slider, exploration light, pause, sound, and reset controls.

Verified in Chromium on desktop and mobile viewport sizes.

Anatomy revision: small posterior fins, lateral eyes, ventral funnel, recessed beak, differentiated arms and feeding clubs, oral sucker rows and locking structures. Field notes contain anatomy and depth-light references.
ROV light starts on; switch it off for natural deep-water darkness. Inspect anatomy zooms in; Reset restores the overview. See ANATOMY.md for modeling limits.

Beak close-up: select Beak close-up under the specimen name. The scene pauses for inspection. Use Jaw opening to examine the separate upper and lower shells; Back or Reset returns to the squid and restores prior playback. Skin microrelief, buccal folds, recessed cups, and schematic toothed sucker rims are included.

Island detour: start underwater and tap the squid three times. Only short stationary single-pointer taps that hit the squid count; background taps, drags, and multitouch gestures reset progress. There is a seven-second allowance between taps. A warm transition reveals giant glazed ikayaki in an illustrated Okinawa-inspired beach BBQ. Back to the deep restores the underwater view and the previous submersible position. Keyboard users can focus the canvas and press Enter or Space three times.

Mobile compatibility: startup tries a lightweight WebGL2 context, then automatically uses an animated illustrated view if graphics support is unavailable. Context loss also switches to illustrated mode. Add ?view=illustrated to the URL to select it directly. The illustrated view retains three-tap transformation, return, lighting, depth, pause, sound, notes, and a still beak close-up; orbit and interactive jaw inspection require 3D. Images are rendered from this same scene.

Compatibility verified using Chromium mobile touch emulation with WebGL disabled, plus ordinary WebGL startup and forced context loss.

Submersible POV: every visit opens in the normal underwater view, including older ?pov=sub links. Select Board submersible to enter the cockpit. Add ?view=illustrated to bypass WebGL. Drag the viewport to look; hold the arrow buttons to move sideways or vertically and Approach / Back away to travel. Desktop W/S, A/D and Q/E also operate thrusters; Escape exits. Observation buttons frame the whole animal, eye, mantle, and arms. The ROV lamp follows the camera. Reset returns to the observation position. Illustrated mode pans and zooms higher-resolution scene renders and labels its view scale instead of a simulated range. Three taps still lead to the island BBQ and leave the cockpit.

The BBQ is illustrated in every rendering mode. Only the underwater scene uses Three.js; its rendering pauses during the detour and resumes on return. No second 3D scene, camera, shadow maps, or beach controls are created.
