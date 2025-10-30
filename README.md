# Stipple Effect App (Icon Mode)

Minimal working prototype to generate icon-based stipple previews for images. Built with React + Vite + TypeScript. Supports adjustable density, size, threshold, dispersion, and rotation variance with a cursor icon renderer.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite, load an image, and tweak parameters.

## Notes
- Preview uses a simple edge detector and an inexpensive edge-distance approximation for performance.
- Export and video processing are placeholders for future iterations.

## Roadmap
- Video: frame extraction + worker-based processing
- Export: PNG/JPG/MP4 via canvas capture / ffmpeg.wasm
- Custom icons: SVG upload and library


