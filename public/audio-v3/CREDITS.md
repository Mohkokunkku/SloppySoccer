# Victory audio v3 credits

- `theme-0.wav`, `theme-1.wav`, `theme-2.wav`: original instrumental loops synthesized by `scripts/generate-victory-audio.py` using Python's standard-library math and WAV support. No external samples, downloads, or commercial melodies are used.
- `cheer-yeah.wav`, `cheer-we-did-it.wav`, `cheer-champions.wav`: speech synthesized locally using Windows System.Speech voices. These are TTS, not human recordings; installed voice identity/availability depends on the Windows host that runs the generator.

To regenerate, run `python scripts/generate-victory-audio.py` on Windows with PowerShell and System.Speech available. The three music WAVs are generated before the script checks speech platform support.