# Matchday polish — 0.7.3

## Goal

Make the completed 2.5D football scene feel like a short sports broadcast without changing the server result, database schema or email-turn rules.

## Timing

The normalized replay timeline now separates ready, anticipation, goalkeeper takeoff, strike, contact, result reveal and settling. A normal replay lasts about 4.8 seconds; reduced-motion mode uses a shorter presentation.

## Sound

`shootout-audio.mjs` creates small Web Audio cues in the browser. No MP3, WAV or third-party sound file is downloaded. The sound button stores its preference locally. Replay links use an explicit **Play penalty** button because browsers require a user gesture before audible playback.

## Outcome presentation

- Goal: net impact, crowd lift, gold result chord, confetti and raised striker arms.
- Save: glove impact, blue result chord, keeper glove celebration and cool-coloured particles.
- Miss: softer impact/whoosh, descending cue, miss banner and disappointed striker pose.

## Invariants

- The server remains authoritative for goal, save and miss.
- Audio and celebrations only present the stored replay object.
- Gmail delivery, Supabase state, signed tokens and the allowlist are unchanged.
- Reduced-motion mode limits particle counts and shortens the animation.
