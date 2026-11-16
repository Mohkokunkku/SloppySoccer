"""Generate original instrumental Sloppy Soccer victory music only."""
from array import array
import math
from pathlib import Path
import wave

RATE = 22050
OUT = Path(__file__).resolve().parents[1] / "public" / "audio-v3"

def write_music(index: int) -> None:
    # Original, short looping motifs: differing tempo, scale and timbre per party theme.
    bpm = (108, 124, 92)[index]
    notes = ((220, 261.63, 329.63, 392), (196, 246.94, 293.66, 369.99), (174.61, 220, 261.63, 349.23))[index]
    duration = 8.0
    frames = array('h')
    beat = 60.0 / bpm
    for n in range(int(RATE * duration)):
        t = n / RATE
        beat_pos = int(t / beat)
        phase = t % beat
        freq = notes[(beat_pos // 2 + index) % len(notes)]
        env = min(1.0, phase * 18) * min(1.0, (beat - phase) * 5)
        melody = math.sin(2 * math.pi * freq * t) + .35 * math.sin(2 * math.pi * freq * 2 * t)
        bass = math.sin(2 * math.pi * notes[beat_pos % len(notes)] * .5 * t) * (.45 if beat_pos % 2 == 0 else .15)
        sample = max(-1.0, min(1.0, (melody * .22 + bass) * env))
        frames.append(int(sample * 32767))
    with wave.open(str(OUT / f"theme-{index}.wav"), 'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(RATE); wav.writeframes(frames.tobytes())

def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for i in range(3): write_music(i)
    print(f'Generated 3 original instrumental loops in {OUT}; human voice recordings are maintained separately.')

if __name__ == '__main__': main()
