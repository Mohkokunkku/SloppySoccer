"""Copy selected Kenney CC0 recorded voice performances into runtime PCM WAVs."""
import hashlib
import json
from pathlib import Path
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".local-server" / "audio-sources" / "voiceover-pack"
OUT = ROOT / "public" / "audio-v3"
CLIPS = {
    "cheer-yeah.wav": ("Male/you_win.ogg", "You win!", "Jeffrey M. Smith"),
    "cheer-we-did-it.wav": ("Female/congratulations.ogg", "Congratulations!", "Giselle"),
    "cheer-champions.wav": ("Female/you_win.ogg", "You win!", "Giselle"),
}


def measure(path: Path) -> dict:
    raw = path.read_bytes()
    with wave.open(str(path), "rb") as wav:
        frames = wav.readframes(wav.getnframes())
        width = wav.getsampwidth()
        samples = [int.from_bytes(frames[i:i + width], "little", signed=True) for i in range(0, len(frames), width)]
        peak = max((abs(value) for value in samples), default=0) / (2 ** (width * 8 - 1))
        rms = (sum(value * value for value in samples) / max(1, len(samples))) ** .5 / (2 ** (width * 8 - 1))
        return {"file": path.name, "bytes": len(raw), "duration": round(wav.getnframes() / wav.getframerate(), 6),
                "channels": wav.getnchannels(), "sampleRate": wav.getframerate(), "rms": round(rms, 6),
                "peak": round(peak, 6), "sha256": hashlib.sha256(raw).hexdigest()}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, (source, _spoken, _performer) in CLIPS.items():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(SOURCE / source), "-ac", "1", "-ar", "24000",
                        "-c:a", "pcm_s16le", str(OUT / filename)], check=True)
    for filename, source in {"voice-go.wav":"Male/go.ogg","voice-yes.wav":"Female/hurry_up.ogg"}.items():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(SOURCE / source), "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(ROOT / "public" / "audio-v2" / filename)], check=True)
    v2=ROOT / "public" / "audio-v2"
    (v2 / "manifest.json").write_text(json.dumps({"assets":[measure(path) for path in sorted(v2.glob("*.wav"))],"credits":"CREDITS.md"},indent=2)+"\n",encoding="utf-8")
    assets = [measure(path) for path in sorted(OUT.glob("*.wav"))]
    (OUT / "manifest.json").write_text(json.dumps({"assets": assets, "credits": "CREDITS.md"}, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(CLIPS)+2} recorded human shouts without voice EQ, pitch shift or synthesis; measured v2/v3 WAV files.")


if __name__ == "__main__":
    main()
