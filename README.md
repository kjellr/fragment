# Fragment

A browser-based particle shader studio. Upload an image or video, type some text, or let the particles swarm freely — then shape the result with real-time controls.

**[Try it →](https://kjellr.github.io/fragment/)**

---

## Effects

**Image** — Particles sample pixel positions and colors from an uploaded image. Cursor scatters them; they spring back.

**Video** — Particle density tracks luminance in a live video feed. Particles scatter on load and resolve into the frame.

**Text** — Particles form any text you type, in a selection of typefaces. Cursor scatters them; they reform.

**Swarm** — Curl-noise particle field with no input required. Cursor attracts; particles orbit and flow.

**Grid** — A fullscreen dot grid that reacts to cursor movement and ripple clicks.

## Controls

Each effect exposes relevant parameters via sliders — spring tension, noise scale, repel radius, brightness, zoom, particle count, and more. A palette section lets you pick from presets, choose custom colors, or pull colors directly from the source image or video.

## Built with

- [Next.js](https://nextjs.org/) — framework
- [Three.js](https://threejs.org/) — WebGL rendering
- [simplex-noise](https://github.com/jwagner/simplex-noise) — curl noise for organic particle motion
- [Tailwind CSS](https://tailwindcss.com/) — styling

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
