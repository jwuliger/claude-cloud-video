"""Synthesize voiceover lines with Kokoro-82M (Apache-2.0) and report word timings.

Usage: kokoro_synth.py REQUEST_JSON OUT_DIR MODEL_DIR

REQUEST_JSON: {"voice": str, "speed": float, "lang": str, "lines": [{"id": str, "speak": str}]}
Writes OUT_DIR/<id>.wav (24 kHz mono) and prints a manifest JSON to stdout.

The stock ONNX export only returns audio. ensure_timed_model() copies it once and exposes the
duration tensor as an extra "duration" output, which kokoro-onnx uses to time every phoneme.
"""

import json
import sys
from pathlib import Path

import numpy as np
import onnx
import soundfile as sf
from kokoro_onnx import Kokoro
from onnx import TensorProto, helper

FADE_SECONDS = 0.004
DURATION_TENSOR_OP = "Round"


def ensure_timed_model(model_dir: Path) -> Path:
    """Return a copy of the Kokoro model that also outputs per-token durations."""
    source = model_dir / "kokoro-v1.0.onnx"
    timed = model_dir / "kokoro-v1.0-timed.onnx"
    if timed.exists():
        return timed
    model = onnx.load(str(source))
    graph = model.graph
    rounded = next(node for node in graph.node if node.op_type == DURATION_TENSOR_OP)
    graph.node.append(
        helper.make_node("Cast", [rounded.output[0]], ["duration"], to=TensorProto.INT64)
    )
    graph.output.append(helper.make_tensor_value_info("duration", TensorProto.INT64, [None]))
    onnx.save(model, str(timed))
    return timed


def group_words(timings) -> list[tuple[float, float]]:
    """Split phoneme timings on space tokens into (start, end) spans, one per word."""
    spans: list[list[float]] = []
    current: list[float] | None = None
    for item in timings:
        if item.phoneme == " ":
            current = None
            continue
        if current is None:
            current = [item.start, item.end]
            spans.append(current)
        elif item.phoneme not in ",.;:!?":
            current[1] = item.end
    return [(start, end) for start, end in spans]


def fade_edges(samples: np.ndarray, sample_rate: int) -> np.ndarray:
    """Apply a very short fade in/out so concatenated clips never click."""
    count = min(int(FADE_SECONDS * sample_rate), len(samples) // 2)
    ramp = np.linspace(0.0, 1.0, count, dtype=np.float32)
    faded = samples.copy()
    faded[:count] *= ramp
    faded[-count:] *= ramp[::-1]
    return faded


def synthesize_line(engine: Kokoro, request: dict, line: dict, out_dir: Path) -> dict:
    samples, sample_rate, timings = engine.create_timed(
        line["speak"], voice=request["voice"], speed=request["speed"], lang=request["lang"]
    )
    words_text = line["speak"].split()
    spans = group_words(timings)
    if len(spans) != len(words_text):
        raise SystemExit(
            f"Line '{line['id']}': {len(words_text)} words but {len(spans)} timed groups. "
            "Reword the 'speak' text so each word maps to one phoneme group."
        )
    samples = fade_edges(np.asarray(samples, dtype=np.float32), sample_rate)
    sf.write(out_dir / f"{line['id']}.wav", samples, sample_rate, subtype="PCM_24")
    words = [
        {"text": text, "start": round(start, 3), "end": round(end, 3)}
        for text, (start, end) in zip(words_text, spans, strict=True)
    ]
    return {
        "speak": line["speak"],
        "file": f"{line['id']}.wav",
        "duration": round(len(samples) / sample_rate, 3),
        "words": words,
    }


def main() -> None:
    request_path, out_dir_arg, model_dir_arg = sys.argv[1:4]
    request = json.loads(Path(request_path).read_text())
    out_dir, model_dir = Path(out_dir_arg), Path(model_dir_arg)
    out_dir.mkdir(parents=True, exist_ok=True)
    engine = Kokoro(str(ensure_timed_model(model_dir)), str(model_dir / "voices-v1.0.bin"))
    lines = {line["id"]: synthesize_line(engine, request, line, out_dir) for line in request["lines"]}
    manifest = {
        "voice": request["voice"],
        "speed": request["speed"],
        "sampleRate": 24000,
        "lines": lines,
    }
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
