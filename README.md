# Glance Library

A [Decky Loader](https://decky.xyz) plugin for Steam's Game Mode. It enhances Steam's Library with **Spotlight Library**: a modern, cinematic two-panel library view with full-bleed hero artwork, dynamic accent glow, integrated inspector details, and TabMaster category synchronization.

Glance Library works as a **standalone plugin** or side-by-side with [Game Glance](https://github.com/michpalm/game-glance) without route or patch conflicts.

---

## ✨ Features

- **Spotlight Library 2-Panel View**: Replaces Steam's native Library route (`/library/games`, `/library/all`, `/library`) with an immersive split interface:
  - **Left / Center**: Configurable game card grid or collection drawer with smooth scrolling.
  - **Right**: Rich inspector panel showing high-res portrait/square/logo artwork, HowLongToBeat times, hours played, achievements progress bar, install size, and full game descriptions.
- **Dynamic Accent Glow**: Extracts and samples vibrant accent colors directly from each game's hero art to illuminate card selections and ambient glows.
- **TabMaster Integration**: Automatically syncs with TabMaster tabs and filters (Favorites, Installed, Non-Steam, Soundtracks, Collections) with real-time fallback to native categories.
- **Visuals & Density Customization**:
  - Configurable grid columns for games (2 to 5 columns).
  - Configurable collection drawer density (3 to 6 columns).
  - **Game Logos**: Toggle game logo art in the inspector preview.
  - **Unhighlight Uninstalled Games**: Visually dim and desaturate uninstalled titles for rapid browsing.
  - **Pulsing Background**: Subtle ambient breathing animation for hero background art.
  - **Zoom Transitions**: Fluid scaling animation when opening and returning from games.
- **Controller & Touch First**: Full gamepad navigation (D-pad/stick, bumper tab switching, View/Menu context actions) and responsive touchscreen / mouse support.
- **Non-Steam Support**: Seamlessly displays non-Steam titles, Heroic launcher games, and custom shortcuts with artwork fallbacks.

---

## 🎮 Navigation & Controls

| Action | Controller | Touch / Mouse |
|---|---|---|
| **Navigate Grid** | D-Pad / Left Stick | Drag / Scroll wheel |
| **Open Game** | `A` Button | Tap game card |
| **Game Context Menu** | `View` / `Select` Button | Right-click / Tap menu gear |
| **Switch Categories** | `L1` / `R1` Bumpers | Tap category bar pill |
| **Focus Inspector / Scroll Info** | Right Stick / Touch | Scroll inspector panel |
| **Back to Collections / Exit** | `B` Button | Tap back arrow button |

---

## ⚙️ Settings (Quick Access Menu)

Open the Decky Quick Access Menu (`...` button) and select **Glance Library**:

- **Spotlight Library**: Toggle the custom 2-panel view on or off (instantly falling back to native Steam Library when disabled).
- **Game Columns**: Adjust grid density from 2 to 5 columns.
- **Collection Columns**: Adjust collection grid density from 3 to 6 columns.
- **Sync with TabMaster**: Harmonize tabs with TabMaster configuration.
- **Game Logos**: Toggle transparent logo art in the inspector preview.
- **Unhighlight Uninstalled Games**: Mute accent and tone down uninstalled game cards.
- **Pulsing Background**: Ambient breathing motion on hero artwork.
- **Zoom Transition**: Smooth transition animations on launch.

---

## 🛠️ Building & Development

Prerequisites: Node.js 18+ and pnpm / npm.

```bash
# Install dependencies
npm install

# Type-check TypeScript
npm run typecheck

# Run test suite
npm test

# Build production bundle
npm run build
```

---

## 🤝 Relationship to Game Glance

Glance Library originated from the upstream [Game Glance](https://github.com/shak18/game-glance) project. While Game Glance focuses on the full-screen Game Details page and Spotlight Home, **Glance Library** is dedicated solely to crafting the ultimate Steam Library companion experience.
