#!/usr/bin/env bash
# One-time setup for voiceover generation: a Python venv, Kokoro-82M (Apache-2.0) model files,
# and a Whisper model used only to check that the generated speech is intelligible.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p .cache/models .cache/asr

KOKORO_RELEASE="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
WHISPER_RELEASE="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models"

[ -f .cache/models/kokoro-v1.0.onnx ] || curl -fsSL -o .cache/models/kokoro-v1.0.onnx "$KOKORO_RELEASE/kokoro-v1.0.onnx"
[ -f .cache/models/voices-v1.0.bin ] || curl -fsSL -o .cache/models/voices-v1.0.bin "$KOKORO_RELEASE/voices-v1.0.bin"
if [ ! -d .cache/asr/sherpa-onnx-whisper-base.en ]; then
  curl -fsSL -o .cache/asr/whisper.tar.bz2 "$WHISPER_RELEASE/sherpa-onnx-whisper-base.en.tar.bz2"
  tar -xjf .cache/asr/whisper.tar.bz2 -C .cache/asr
  rm .cache/asr/whisper.tar.bz2
fi

[ -d .cache/venv ] || python3 -m venv .cache/venv
.cache/venv/bin/pip install --quiet --upgrade pip
.cache/venv/bin/pip install --quiet -r scripts/tts/requirements.txt
echo "TTS setup complete."
