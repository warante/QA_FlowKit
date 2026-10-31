#!/usr/bin/env python3
"""Render an illustrated slash-command tutorial, never a fabricated model session.

Windows narration uses installed SAPI voices. Pillow/FFmpeg and output stay external.
"""
from __future__ import annotations

import argparse
import array
import json
from pathlib import Path
import shutil
import subprocess
import textwrap
import wave

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT, FPS = 1920, 1080, 24
SPEECH_SCRIPT = r'''
param([string]$Storyboard, [string]$Output)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$data = Get-Content -LiteralPath $Storyboard -Raw -Encoding UTF8 | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $synth.Rate = 1
  foreach ($lang in @('es', 'en')) {
    $culture = if ($lang -eq 'es') { 'es-ES' } else { 'en-US' }
    $voice = $synth.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq $culture } | Select-Object -First 1
    if (-not $voice) { throw "No installed voice for $culture" }
    $synth.SelectVoice($voice.VoiceInfo.Name)
    foreach ($scene in $data.scenes) {
      $file = Join-Path $Output ($scene.id + '-' + $lang + '.wav')
      $synth.SetOutputToWaveFile($file)
      $synth.Speak([string]$scene.narration.$lang)
      $synth.SetOutputToNull()
    }
  }
} finally { $synth.Dispose() }
'''


def font(size, mono=False):
    candidates = (["C:/Windows/Fonts/consola.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]
                  if mono else ["C:/Windows/Fonts/segoeui.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"])
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    raise RuntimeError("A readable TrueType font is required")


def draw_line(draw, xy, text, size, color, mono=False):
    face = font(size, mono)
    if draw.textbbox(xy, text, font=face)[2] > WIDTH - 70:
        raise ValueError(f"Horizontal text overflow: {text}")
    draw.text(xy, text, font=face, fill=color)


def render(scene, index, count):
    image = Image.new("RGB", (WIDTH, HEIGHT), "#071018")
    draw = ImageDraw.Draw(image)
    draw_line(draw, (70, 34), "QA FlowKit  /  RF-101", 40, "#edf5fa")
    draw_line(draw, (70, 98), "PREVIEW · Guía ilustrada / Illustrated tutorial · No live model session", 26, "#f0c66b")
    draw_line(draw, (70, 155), scene["title"]["es"], 43, "#50c8e8")
    draw_line(draw, (70, 215), scene["title"]["en"], 30, "#8ea2b2")
    location = ("TERMINAL · solo instalación / installation only" if scene["surface"] == "terminal"
                else "DENTRO DEL CLI DEL MODELO / INSIDE THE MODEL'S CLI")
    draw.rounded_rectangle((65, 285, 1855, 530), radius=20, fill="#132334")
    draw_line(draw, (95, 310), location, 28, "#a792ff")
    commands = scene["commands"] or ["Revisa la propuesta y responde / Review the proposal and respond"]
    for row, command in enumerate(commands):
        draw_line(draw, (95, 380 + row * 65), command, 37, "#edf5fa", mono=bool(scene["commands"]))
    draw_line(draw, (75, 575), "Qué haces / Your action", 30, "#59d499")
    y = 630
    for language in ("es", "en"):
        color = "#edf5fa" if language == "es" else "#8ea2b2"
        for note in scene["notes"][language]:
            for line in textwrap.wrap(note, width=100):
                draw_line(draw, (85, y), line, 29, color)
                y += 43
        y += 15
    if y > 965:
        raise ValueError(f"Vertical text overflow: {scene['id']}")
    draw.rounded_rectangle((70, 980, 1850, 989), radius=4, fill="#24364a")
    draw.rounded_rectangle((70, 980, 70 + int(1780 * (index + 1) / count), 989), radius=4, fill="#50c8e8")
    draw_line(draw, (70, 1010), "Comandos de usuario, no respuestas simuladas / User commands, no simulated model replies", 24, "#8ea2b2")
    return image


def timestamp(seconds):
    return f"{seconds // 3600:02d}:{seconds // 60 % 60:02d}:{seconds % 60:02d}.000"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--storyboard", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--ffmpeg", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    output = args.output_dir.resolve()
    if output == root or root in output.parents:
        parser.error("Preview must be rendered outside the repository")
    data = json.loads(args.storyboard.read_text(encoding="utf-8"))
    if data["kind"] != "illustrated-agent-first-tutorial" or data["liveModelSession"] is not False:
        parser.error("Storyboard must explicitly identify an illustrated, non-live tutorial")
    if sum(scene["duration"] for scene in data["scenes"]) != data["durationSeconds"]:
        parser.error("Storyboard durations do not match")
    for index, scene in enumerate(data["scenes"]):
        expected_surface = "terminal" if index == 0 else "model-cli"
        if scene["surface"] != expected_surface:
            parser.error("Only the first scene may use the terminal")
        for command in scene["commands"]:
            if index == 0 and command not in ("npx qa-flowkit", "npx qa-flowkit@rc"):
                parser.error("Terminal scene must contain installation only")
            if index > 0:
                name = command.split()[0]
                if not name.startswith("/qa-") or not (root / ".qa-ai/adapters/shared/commands" / (name[1:] + ".md")).is_file():
                    parser.error(f"Unknown slash command: {name}")
    images = [render(scene, index, len(data["scenes"])) for index, scene in enumerate(data["scenes"])]
    output.mkdir(parents=True, exist_ok=False)
    ffmpeg = args.ffmpeg or shutil.which("ffmpeg")
    if not ffmpeg:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    script = output / "narrate.ps1"
    script.write_text(SPEECH_SCRIPT, encoding="utf-8-sig")
    subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-File", str(script),
                    "-Storyboard", str(args.storyboard.resolve()), "-Output", str(output)], check=True)
    # Never truncate narration to fit the storyboard silently.
    for scene in data["scenes"]:
        for language in ("es", "en"):
            with wave.open(str(output / f'{scene["id"]}-{language}.wav')) as audio:
                seconds = audio.getnframes() / audio.getframerate()
                if audio.getsampwidth() != 2:
                    raise ValueError("Expected 16-bit SAPI narration")
                samples = array.array("h", audio.readframes(audio.getnframes()))
                if seconds < 1 or not samples or max(abs(sample) for sample in samples) <= 100:
                    raise ValueError(f'Empty or silent narration: {scene["id"]}/{language}')
            if seconds > scene["duration"] - 0.25:
                raise ValueError(f'Narration too long: {scene["id"]}/{language}: {seconds:.2f}s')
    captions = {language: ["WEBVTT", ""] for language in ("es", "en")}
    segments, cursor = [], 0
    for index, scene in enumerate(data["scenes"]):
        image = output / f"scene-{index:02d}.png"
        images[index].save(image)
        segment = output / f"scene-{index:02d}.mp4"
        duration = scene["duration"]
        subprocess.run([str(ffmpeg), "-hide_banner", "-loglevel", "error", "-n", "-loop", "1", "-i", str(image),
                        "-i", str(output / f'{scene["id"]}-es.wav'), "-i", str(output / f'{scene["id"]}-en.wav'),
                        "-filter_complex", f"[1:a]apad,atrim=duration={duration},aresample=48000[es];[2:a]apad,atrim=duration={duration},aresample=48000[en]",
                        "-map", "0:v", "-map", "[es]", "-map", "[en]", "-t", str(duration), "-r", str(FPS),
                        "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-b:a", "128k", "-ac", "1", str(segment)], check=True)
        segments.append(f"file '{segment.name}'")
        for language in captions:
            captions[language] += [f"{timestamp(cursor)} --> {timestamp(cursor + duration)}", scene["narration"][language], ""]
        cursor += duration
    listing = output / "segments.txt"
    listing.write_text("\n".join(segments), encoding="utf-8")
    for language, lines in captions.items():
        (output / f"agent-first.{language}.vtt").write_text("\n".join(lines), encoding="utf-8")
    video = output / "qa-flowkit-agent-first-preview.mp4"
    subprocess.run([str(ffmpeg), "-hide_banner", "-loglevel", "error", "-n", "-f", "concat", "-safe", "0", "-i", str(listing),
                    "-i", str(output / "agent-first.es.vtt"), "-i", str(output / "agent-first.en.vtt"),
                    "-map", "0", "-map", "1:s", "-map", "2:s", "-c", "copy", "-c:s", "mov_text",
                    "-metadata:s:a:0", "language=spa", "-metadata:s:a:0", "title=Español",
                    "-metadata:s:a:1", "language=eng", "-metadata:s:a:1", "title=English",
                    "-disposition:a:0", "default", "-disposition:a:1", "0",
                    "-metadata:s:s:0", "language=spa", "-metadata:s:s:1", "language=eng",
                    "-disposition:s:0", "0", "-disposition:s:1", "0", "-movflags", "+faststart", str(video)], check=True)
    images[1].save(output / "agent-first-thumbnail.png")
    thumbnails = [image.resize((768, 432)) for image in images]
    thumbnails[0].save(output / "agent-first-preview.gif", save_all=True, append_images=thumbnails[1:],
                       duration=[scene["duration"] * 1000 for scene in data["scenes"]], loop=0)
    (output / "storyboard.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Illustrated preview: {video} ({cursor}s, 1080p, Spanish/English audio + captions)")


if __name__ == "__main__":
    main()
