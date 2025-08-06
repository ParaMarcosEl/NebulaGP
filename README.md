# 🚀 Antigravity Flight Game

A futuristic 3D racing flight simulator built with [React Three Fiber](https://github.com/pmndrs/react-three-fiber), featuring physics-driven flight mechanics, bot opponents, checkpoint tracking, and a live minimap overlay.

---

## ✈️ Features

- 🌀 **Full 3D antigravity flight** with pitch, roll, and free motion
- 🎮 **Keyboard & Gamepad support** (PlayStation-style mapping)
- 🤖 **AI Bot Racers** that follow the same track
- 🧭 **Checkpoint & Lap Tracking** using spline-based progress
- 🗺️ **Mini-map HUD** with player and bot overlays
- 🎥 **Dynamic follow camera** with smooth motion
- 💥 **Real-time collisions** and bounce physics
- 🧠 **Inertia-based flight physics** (damped velocity & rotation)
- ⚙️ **Modular controllers** for aircraft, camera, game state, and race logic

---

## 🧩 Tech Stack

| Library           | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| React             | UI framework                                       |
| React Three Fiber | Three.js bindings for React                        |
| Three.js          | 3D rendering engine                                |
| Zustand           | Global game state management                       |
| Drei              | R3F helpers (e.g., `useGLTF`, `PerspectiveCamera`) |
| TypeScript        | Type safety and clarity                            |

---

## 🕹️ Controls

### Keyboard

| Key       | Action            |
| --------- | ----------------- |
| `W` / `S` | Pitch Up / Down   |
| `A` / `D` | Roll Left / Right |
| `I`       | Accelerate        |
| `K`       | Brake             |

### Gamepad (PlayStation-style)

| Button     | Action     |
| ---------- | ---------- |
| `X`        | Accelerate |
| `Square`   | Brake      |
| Left Stick | Pitch/Roll |

> Gamepad support uses the [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)

---

## 📺 UI & HUD

- Speedometer with current ship speed
- Mini-map with curve projection and real-time markers
- Lap counter and checkpoint tracking

---

## 🧠 Physics

- Rotational damping for realistic flight inertia
- Linear motion with velocity smoothing
- Curve clamping and bounce response on collision
- Spline-based progression system for position tracking

---

## 📁 Project Structure

```bash
/components
├── Aircraft.tsx # Player controller
├── BotCraft.tsx # Bot AI movement controller
├── FollowCamera.tsx # Smooth-following camera
├── Track.tsx # Tunnel/boundary mesh
├── Checkpoint.tsx # Checkpoint triggers
├── MiniMap.tsx # SVG 2D overview
├── HUD.tsx # On-screen flight status

/controllers
├── GameController.ts # Zustand global game state
├── RaceProgressController.ts # Updates player/bot positions and progress
├── CheckpointController.ts # Manages checkpoint passing and lap tracking

/lib
├── flightPath.ts # Curve definition for the tunnel
├── utils.ts # Curve utilities (progress calc, formatting)

public/
└── models/spaceship.glb # Placeholder for 3D models
```

---

## 🏁 Roadmap

- ✅ Spline-based race track
- ✅ Procedural track generation
- ✅ Player and bot race tracking
- ✅ Mini-map with 2D projection
- ✅ Per-lap timers and leaderboard logic
- 🔲 Visual effects (boost trails, thruster fire, sparks)
- 🔲 Music & Sound effects (Engines, weapons, UI)
- 🔲 Multiplayer support (websocket sync)
- 🔲 Custom spaceship models and upgrades

## 🧠 Inspiration

Inspired by:

- Wipeout – futuristic aesthetic and high-speed style

- Rocket League – flight mechanics
