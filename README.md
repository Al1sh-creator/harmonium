# 🎵 Harmonium

A browser-based software harmonium you can play entirely from your keyboard — no plugins or dependencies required.

## Features

- 🎹 **Piano keyboard** — play notes with your computer keys
- 🪗 **Bellows system** — pump with the Spacebar or hold the on-screen button to control volume, just like a real harmonium
- 🕉️ **Drone notes** — toggle continuous background hum strings (Sa, Re, Ga, Ma, Pa, Dha, Ni)
- 🎵 **Octave shifter** — move up/down 5 octaves
- 🌀 **Reverb & Volume** — adjustable via keyboard or sliders
- 📷 **Camera mode** (optional) — tilt your laptop screen to control bellows via webcam brightness

## Getting Started

No installation needed. Just serve the files with any local HTTP server.

**Option 1 — Python (recommended):**
```bash
python -m http.server 8000
```

**Option 2 — Node.js:**
```bash
npx serve .
```

Then open **http://localhost:8000** in your browser.

> **Note:** You can also just double-click `index.html` to open it directly. Camera mode requires a local server (browsers block camera on `file://` URLs), but all keyboard features work without one.

## Keyboard Shortcuts

| Action | Key |
|---|---|
| White keys | `A` `S` `D` `F` `G` `H` `J` `K` |
| Black keys | `W` `E` `T` `Y` `U` |
| Pump bellows | `Space` |
| Octave up / down | `↑` / `↓` |
| Volume up / down | `=` / `-` |
| Reverb up / down | `]` / `[` |
| Toggle drone Sa–Ni | `1` `2` `3` `4` `5` `6` `7` |

## Files

```
harmonium/
├── index.html   # App structure
├── style.css    # Styling
├── app.js       # Audio engine, keyboard input, bellows logic
└── README.md
```

## How the Bellows Work

A real harmonium makes sound by pumping a bellows that pushes air through reeds. This app simulates that:

- **Spacebar** — each tap adds a burst of air pressure that slowly decays
- **Hold-to-Pump button** — hold it down to continuously build pressure, release to let it fade
- **Camera mode** — uses your webcam brightness so tilting your laptop lid controls the pressure
