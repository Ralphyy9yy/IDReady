# IDReady product demo

- `idready-demo.mp4`: 1280 × 720, 24 fps, H.264 video and AAC stereo audio; approximately 66 seconds.
- `poster.jpg`: preview image.
- `captions.vtt`: full narration subtitles.

The video uses the repository's real home-screen screenshot and original motion-graphic illustrations. Editing and sheet examples are labeled as illustrative. Narration uses the locally installed Microsoft Zira voice. The instrumental bed is synthesized in the renderer rather than downloaded from a music service.

## Regenerate on Windows

Requires Python, Pillow, numpy, imageio-ffmpeg, Windows PowerShell, and the Microsoft Zira Desktop speech voice.

```powershell
python -m pip install Pillow numpy
python -m pip install --target .demo-tools imageio-ffmpeg
powershell -ExecutionPolicy Bypass -File scripts/demo/narrate.ps1
python scripts/demo/render.py
```

Run from the repository root. Intermediate audio and encoder logs are written under the ignored `docs/demo/work/` directory. Edit `scripts/demo/scenes.json` to change narration and headings, then regenerate both narration and video.

The application itself does not depend on Python or these video-production tools.
