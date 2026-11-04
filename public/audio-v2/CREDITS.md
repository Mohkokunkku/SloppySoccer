# Audio recordings and music credits

## Crowd recordings — attribution required (CC BY 4.0)
**“Free Crowd Cheering Sounds” by Gregor Quendel**, https://opengameart.org/content/free-crowd-cheering-sounds — https://www.gregorquendel.com
Licensed under **Creative Commons Attribution 4.0**, https://creativecommons.org/licenses/by/4.0/ .
- `crowd-shot.wav`: excerpt of “05 - Soft cheering - I”.
- `crowd-goal.wav`: excerpt of “04 - Strong cheering - II - Short”.
Changes: short excerpts, mono 24 kHz WAV conversion, loudness normalization, high/low-pass EQ and fades. Not endorsed by the original artist.

## Human voices — CC0
Kenney **Voiceover Pack**: https://kenney.nl/assets/voiceover-pack
CC0: https://creativecommons.org/publicdomain/zero/1.0/ .
- `voice-go.wav`: male `go.ogg`, recorded by **Jeffrey M. Smith**. Says **“Go!”**, not “Pass me”.
- `voice-yes.wav`: female `hurry_up.ogg`, recorded by **Giselle**. Says **“Hurry up!”**, not “Yes” or “Over here”. Filename is an internal historical cue name only.
Credits are from the original pack's `Credits.txt`. Changes: mono WAV resampling, normalization, EQ/fades. These are recorded human performances, not generated speech.

## Ball impact — CC0
`kick.wav`: Kenney **Impact Sounds**, `impactSoft_heavy_000.ogg`.
Source: https://kenney.nl/assets/impact-sounds . CC0: https://creativecommons.org/publicdomain/zero/1.0/ .
Changes: short excerpt, mono WAV resampling, normalization, EQ/fades. Recorded-style foley from the pack, not a sine-wave kick.

## Original goal music
`goal-music.wav`: original instrumental composed and synthesized for Sloppy Soccer by the project assistant. Two-bar 128 BPM D-major sting with syncopated bass, drums, harmonic brass-like stabs, rising lead and stereo room reflections. Approximately 4.35 seconds. No artist imitation, sampled commercial music, external music API, or cloned voice. This is synthesized instrumental music, not a claim of live human musicians.

All WAV files are local, bundled with the game and fetched from the same origin. No audio credentials or network speech service are required at runtime. `manifest.json` records measured durations, peak/RMS, byte sizes and SHA-256. The original downloaded archives are retained only in ignored `.local-server/audio-sources`; they are not shipped wholesale.
