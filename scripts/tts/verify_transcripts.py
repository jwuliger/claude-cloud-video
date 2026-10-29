"""Transcribe every voiceover clip with Whisper (sherpa-onnx) and compare it to the script.

Usage: verify_transcripts.py VO_DIR ASR_MODEL_DIR [MAX_WER]

Exits non-zero when any line's word error rate exceeds MAX_WER (default 0.2).
This is an independent intelligibility check: if Whisper cannot hear the script, listeners may not.
"""

import json
import re
import sys
from pathlib import Path

import sherpa_onnx
import soundfile as sf

DEFAULT_MAX_WER = 0.2
SPELLED_VARIANTS = {"a i": "ai", "dot com": "com", "live motion labs": "livemotionlabs"}


def normalize(text: str) -> list[str]:
    """Lower-case words without punctuation, with spoken variants folded together."""
    cleaned = re.sub(r"[^a-z0-9 ]", " ", text.lower().replace("-", " "))
    cleaned = " ".join(cleaned.split())
    for spoken, written in SPELLED_VARIANTS.items():
        cleaned = cleaned.replace(spoken, written)
    return cleaned.split()


def word_error_rate(reference: list[str], hypothesis: list[str]) -> float:
    """Word-level Levenshtein distance divided by the reference length."""
    previous = list(range(len(hypothesis) + 1))
    for i, ref_word in enumerate(reference, start=1):
        current = [i]
        for j, hyp_word in enumerate(hypothesis, start=1):
            cost = 0 if ref_word == hyp_word else 1
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost))
        previous = current
    return previous[-1] / max(len(reference), 1)


def build_recognizer(model_dir: Path) -> sherpa_onnx.OfflineRecognizer:
    return sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=str(model_dir / "base.en-encoder.int8.onnx"),
        decoder=str(model_dir / "base.en-decoder.int8.onnx"),
        tokens=str(model_dir / "base.en-tokens.txt"),
        language="en",
        task="transcribe",
        num_threads=2,
    )


def transcribe(recognizer: sherpa_onnx.OfflineRecognizer, path: Path) -> str:
    samples, sample_rate = sf.read(path, dtype="float32")
    stream = recognizer.create_stream()
    stream.accept_waveform(sample_rate, samples)
    recognizer.decode_stream(stream)
    return stream.result.text


def main() -> None:
    vo_dir, model_dir = Path(sys.argv[1]), Path(sys.argv[2])
    max_wer = float(sys.argv[3]) if len(sys.argv) > 3 else DEFAULT_MAX_WER
    manifest = json.loads((vo_dir / "manifest.json").read_text())
    recognizer = build_recognizer(model_dir)
    failures = 0
    for line_id, line in manifest["lines"].items():
        heard = transcribe(recognizer, vo_dir / line["file"])
        wer = word_error_rate(normalize(line["speak"]), normalize(heard))
        status = "ok " if wer <= max_wer else "BAD"
        failures += wer > max_wer
        print(f"{status} {line_id:10s} WER {wer:4.2f}  heard: {heard.strip()}")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
