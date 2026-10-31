#!/usr/bin/env python3
"""Render a silent, labelled preview from verified CLI captures; never publish assets."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import textwrap

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1920, 1080
FPS = 24
SCENES = [
    ("install", 10, "Install the local package / Instalar el paquete local"),
    ("manual-init", 15, "Configure the quick track / Configurar el flujo rápido"),
    ("start", 10, "RF-101 requirement saved; fixture replay / Requisito guardado; fixtures"),
    ("normalize", 10, "Reviewed fixtures copied between phases / Fixtures copiados entre fases"),
    ("approve", 10, "Fixture approval, not independent review / Aprobación del fixture"),
    ("invalid", 15, "Missing @manual tag: check fails / Falta @manual: el control falla"),
    ("corrected", 10, "Corrected fixture copied and checked / Fixture corregido y validado"),
    ("feature", 10, "Folder warning is advisory / La advertencia de carpeta no bloquea"),
    ("completed", 10, "Run complete: local artifacts only / Flujo completado: artefactos locales"),
    ("target", 10, "Strict target gate passes / Pasa la validación final del repositorio"),
    ("closing", 5, "Read Getting Started and Terminal Transcripts / Consulta las guías"),
]


def font(size, mono=False):
    names = (["C:/Windows/Fonts/consola.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]
             if mono else ["C:/Windows/Fonts/segoeui.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"])
    for name in names:
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    raise RuntimeError("A TrueType font is required for a readable preview")


def output_lines(item):
    """Preserve actual fields; show validator diagnostics as an explicitly labelled excerpt."""
    if item["id"] == "invalid":
        data = json.loads(item["stdout"])
        lines = json.dumps({key: data[key] for key in ("ok", "phaseId")}, indent=2).splitlines()
        lines += ["", "validation.results diagnostics (actual excerpt):"]
        for result in data["validation"]["results"]:
            lines += result["diagnostics"].splitlines()
        return lines
    if item["id"] == "target":
        data = json.loads(item["stdout"])
        return [json.dumps({"ok": data["ok"]}), "", "validators (actual name/status fields):"] + [
            f'{v["name"]}: {v["status"]}' for v in data["validators"]]
    if item["id"] == "completed":
        data = json.loads(item["stdout"])
        return [json.dumps({key: data[key] for key in ("rfId", "status")}), "", "phases (actual id/status fields):"] + [
            f'{phase["id"]}: {phase["status"]}' for phase in data["phases"]]
    return item["stdout"].splitlines()


def frame(item, title, source):
    image = Image.new("RGB", (WIDTH, HEIGHT), "#071018")
    draw = ImageDraw.Draw(image)
    draw.text((65, 30), "QA FlowKit | RF-101", font=font(38), fill="#e8f0f6")
    draw.text((65, 90), "PREVIEW / rendered CLI / fixture replay / no agent session", font=font(30), fill="#f0c66b")
    draw.text((65, 144), title, font=font(30), fill="#50c8e8")
    draw.rounded_rectangle((55, 210, 1865, 930), radius=16, fill="#0d1823")
    if item is None:
        lines = ["docs/qa-ai/getting-started.md", "docs/qa-ai/terminal-transcripts.md", "",
                 "Local artifact validation is not execution of login tests.",
                 "No external writes, live-host certification or independent review.", "",
                 "Published media remains unchanged pending preview review.",
                 "Silent preview: bilingual on-screen text, no audio tracks."]
    else:
        lines = ["$ " + item["command"], ""] + output_lines(item)
        if item.get("stderr"):
            lines += ["stderr:"] + item["stderr"].splitlines()
    wrapped = [part for line in lines for part in (textwrap.wrap(line, width=103, replace_whitespace=False) or [""])]
    # Select explicitly labelled init excerpts rather than silently clipping a screen.
    if len(wrapped) > 17 and item and item["id"] == "manual-init":
        wrapped = ["$ " + item["command"], "", "stdout excerpt:"] + [
            line for line in item["stdout"].splitlines()
            if line.startswith(("Using ", "created .qa-ai/qa-ai.config", "created .qa-ai/features", "created .qa-ai/output"))]
        wrapped = [part for line in wrapped for part in (textwrap.wrap(line, width=103) or [""])]
    if len(wrapped) > 17:
        raise ValueError(f'Text overflow in {item["id"] if item else "closing"}: {len(wrapped)} lines')
    for index, line in enumerate(wrapped):
        draw.text((85, 235 + index * 38), line, font=font(27, mono=True), fill="#e8f0f6")
    if item:
        draw.text((85, 878), f'Exit {item["exitCode"]} | ' + ("selected actual fields / excerpt" if item["selectedFields"] else "captured output / excerpt"),
                  font=font(25), fill="#ff7185" if item["exitCode"] else "#59d499")
    draw.text((65, 960), f'Local npm tarball | Node {source["node"]} | source base {source["sourceCommit"][:12]}', font=font(25), fill="#8ea2b2")
    draw.text((65, 1008), "No registry-release verification. Published video and audio are not replaced.", font=font(25), fill="#8ea2b2")
    return image


def stamp(seconds):
    return f"{seconds // 3600:02d}:{seconds // 60 % 60:02d}:{seconds % 60:02d}.000"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--ffmpeg", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    output = args.output_dir.resolve()
    if output == root or root in output.parents:
        parser.error("Preview output must be outside the repository")
    output.mkdir(parents=True, exist_ok=False)
    source = json.loads(args.capture.read_text(encoding="utf-8"))
    commands = {item["id"]: item for item in source["commands"]}
    assert commands["invalid"]["exitCode"] == 1
    assert json.loads(commands["completed"]["stdout"])["status"] == "completed"
    assert json.loads(commands["target"]["stdout"])["ok"] is True
    ffmpeg = args.ffmpeg or shutil.which("ffmpeg")
    if not ffmpeg:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    # Validate every screen before spending time encoding, and never silently truncate output.
    images = [frame(None if key == "closing" else commands[key], title, source) for key, _, title in SCENES]
    segments, captions, cursor = [], ["WEBVTT", ""], 0
    for index, (key, duration, title) in enumerate(SCENES):
        image = output / f"scene-{index:02d}.png"
        images[index].save(image)
        segment = output / f"scene-{index:02d}.mp4"
        subprocess.run([str(ffmpeg), "-hide_banner", "-loglevel", "error", "-n", "-loop", "1", "-i", str(image),
                        "-t", str(duration), "-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "20",
                        "-pix_fmt", "yuv420p", "-an", str(segment)], check=True)
        segments.append(f"file '{segment.name}'")
        captions += [f"{stamp(cursor)} --> {stamp(cursor + duration)}", title, ""]
        cursor += duration
    listing = output / "segments.txt"
    listing.write_text("\n".join(segments), encoding="utf-8")
    subprocess.run([str(ffmpeg), "-hide_banner", "-loglevel", "error", "-n", "-f", "concat", "-safe", "0",
                    "-i", str(listing), "-c", "copy", "-movflags", "+faststart", str(output / "rf101-preview.mp4")], check=True)
    (output / "rf101-preview.vtt").write_text("\n".join(captions), encoding="utf-8")
    print(f"Silent preview: {output / 'rf101-preview.mp4'} ({cursor}s, {WIDTH}x{HEIGHT}, {FPS}fps)")


if __name__ == "__main__":
    main()
