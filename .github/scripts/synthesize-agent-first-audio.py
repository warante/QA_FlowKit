#!/usr/bin/env python3
"""Local neural narration: approved Castilian female voice + English female voice."""
import argparse
import hashlib
import json
from pathlib import Path
import wave

import numpy as np
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx import Kokoro
from piper import PiperVoice, SynthesisConfig


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--storyboard", required=True, type=Path)
    parser.add_argument("--spanish-model", required=True, type=Path)
    parser.add_argument("--english-model", required=True, type=Path)
    parser.add_argument("--english-voices", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    output = args.output_dir.resolve()
    if output == root or root in output.parents:
        parser.error("Generated narration must stay outside the repository")
    config = json.loads(Path(str(args.spanish_model) + ".json").read_text(encoding="utf-8"))
    if config["language"]["code"] != "es_ES" or "F" not in config["speaker_id_map"]:
        parser.error("Expected the reviewed es_ES Sharvard female speaker")
    if config.get("dataset") != "sharvard":
        parser.error("Only the user-selected Sharvard voice is supported")
    data = json.loads(args.storyboard.read_text(encoding="utf-8"))
    output.mkdir(parents=True, exist_ok=False)
    spanish = PiperVoice.load(args.spanish_model)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(args.english_model), options, providers=["CPUExecutionProvider"])
    english = Kokoro.from_session(session, str(args.english_voices))
    if "af_heart" not in english.get_voices():
        raise ValueError("English female voice af_heart is missing")
    clips = []
    for scene in data["scenes"]:
        es_text = scene["narration"]["es"].replace("QA FlowKit", "cu a flou kit").replace("CLI", "ce ele i").replace("barra qa ", "barra cu a ")
        es_path = output / f'{scene["id"]}-es.wav'
        with wave.open(str(es_path), "wb") as audio:
            spanish.synthesize_wav(es_text, audio, syn_config=SynthesisConfig(speaker_id=config["speaker_id_map"]["F"], length_scale=1.0))
        en_path = output / f'{scene["id"]}-en.wav'
        en_text = scene["narration"]["en"].replace("QA FlowKit", "Q A Flow Kit").replace("CLI", "C L I").replace("slash qa ", "slash Q A ")
        samples, rate = english.create(en_text, voice="af_heart", speed=1.0, lang="en-us")
        if not np.isfinite(samples).all() or np.max(np.abs(samples)) < 0.01:
            raise ValueError(f'Invalid English audio: {scene["id"]}')
        peak = float(np.max(np.abs(samples)))
        if peak > 0.95:
            samples = samples * (0.95 / peak)
        sf.write(en_path, samples, rate, subtype="PCM_16")
        for language, file, text in [("es", es_path, es_text), ("en", en_path, en_text)]:
            with wave.open(str(file)) as audio:
                duration = audio.getnframes() / audio.getframerate()
            clips.append({"scene": scene["id"], "language": language, "spokenText": text,
                          "durationSeconds": duration, "sha256": hashlib.sha256(file.read_bytes()).hexdigest()})
            print(f'{scene["id"]}/{language}: {duration:.2f}s (scene: {scene["duration"]}s)', flush=True)
    models = {}
    for label, file in [("spanish", args.spanish_model), ("english", args.english_model), ("englishVoices", args.english_voices)]:
        with file.open("rb") as handle:
            models[label] = {"filename": file.name, "sha256": hashlib.file_digest(handle, "sha256").hexdigest()}
    manifest = {"storyboard": data, "spanish": {"engine": "Piper", "voice": "es_ES-sharvard-medium", "speaker": "F",
                "datasetSource": "https://datashare.ed.ac.uk/handle/10283/574", "datasetLicense": "CC BY 3.0"},
                "english": {"engine": "Kokoro", "voice": "af_heart", "locale": "en-US"},
                "models": models, "clips": clips, "humanListeningReview": "pending"}
    (output / "narration.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
