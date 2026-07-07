#!/usr/bin/env python3
"""Render the RF-101 product demo media.

Maintainer-only helper. It writes preview/final media, but keeps Kokoro models,
FFmpeg binaries and generated audio clips outside the repository.
"""

from __future__ import annotations

import argparse
import array
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import textwrap
import wave

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1920
HEIGHT = 1080
FPS = 30
BG = "#071018"
PANEL = "#0d1823"
PANEL_2 = "#111f2c"
TEXT = "#e8f0f6"
MUTED = "#8ea2b2"
GREEN = "#59d499"
CYAN = "#50c8e8"
YELLOW = "#f0c66b"
RED = "#ff7185"
PURPLE = "#a792ff"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    candidates = {
        "sans": ["C:/Windows/Fonts/segoeui.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"],
        "bold": ["C:/Windows/Fonts/seguisb.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
        "mono": ["C:/Windows/Fonts/consola.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"],
        "mono_bold": ["C:/Windows/Fonts/consolab.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"],
    }
    for candidate in candidates[name]:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default(size=size)


SANS = font("sans", 30)
SANS_SMALL = font("sans", 25)
BOLD = font("bold", 35)
BOLD_BIG = font("bold", 66)
MONO = font("mono", 28)
MONO_SMALL = font("mono", 24)
MONO_BOLD = font("mono_bold", 28)


SCENES = [
    {
        "start": 0,
        "end": 6,
        "label": "RF-101 QUICK TRACK",
        "subtitle_en": "RF-101 starts as one login requirement and finishes as validated QA evidence.",
        "subtitle_es": "RF-101 empieza como un requisito de login y termina como evidencia QA validada.",
        "narration_en": "RF one oh one starts as one login requirement and finishes as validated QA evidence.",
        "narration_es": "RF ciento uno empieza como un requisito de login y termina como evidencia QA validada.",
        "kind": "title",
        "lines": [],
    },
    {
        "start": 6,
        "end": 14,
        "label": "01  INSTALL AND GUIDED INIT",
        "subtitle_en": "Install once, open OpenCode, then run /qa-init for the guided setup.",
        "subtitle_es": "Instala una vez, abre OpenCode y ejecuta /qa-init para configurar.",
        "narration_en": "QA FlowKit installs in one command. OpenCode then runs slash command init.",
        "narration_es": "QA FlowKit se instala con un comando. OpenCode ejecuta el comando slash init.",
        "lines": [
            ("$ mkdir /tmp/rf101-demo && cd /tmp/rf101-demo", "command"),
            ("$ npx qa-flowkit", "command"),
            ("[pass] Adapter selector: opencode", "success"),
            ("$ opencode", "command"),
            ("> /qa-init", "command"),
            ("Project: rf101-demo  |  Gherkin: English", "muted"),
            ("Template: Manual only  |  External tools: None", "muted"),
            ("[pass] doctor passed; framework files created", "success"),
        ],
    },
    {
        "start": 14,
        "end": 22,
        "label": "02  START A RESUMABLE FLOW",
        "subtitle_en": "/qa-full-flow opens a governed run that can pause and resume by phase.",
        "subtitle_es": "/qa-full-flow abre una ejecucion gobernada que se reanuda por fase.",
        "narration_en": "Full flow opens a governed run. It can pause and resume phase by phase.",
        "narration_es": "Full flow abre una ejecucion gobernada. Puede pausarse y reanudarse por fase.",
        "lines": [
            ("> /qa-full-flow", "command"),
            ("Agent: Where is the requirement source?", "info"),
            ("You: requirements/RF-101-login.md", "plain"),
            ("Agent: What is the official RF ID?", "info"),
            ("You: RF-101", "plain"),
            ("Agent: Test management project or suite?", "info"),
            ("You: None - quick track", "plain"),
            ("[pass] run state created for RF-101", "success"),
        ],
    },
    {
        "start": 22,
        "end": 30,
        "label": "03  SOURCE REQUIREMENT",
        "subtitle_en": "The public RF-101 fixture stays in the target repository.",
        "subtitle_es": "El fixture publico RF-101 permanece en el repositorio destino.",
        "narration_en": "The source requirement stays in the repository with its acceptance criterion.",
        "narration_es": "El requisito fuente queda en el repositorio con su criterio de aceptacion.",
        "lines": [
            ("requirements/RF-101-login.md", "heading"),
            ("", "plain"),
            ("# RF-101 - User login", "heading"),
            ("A registered user can sign in with a valid", "plain"),
            ("email address and password.", "plain"),
            ("", "plain"),
            ("Acceptance criteria", "heading"),
            ("- Valid credentials open the account dashboard.", "plain"),
        ],
    },
    {
        "start": 30,
        "end": 38,
        "label": "04  ANALYSIS ARTIFACTS",
        "subtitle_en": "The agent writes analysis artifacts, then a deterministic check returns ok true.",
        "subtitle_es": "El agente escribe artefactos y el control determinista devuelve ok true.",
        "narration_en": "The agent writes analysis artifacts. A deterministic check returns okay true before moving on.",
        "narration_es": "El agente escribe artefactos de analisis. Un control determinista devuelve ok true.",
        "lines": [
            ("qa-ai-output/", "heading"),
            ("  requirement-analysis.md", "success"),
            ("  normalized-requirements.md", "success"),
            ("", "plain"),
            ("run check", "command"),
            ("{", "plain"),
            ('  "ok": true,', "success"),
            ('  "phaseId": "intake"', "plain"),
            ("}", "plain"),
        ],
    },
    {
        "start": 38,
        "end": 46,
        "label": "05  HUMAN APPROVAL POINT",
        "subtitle_en": "Design approval is recorded before generating or accepting Gherkin.",
        "subtitle_es": "La aprobacion de diseno queda registrada antes de aceptar Gherkin.",
        "narration_en": "Before Gherkin, the flow records a human design approval in the run evidence.",
        "narration_es": "Antes de Gherkin, el flujo registra una aprobacion humana en la evidencia.",
        "lines": [
            ("Agent: Review test design before Gherkin.", "info"),
            ("Coverage: positive login path", "plain"),
            ("Test type: functional manual case", "plain"),
            ("External writes: disabled", "muted"),
            ("", "plain"),
            ("You: Approved - continue.", "command"),
            ("[pass] approval recorded", "success"),
        ],
    },
    {
        "start": 46,
        "end": 55,
        "label": "06  INTENTIONAL DEFECT",
        "subtitle_en": "The invalid fixture is missing the required @manual:true tag.",
        "subtitle_es": "El fixture invalido no tiene la etiqueta obligatoria @manual:true.",
        "narration_en": "Now the demo places an invalid feature. The required manual true tag is missing.",
        "narration_es": "Ahora la demo coloca un feature invalido. Falta la etiqueta manual true.",
        "lines": [
            ("features/functional/RF-101-TC-001-login.feature", "heading"),
            ("", "plain"),
            ("@priority:high @type:functional @rf:RF-101 @id:TC-001", "tag"),
            ("Feature: User login", "heading"),
            ("  Acceptance Criteria:", "plain"),
            ("    - Valid credentials open the dashboard", "plain"),
            ("", "plain"),
            ("# missing: @manual:true", "error"),
        ],
    },
    {
        "start": 55,
        "end": 65,
        "label": "07  VALIDATOR REJECTS IT",
        "subtitle_en": "run check exits non-zero and keeps the Gherkin phase active.",
        "subtitle_es": "run check sale con codigo distinto de cero y mantiene la fase Gherkin.",
        "narration_en": "Run check exits non zero. The Gherkin phase stays active, so the run is not lost.",
        "narration_es": "Run check sale con codigo distinto de cero. La fase Gherkin sigue activa.",
        "lines": [
            ("run check", "command"),
            ("{", "plain"),
            ('  "ok": false,', "error"),
            ('  "phaseId": "gherkin",', "plain"),
            ('  "errors": [', "plain"),
            ('    "Missing required tag @manual:<value>"', "error"),
            ("  ]", "plain"),
            ("}", "plain"),
            ("[fail] exit code 1 - phase remains active", "error"),
        ],
    },
    {
        "start": 65,
        "end": 74,
        "label": "08  CORRECT WITHOUT RESTARTING",
        "subtitle_en": "The corrected fixture adds @manual:true, then the same run retries validation.",
        "subtitle_es": "El fixture corregido agrega @manual:true y el mismo run reintenta.",
        "narration_en": "The corrected fixture adds manual true. The same run retries without restarting.",
        "narration_es": "El fixture corregido agrega manual true. El mismo run reintenta sin reiniciar.",
        "lines": [
            ("You: Fixed - retry validation.", "command"),
            ("", "plain"),
            ("@priority:high @type:functional @manual:true", "success"),
            ("@rf:RF-101 @id:TC-001", "tag"),
            ("Feature: User login", "heading"),
            ("  As a registered user", "plain"),
            ("  I want to log in with valid credentials", "plain"),
            ("  So that I can access my account", "plain"),
        ],
    },
    {
        "start": 74,
        "end": 82,
        "label": "09  SAME CHECK PASSES",
        "subtitle_en": "The same Gherkin gate now passes with ok true.",
        "subtitle_es": "El mismo control de Gherkin ahora pasa con ok true.",
        "narration_en": "The same Gherkin gate now passes with okay true.",
        "narration_es": "El mismo control de Gherkin ahora pasa con ok true.",
        "lines": [
            ("run check", "command"),
            ("{", "plain"),
            ('  "ok": true,', "success"),
            ('  "phaseId": "gherkin",', "plain"),
            ('  "validatedFiles": 1', "plain"),
            ("}", "plain"),
            ("[pass] corrected Gherkin passed", "success"),
            ("Agent: continuing to traceability", "info"),
        ],
    },
    {
        "start": 82,
        "end": 91,
        "label": "10  TRACEABILITY",
        "subtitle_en": "Traceability links RF-101, TC-001 and the acceptance criterion.",
        "subtitle_es": "La trazabilidad enlaza RF-101, TC-001 y el criterio de aceptacion.",
        "narration_en": "Traceability links RF one oh one, test case one, and the acceptance criterion.",
        "narration_es": "La trazabilidad enlaza RF ciento uno, TC cero cero uno y el criterio.",
        "lines": [
            ("qa-ai-output/traceability-matrix.md", "heading"),
            ("", "plain"),
            ("| Requirement | Criterion | Test case | Coverage |", "table"),
            ("|-------------|-----------|-----------|----------|", "muted"),
            ("| RF-101      | CA-101-1  | TC-001    | covered  |", "success"),
            ("", "plain"),
            ('{ "ok": true, "phaseId": "traceability" }', "success"),
        ],
    },
    {
        "start": 91,
        "end": 99,
        "label": "11  RUN COMPLETED",
        "subtitle_en": "The PR summary is generated and the run status becomes completed.",
        "subtitle_es": "Se genera el resumen de PR y el estado del run pasa a completed.",
        "narration_en": "The PR summary is generated, and run status becomes completed.",
        "narration_es": "Se genera el resumen de PR, y el estado del run pasa a completed.",
        "lines": [
            ("qa-ai-output/pr-summary.md", "success"),
            ("", "plain"),
            ("run status", "command"),
            ("{", "plain"),
            ('  "rfId": "RF-101",', "plain"),
            ('  "status": "completed",', "success"),
            ('  "phases": "all completed"', "success"),
            ("}", "plain"),
        ],
    },
    {
        "start": 99,
        "end": 108,
        "label": "12  FULL TARGET VALIDATION",
        "subtitle_en": "The final target gate passes without credentials or external service writes.",
        "subtitle_es": "La validacion final pasa sin credenciales ni escrituras externas.",
        "narration_en": "Finally, the target validation gate passes without credentials or external service writes.",
        "narration_es": "Por ultimo, la validacion final pasa sin credenciales ni escrituras externas.",
        "lines": [
            ("validate-target", "command"),
            ("[pass] configuration", "success"),
            ("[pass] Gherkin features", "success"),
            ("[pass] traceability", "success"),
            ("[pass] workflow contract", "success"),
            ("[pass] target validation passed", "success"),
            ("", "plain"),
            ("No Jira/TestRail writes - No credentials", "muted"),
        ],
    },
    {
        "start": 108,
        "end": 115,
        "label": "REPLAY THE VERIFIED PATH",
        "subtitle_en": "Replay the same path with npm run test:e2e-quick from the source repository.",
        "subtitle_es": "Reproduce la misma ruta con npm run test:e2e-quick desde el repo fuente.",
        "narration_en": "Replay the same path from the QA FlowKit source repository with npm run test E two E quick.",
        "narration_es": "Reproduce la misma ruta desde el repositorio fuente con npm run test e dos e quick.",
        "kind": "closing",
        "lines": [],
    },
]


COLORS = {
    "plain": TEXT,
    "command": CYAN,
    "success": GREEN,
    "error": RED,
    "muted": MUTED,
    "info": PURPLE,
    "heading": YELLOW,
    "tag": PURPLE,
    "table": TEXT,
}


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def render_scene(scene: dict) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.ellipse((-260, -520, 900, 580), fill="#0a2630")
    draw.ellipse((1280, 550, 2260, 1390), fill="#10233b")

    draw.text((110, 58), "QA FLOWKIT", font=BOLD, fill=TEXT)
    draw.text((330, 64), "RF-101 OPENCODE DEMO", font=SANS_SMALL, fill=MUTED)
    rounded(draw, (1530, 53, 1810, 99), 22, "#123326", GREEN)
    draw.text((1570, 62), "NO EXTERNAL WRITES", font=font("bold", 19), fill=GREEN)

    progress = scene["end"] / SCENES[-1]["end"]
    rounded(draw, (110, 124, 1810, 132), 4, "#1c2c38")
    rounded(draw, (110, 124, 110 + int(1700 * progress), 132), 4, GREEN)

    kind = scene.get("kind", "terminal")
    if kind == "title":
        draw.text((110, 250), "One requirement,", font=BOLD_BIG, fill=TEXT)
        draw.text((110, 335), "validated end to end.", font=BOLD_BIG, fill=GREEN)
        draw.text((115, 465), "OpenCode slash commands  ->  deterministic gates  ->  QA evidence", font=MONO, fill=CYAN)
        rounded(draw, (110, 570, 1210, 690), 24, PANEL, "#294251", 2)
        draw.text((155, 600), "> /qa-full-flow RF-101", font=font("mono_bold", 38), fill=TEXT)
        draw.text((118, 745), "Portable  |  Repository-first  |  No external writes", font=SANS, fill=MUTED)
    elif kind == "closing":
        draw.text((110, 245), "Replay the verified path.", font=BOLD_BIG, fill=TEXT)
        rounded(draw, (110, 390, 1450, 545), 24, PANEL, GREEN, 2)
        draw.text((165, 435), "$ npm run test:e2e-quick", font=font("mono_bold", 48), fill=GREEN)
        draw.text((115, 625), "docs/qa-ai/demo.md", font=font("bold", 34), fill=CYAN)
        draw.text((115, 690), "Open source | MIT | Node.js 20+", font=SANS, fill=MUTED)
    else:
        draw.text((110, 165), scene["label"], font=BOLD, fill=TEXT)
        rounded(draw, (110, 225, 1810, 845), 22, PANEL, "#284050", 2)
        rounded(draw, (110, 225, 1810, 286), 22, PANEL_2)
        draw.rectangle((110, 263, 1810, 286), fill=PANEL_2)
        for x, color in ((145, RED), (181, YELLOW), (217, GREEN)):
            draw.ellipse((x, 246, x + 18, 264), fill=color)
        draw.text((765, 241), "qa-flowkit - terminal", font=font("sans", 22), fill=MUTED)

        y = 320
        for line, style in scene["lines"]:
            active_font = MONO_BOLD if style in {"command", "heading"} else MONO
            for wrapped in textwrap.wrap(line, width=92, replace_whitespace=False) or [""]:
                draw.text((155, y), wrapped, font=active_font, fill=COLORS[style])
                y += 48

    rounded(draw, (110, 900, 1810, 1015), 18, "#0a141d", "#203542", 2)
    draw.text((145, 920), "ES", font=font("bold", 22), fill=GREEN)
    draw.multiline_text((205, 915), textwrap.fill(scene["subtitle_es"], 98), font=SANS, fill=TEXT, spacing=6)
    draw.text((1685, 1028), seconds_label(scene["start"]), font=MONO_SMALL, fill=MUTED)
    return image


def seconds_label(seconds: int) -> str:
    return f"{seconds // 60}:{seconds % 60:02d}"


def timestamp(seconds: int) -> str:
    return f"00:{seconds // 60:02d}:{seconds % 60:02d}.000"


def write_vtt(path: Path, text_key: str) -> None:
    chunks = ["WEBVTT", ""]
    for scene in SCENES:
        chunks.extend([f"{timestamp(scene['start'])} --> {timestamp(scene['end'])}", scene[text_key], ""])
    path.write_text("\n".join(chunks), encoding="utf-8")


def synthesize_voice(text: str, output: Path, lang: str) -> None:
    escaped_text = text.replace("'", "''")
    escaped_output = str(output).replace("'", "''")
    voice = "Microsoft Helena Desktop" if lang == "es" else "Microsoft Zira Desktop"
    command = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        f"$s.SelectVoice('{voice}'); "
        "$s.Rate = 1; $s.Volume = 92; "
        f"$s.SetOutputToWaveFile('{escaped_output}'); "
        f"$s.Speak('{escaped_text}'); $s.Dispose()"
    )
    subprocess.run(["powershell", "-NoProfile", "-Command", command], check=True)


def load_kokoro(model: Path, voices: Path, python_path: Path | None):
    if python_path:
        sys.path.insert(0, str(python_path))
    try:
        from kokoro_onnx import Kokoro
    except ImportError as error:
        raise SystemExit("Install kokoro-onnx or pass --kokoro-python-path") from error
    return Kokoro(str(model), str(voices))


def synthesize_kokoro(engine, text: str, output: Path, voice: str, speed: float) -> None:
    import soundfile as sf

    if voice.startswith("e"):
        language = "es"
    elif voice.startswith("b"):
        language = "en-gb"
    else:
        language = "en-us"
    audio, sample_rate = engine.create(text, voice=voice, speed=speed, lang=language)
    sf.write(output, audio, sample_rate, subtype="PCM_16")


def synthesize_kokoro_isolated(args, ffmpeg: Path, scene_index: int, output: Path, voice: str, lang: str) -> None:
    scene_output = output.parent / f"kokoro-{lang}-scene-{scene_index:02d}"
    command = [
        sys.executable,
        "-u",
        str(Path(__file__).resolve()),
        "--ffmpeg",
        str(ffmpeg),
        "--kokoro-model",
        str(args.kokoro_model),
        "--kokoro-voices",
        str(args.kokoro_voices),
        "--kokoro-voice",
        voice,
        "--kokoro-speed",
        str(args.kokoro_speed),
        "--sample-voices",
        voice,
        "--sample-scene",
        str(scene_index),
        "--sample-language",
        lang,
        "--output",
        str(scene_output),
    ]
    if args.kokoro_python_path:
        command.extend(["--kokoro-python-path", str(args.kokoro_python_path)])
    subprocess.run(command, check=True)
    shutil.copyfile(scene_output / f"{voice}.wav", output)


def clip_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as wav:
        return wav.getnframes() / wav.getframerate()


def mix_narration(clips: list[tuple[float, Path]], output: Path, total_seconds: int) -> None:
    params = None
    clip_data = []
    for start, clip in clips:
        with wave.open(str(clip), "rb") as wav:
            current = (wav.getnchannels(), wav.getsampwidth(), wav.getframerate())
            if params is None:
                params = current
            if current != params:
                raise RuntimeError(f"Narration WAV formats differ: {current} != {params}")
            clip_data.append((start, wav.readframes(wav.getnframes())))

    channels, sample_width, sample_rate = params
    if sample_width != 2:
        raise RuntimeError("Expected 16-bit narration WAV")
    mixed = array.array("h", [0]) * (total_seconds * sample_rate * channels)
    for start, raw in clip_data:
        samples = array.array("h")
        samples.frombytes(raw)
        offset = round(start * sample_rate * channels)
        for i, sample in enumerate(samples):
            target = offset + i
            if target >= len(mixed):
                break
            mixed[target] = max(-32768, min(32767, mixed[target] + sample))

    with wave.open(str(output), "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(sample_width)
        wav.setframerate(sample_rate)
        wav.writeframes(mixed.tobytes())


def run(command: list[str]) -> None:
    print("+", " ".join(command), flush=True)
    subprocess.run(command, check=True)


def build_language_audio(args, ffmpeg: Path, tmp: Path, lang: str, voice: str) -> Path:
    clips = []
    for index, scene in enumerate(SCENES):
        voice_path = tmp / f"voice-{lang}-{index:02d}.wav"
        if args.narration_root:
            clips_dir = args.narration_root / f"clips-{lang}"
            if lang == "en" and not clips_dir.exists():
                clips_dir = args.narration_root / "clips"
            source_voice = clips_dir / f"scene-{index:02d}" / f"{voice}.wav"
            if not source_voice.exists():
                raise SystemExit(f"Missing narration clip: {source_voice}")
            shutil.copyfile(source_voice, voice_path)
        elif args.narrator == "kokoro":
            print(f"Synthesizing {lang} scene {index + 1}/{len(SCENES)} with Kokoro {voice}", flush=True)
            if args.kokoro_isolate_scenes:
                synthesize_kokoro_isolated(args, ffmpeg, index, voice_path, voice, lang)
            else:
                engine = load_kokoro(args.kokoro_model, args.kokoro_voices, args.kokoro_python_path)
                synthesize_kokoro(engine, scene[f"narration_{lang}"], voice_path, voice, args.kokoro_speed)
        else:
            synthesize_voice(scene[f"narration_{lang}"], voice_path, lang)

        limit = scene["end"] - scene["start"] - 0.5
        duration = clip_duration(voice_path)
        if duration > limit:
            raise SystemExit(
                f"{lang} scene {index:02d} narration is {duration:.2f}s, longer than allowed {limit:.2f}s"
            )
        clips.append((scene["start"] + 0.5, voice_path))

    narration = tmp / f"narration-{lang}.wav"
    mix_narration(clips, narration, SCENES[-1]["end"])
    return narration


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("docs/qa-ai/media"))
    parser.add_argument("--ffmpeg", type=Path, default=None)
    parser.add_argument("--narrator", choices=["sapi", "kokoro"], default="sapi")
    parser.add_argument("--kokoro-model", type=Path)
    parser.add_argument("--kokoro-voices", type=Path)
    parser.add_argument("--kokoro-python-path", type=Path)
    parser.add_argument("--kokoro-voice-en", default="af_heart")
    parser.add_argument("--kokoro-voice-es", default="ef_dora")
    parser.add_argument("--kokoro-voice", default="af_heart")
    parser.add_argument("--kokoro-speed", type=float, default=1.0)
    parser.add_argument("--narration-root", type=Path, help="Root with clips-en/ and clips-es/ scene WAVs")
    parser.add_argument("--kokoro-isolate-scenes", action="store_true")
    parser.add_argument("--sample-voices", help="Comma-separated Kokoro voices; render samples and exit")
    parser.add_argument("--sample-scene", type=int, default=0)
    parser.add_argument("--sample-language", choices=["en", "es"], default="en")
    args = parser.parse_args()

    if args.ffmpeg:
        ffmpeg = args.ffmpeg
    else:
        try:
            import imageio_ffmpeg
        except ImportError as error:
            raise SystemExit("Pass --ffmpeg or install imageio-ffmpeg in the rendering environment") from error
        ffmpeg = Path(imageio_ffmpeg.get_ffmpeg_exe())

    args.output.mkdir(parents=True, exist_ok=True)

    if (args.narrator == "kokoro" and not args.narration_root) or args.sample_voices:
        if not args.kokoro_model or not args.kokoro_voices:
            raise SystemExit("Kokoro requires --kokoro-model and --kokoro-voices")

    if args.sample_voices:
        kokoro = load_kokoro(args.kokoro_model, args.kokoro_voices, args.kokoro_python_path)
        if not 0 <= args.sample_scene < len(SCENES):
            raise SystemExit(f"--sample-scene must be between 0 and {len(SCENES) - 1}")
        for voice in [item.strip() for item in args.sample_voices.split(",") if item.strip()]:
            sample_text = SCENES[args.sample_scene][f"narration_{args.sample_language}"]
            sample_path = args.output / f"{voice}.wav"
            synthesize_kokoro(kokoro, sample_text, sample_path, voice, args.kokoro_speed)
            print(f"Rendered {sample_path}")
        return

    video = args.output / "qa-flowkit-rf101-demo.mp4"
    teaser = args.output / "qa-flowkit-rf101-demo.gif"
    thumbnail = args.output / "qa-flowkit-rf101-demo-thumbnail.png"
    captions_es = args.output / "qa-flowkit-rf101-demo.es.vtt"
    captions_en = args.output / "qa-flowkit-rf101-demo.en.vtt"
    write_vtt(captions_es, "subtitle_es")
    write_vtt(captions_en, "subtitle_en")

    with tempfile.TemporaryDirectory(prefix="qa-flowkit-demo-") as tmp_name:
        tmp = Path(tmp_name)
        manifest = tmp / "frames.txt"
        manifest_lines = []
        for index, scene in enumerate(SCENES):
            frame = render_scene(scene)
            frame_path = tmp / f"scene-{index:02d}.png"
            frame.save(frame_path, optimize=True)
            if index == 0:
                frame.save(thumbnail, optimize=True)
            duration = scene["end"] - scene["start"]
            manifest_lines.extend([f"file '{frame_path.as_posix()}'", f"duration {duration}"])

        final_frame = tmp / f"scene-{len(SCENES) - 1:02d}.png"
        manifest_lines.append(f"file '{final_frame.as_posix()}'")
        manifest.write_text("\n".join(manifest_lines), encoding="utf-8")

        narration_en = build_language_audio(args, ffmpeg, tmp, "en", args.kokoro_voice_en)
        narration_es = build_language_audio(args, ffmpeg, tmp, "es", args.kokoro_voice_es)
        video_en = tmp / "qa-flowkit-rf101-demo-en.mp4"

        run([
            str(ffmpeg),
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(manifest),
            "-i",
            str(narration_en),
            "-vf",
            f"fps={FPS},format=yuv420p",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "20",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            "-t",
            str(SCENES[-1]["end"]),
            str(video_en),
        ])
        run([
            str(ffmpeg),
            "-y",
            "-i",
            str(video_en),
            "-i",
            str(narration_es),
            "-map",
            "0:v:0",
            "-map",
            "0:a:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a:0",
            "copy",
            "-c:a:1",
            "aac",
            "-b:a:1",
            "128k",
            "-metadata:s:a:0",
            "language=eng",
            "-metadata:s:a:0",
            "title=English",
            "-disposition:a:0",
            "default",
            "-metadata:s:a:1",
            "language=spa",
            "-metadata:s:a:1",
            "title=Espa\u00f1ol",
            "-disposition:a:1",
            "0",
            "-movflags",
            "+faststart",
            str(video),
        ])

        palette = tmp / "palette.png"
        run([
            str(ffmpeg),
            "-y",
            "-ss",
            "46",
            "-t",
            "36",
            "-i",
            str(video),
            "-vf",
            "fps=8,scale=960:-1:flags=lanczos,palettegen=stats_mode=diff",
            str(palette),
        ])
        run([
            str(ffmpeg),
            "-y",
            "-ss",
            "46",
            "-t",
            "36",
            "-i",
            str(video),
            "-i",
            str(palette),
            "-lavfi",
            "fps=8,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3",
            "-loop",
            "0",
            str(teaser),
        ])

    print(f"Rendered {video}")
    print(f"Rendered {teaser}")
    print(f"Rendered {thumbnail}")
    print(f"Rendered {captions_es}")
    print(f"Rendered {captions_en}")


if __name__ == "__main__":
    main()
