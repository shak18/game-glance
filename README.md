# Game Glance

A [Decky Loader](https://decky.xyz) plugin for Steam's Game Mode. It turns each game's page into a full-screen view
with everything about the game at a glance (how long it takes to beat, how far you are, what it is about and where it
came from), and can replace Steam's Home with **Spotlight Home** and Steam's Library with **Spotlight Library**:
your games, over their own art.

https://github.com/user-attachments/assets/7772cd5b-ac8c-428e-a612-e9d594454a50


## Features

- **Game page.** Full-screen art, how long the game takes to beat ([HowLongToBeat](https://howlongtobeat.com)), your play
  time and achievements, and where the game comes from. An optional **Clean look** shows less.
- **Spotlight Home.** An optional new Home screen (off by default): one game at a time over its art, a row of your
  recent games or a collection, and Friends, News and Recommended tabs one press down.
- **Touch.** On a handheld's touchscreen, tap a game to select it and again to open it, swipe the games row and the tabs'
  rows, swipe up for the tabs, and tap the game page's cards. A mouse clicks and drags the same way, scrolls the rows
  with the wheel and lights whatever you can click under the cursor.
- **Screensaver.** Steam's Game Slideshow, drawn with your games and their art, with logo and stats.
- **Non-Steam games.** Games added by [Heroic](https://heroicgameslauncher.com) or
  [Unifideck](https://github.com/mubaraknumann/unifideck) get their store, times and description too.
- **Works offline.** Times and descriptions are kept on the device.

<<<<<<< HEAD
With Spotlight Home on (or the Clean look), the page takes Spotlight Home's look: the game's title or logo with "Last
played" under it, just above a larger Play row in the game's colour, and the status bar at the top. With both off, the
page keeps its classic look.

## Spotlight Home

https://github.com/user-attachments/assets/e12cb973-b34c-4dff-8f94-b0b59762a67a

*Spotlight Home on a ROG Xbox Ally: picking games, then opening one in the Clean look and in the Spotlight look.*

![Spotlight Home on a TV: the game's logo, its chips, Play and the games row](docs/images/tv-home-logo.jpg)

An optional new Home screen, off by default (Quick Access → Game Glance → Spotlight Home).

- **One game at a time.** The selected game fills the screen with its art, its title (or logo) and when you last played
  it, chips for play time, achievements and HowLongToBeat's main story, a Play button and the game's buttons. The
  accent colour follows each game's art. The chips are filled in ahead of time for every game in the row, so they are
  there the moment you land on a game.
- **The games row.** Your recent games (up to 20, as many as Steam's own Home), or one of your collections (see Games
  row below). Games new to your library join the recent games, marked NEW. The selected game opens into a wide card;
  the row ends in a Library card.
- **Controls.** Left and Right pick a game, A opens its page, up reaches Play and the buttons. **L1 and R1** pick the
  previous or next game from anywhere above the tabs and put focus on Play (hold to keep going), so a game starts in two presses. Held,
  the d-pad and stick go at the same steady pace as L1 and R1. While you press quickly through the games only the
  highlight moves; the art and colour catch up once you stop. The gear button, or View/Select, opens Steam's own menu
  for the game.
- **Opening a game.** Home turns into the game's page: the art stays put while the title, Play and the buttons move to
  their places on the page and the chips grow into its cards.
- **Steam Cloud.** For games with cloud saves, Steam's and Unifideck's, a cloud button shows the sync state and opens
  Steam's sync dialog when there is a problem.
- **Status bar.** The time (12 or 24 hours, as set in Steam's Settings → System), battery (a bolt while charging, red
  under 20%), Wi-Fi or wired, and a dot for your own online status, at the top right, on Home and the game page. It steps aside for Steam's own top bar when you move up
  to it or open a Steam menu.
- **Press down for more.** Home itself stays clean; one press down brings up three tabs (L1 and R1 switch between them,
  with Steam's tab sound):
  - **What's new:** news for your games, and the games recently updated on this device.
  - **Friends:** your friends, in game first, then online, away and offline; A on a friend in a game you can join asks,
    then joins them. Under them, the games popular among your friends, with their pictures.
  - **Recommended:** Play next from your library, and, with Show wishlist deals on, up to six wishlist games on sale
    (the new price, then the old one struck through).
- **Safe.** If anything in Spotlight Home fails, you get Steam's own Home instead of a broken screen.

## Spotlight Library

![Spotlight Library: left inspector with game stats, right banner grid](docs/images/tv-game-library.gif)

An optional new Library screen, off by default (Quick Access → Game Glance → Spotlight Library).

- **Split layout.** Inspired by the Pegasus frontend: an inspector on the left and a banner grid on the right. The
  inspector displays the selected game's vertical cover, title, store and status pills, HowLongToBeat times, play
  time, achievements progress, and description.
- **Banner grid.** Games displayed as wide cards with your custom banner or hero artwork, glowing accent outlines in
  the game's colour, running indicators, and collection fan covers.
- **Grid density.** Choose from 3 to 7 columns in settings (Quick Access → Game Glance → Grid Columns) to fit
  handheld screens or docked 1080p/4K TVs.
- **Category ribbon.** Browse by Favorites, Installed, All Games, and your custom Steam Collections. L1 and R1 switch
  categories with Steam's tab sounds, or swipe horizontally across the ribbon.
- **Zoom transition.** Selecting a game or pressing A smoothly expands its banner into full screen before opening
  the game page, matching Spotlight Home's handoff motion.
- **Soundtracks and Non-Steam.** Soundtracks display square album art, listening time and quick play. Non-Steam games
  from Heroic or Unifideck show their store badges and launch seamlessly.
- **Controls & Navigation.** Fully navigable via gamepad, keyboard, mouse wheel, or direct touch. Left and Right
  navigate the grid, Up reaches the categories, A opens game details, and Y launches the game directly.
- **Safe.** If anything in Spotlight Library fails, you get Steam's own Library instead of a broken screen.

## Settings

Quick Access (…) → Game Glance:

| Setting | Default | What it does |
|---|---|---|
| Game Glance page | On | The full-screen game page. Off gives Steam's own game page. |
| Clean look | Off | The game page with only the art and one row at the bottom. |
| Spotlight Home | Off | The new Home, and its look on the game page. Off returns Steam's Home at once. |
| Spotlight Library | Off | The new 2-panel Library view. Off returns Steam's own Library at once. |
| Grid Columns | 3 | Number of poster/banner columns in the Spotlight Library grid (3 to 7). |
| Status bar | On | The clock, battery, connection and online status at the top right. |
| Game logo | Off | The game's logo in place of its name, on Home and the game page. A game without a logo keeps its name. Each logo is cropped to its artwork and sized so that wide and compact logos look about equally big. |
| Games row | Recent Games | What Home's row shows: your recent games, or one of your Steam collections (Favorites, Locally Installed Games and your own). With a collection, **Sort By** offers Last Played, Alphabetical or Date Added to Library, and the line under the title starts with the collection's name. |
| Show wishlist deals | Off | Wishlist games on sale in the Recommended tab (see Privacy). |
| Pre-load new games automatically | On | Fetches times and descriptions for new installs, every 30 minutes. |

Also in Quick Access:

- **HowLongToBeat match:** if a game matches the wrong entry or none, paste its HowLongToBeat link.
- **Pre-load game info for installed games:** fetches times and descriptions for every installed game, about one per
  second. A game that does not answer is skipped, and Stop ends it at once.
- **Reload Steam artwork:** refreshes heroes, logos and banners immediately if you changed artwork via SteamGridDB or Steam, without needing to restart Steam.
- **Clear cached data.**
- **Updates:** the installed version, **Update to …** when a newer release is out, and **Check for updates**.

## If Home shows an error

If Spotlight Home hits an error, it shows Steam's own Home instead and writes the error to a log file in the plugin's log folder:

`~/homebrew/logs/Game Glance/game-glance.log`

It also records each start-up with the log's path. Attach that file to the issue report. It keeps the newest entries and stays small.

## Fork improvements & highlights

This fork introduces several key enhancements and quality-of-life improvements:

- **Spotlight Library view:** A Pegasus-inspired 2-panel game library replacing Steam's default library with an
  inspector panel, customizable 3–7 column banner grids, collection fan covers, and sound-effects navigation.
- **Full Touch, Mouse & Wheel Support:**
  - **Spotlight Home:** Horizontal touch drag, swipe flick with momentum physics, mouse wheel scrolling, single-tap
    focus selection with second-tap activation, drag-click suppression, and click guards against accidental activations.
  - **Spotlight Library:** Touch drag, swipe momentum, and mouse wheel navigation across both the banner grid and the
    top category ribbon, with real-time focus reconciliation.
- **Live Artwork Reload & Direct Cache-Busting:** A dedicated "Reload Steam artwork" action in Quick Access that
  directly probes SteamGridDB custom asset folders and applies cache-busting queries, updating changed artwork
  instantly across all screens without restarting Steam.
- **Consistent Zoom Transitions:** Opening game details triggers an expanding full-screen banner zoom animation
  across both Spotlight Home and Spotlight Library.
- **Robustness & Edge Cases:** Improved handling for non-Steam games, soundtrack formats, offline cache persistence,
  and SteamOS client compatibility.


## Your language

Game Glance follows Steam's language and uses Steam's own words wherever Steam has them ("Última sesión" and "Tiempo de
juego" in Spanish, the collection and sort names, the cloud states and more). Unifideck's labels come from Unifideck. A
few words with no Steam equivalent stay in English: the HowLongToBeat column names and this Quick Access panel (see
[docs/localization.md](docs/localization.md)).

Every feature and setting is described in [docs/features.md](docs/features.md).

## Install

Game Glance is not in the Decky plugin store. Install it from a release:

1. In Game Mode, open Decky → Settings → General and turn on **Developer mode**.
2. Download `game-glance.zip` from the [latest release](../../releases/latest).
3. Decky → Settings → Developer → **Install plugin from ZIP** (or **Install plugin from URL** with the release asset's
   link).

Updates install from Game Mode: Game Glance checks for a new release once a day, and Quick Access → Game Glance →
Updates shows **Update to …**, which hands it to Decky to confirm, install and reload Game Glance.

If you use **HLTB for Deck**, you can uninstall it; Game Glance shows the same times on the game page.

## Settings

Find them in Quick Access (…) → Game Glance. The full list, with defaults, is in
[docs/features.md](docs/features.md#settings).

## Compatibility

Tested on a ROG Xbox Ally running Bazzite, handheld and docked to a 1080p TV; the layout follows the screen size. It
should work on a Steam Deck and other SteamOS-like devices, but that has not been tested.

Steam updates can rename the parts of the page Game Glance styles. When that happens, it turns its layout off and you
get Steam's normal page with the cards on it, rather than a broken page.
[docs/device-checklist.md](docs/device-checklist.md) lists what to check after an update.

Known limit: Steam keeps no "last played" game for friends, so Game Glance remembers the last game it saw each friend
play and shows it once they are away or offline.

## Privacy

Game Glance talks to two sites for game data: howlongtobeat.com (times) and store.steampowered.com (descriptions). It
sends game names and Steam app IDs, nothing about you.

- **Show wishlist deals** (off by default) sends your Steam ID to Steam's web API (api.steampowered.com) to read your
  public wishlist, then asks the store for the prices of its games.
- **Updates:** once a day, and when you press Check for updates, Game Glance asks api.github.com for the latest
  release's version and download link. It sends nothing about you.
- **Steam client:** Spotlight Home's news, friends, status bar and art come from the Steam client, as on Steam's own
  Home, and the family owner's name comes from your friends list. Images not yet stored on the device load from Steam's
  image servers.
- **Screensaver:** it looks nothing up. Its times and achievement counts are only what Game Glance already saved on the
  device.

Everything Game Glance stores stays on the device, in Decky's settings folder.

## If something goes wrong

If Spotlight Home hits an error, it shows Steam's own Home instead and writes the error to a log file:

`~/homebrew/logs/Game Glance/game-glance.log`

Attach that file to an issue report. Review it first and remove anything personal. It keeps the newest entries and stays
small.

## Development

```bash
pnpm install
pnpm test                         # frontend tests
python3 -m venv .venv && .venv/bin/pip install pytest && .venv/bin/pytest tests/py
pnpm check:hltb                   # live check against howlongtobeat.com
scripts/package.sh                # builds out/game-glance.zip
```

A release is a GitHub release tagged `vX.Y.Z` (the version in `package.json`) with `out/game-glance.zip` attached as
`game-glance.zip`; the built-in updater compares that tag with the installed version. Release notes are in
[docs/release-notes](docs/release-notes).

`scripts/serve.sh` serves the zip on your network for **Install plugin from URL**. The `scripts/cef-*.mjs` helpers
drive Steam's UI through remote CEF debugging; see the device checklist for the setup.

## Contributing and support

- **Bugs and ideas:** [open an issue](https://github.com/michpalm/game-glance/issues/new/choose). Planned work and
  what's in progress are on the [project board](https://github.com/users/michpalm/projects/2).
- **Testing:** if you want to help test changes on your device, [volunteer as a tester](https://github.com/michpalm/game-glance/issues/new?template=tester-interest.yml).
  Testing is optional. See the [community testing guide](docs/community-testing.md).
- **Support:** Game Glance is free, and support is optional. It does not buy priority support or influence over the
  roadmap; it helps keep the project going when I have time.

[![Support Game Glance on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/michpalm)

## About this project

This is a personal project, maintained on a best-effort basis. Steam and HowLongToBeat change without notice, so expect
occasional breakage; issues are welcome.

The code was written with [Claude](https://claude.ai) (Anthropic's AI), directed, reviewed and tested on device by the
author.

## Credits

- HowLongToBeat lookup code from [HLTB for Deck](https://github.com/morwy/hltb-for-deck) (MIT), including the fix from
  its pull request #68 by beallio. See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
- Times from [HowLongToBeat](https://howlongtobeat.com). Store icons from Simple Icons and Font Awesome via
  [react-icons](https://react-icons.github.io/react-icons/).
- Not affiliated with Valve, HowLongToBeat, ASUS or any store shown.

## License

[MIT](LICENSE)
