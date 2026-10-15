// Dump the layout of Spotlight Home or the Game Glance page on the device, as JSON (open transition fixtures).
// Setup: ssh -N -L 18080:127.0.0.1:8080 <device>   (keeps the debugger private to this Mac)
// Usage: node scripts/cef-layout.mjs <home|page> <out.json>
// Reads the focused Big Picture window from SharedJSContext; rects are CSS px of that window. Never captures the
// Friends tab or any name other than the game's: only Home's title block, action row and recents, and the page's.
import { writeFileSync } from 'node:fs';

const base = process.env.CEF_URL ?? 'http://127.0.0.1:18080';
const [mode, out] = process.argv.slice(2);
if (!['home', 'page'].includes(mode) || !out) {
    console.error('Usage: node scripts/cef-layout.mjs <home|page> <out.json>');
    process.exit(2);
}

/** Runs in SharedJSContext. */
function collect(mode) {
    const w = SteamUIStore.GetFocusedWindowInstance();
    const win = w.BrowserWindow;
    const doc = win.document;
    const rects = {};
    const texts = {};
    const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.left * 100) / 100, y: Math.round(r.top * 100) / 100, w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100 };
    };
    const put = (key, el, withText = false) => {
        const b = box(el);
        if (!b || (b.w === 0 && b.h === 0)) return;
        rects[key] = b;
        if (withText) texts[key] = el.textContent.trim();
    };
    // Steam's class maps, found by their keys (as @decky/ui findClassModule does).
    let req;
    window.webpackChunksteamui.push([[Symbol()], {}, (r) => { req = r; }]);
    const maps = Object.keys(req.m).map((id) => { try { return req(id); } catch { return null; } }).filter((m) => m && typeof m === 'object');
    const find = (...keys) => maps.find((m) => keys.every((k) => typeof m[k] === 'string'));
    const header = find('TopCapsule', 'BoxSizer') ?? {};
    const root = find('PlaySection', 'ActionButtonAndStatusPanel') ?? {};
    const play = find('MenuButton', 'CloudStatusRow') ?? {};
    const q = (cls, inside = doc) => (cls ? inside.querySelector(`.${cls}`) : null);
    const qa = (cls, inside = doc) => (cls ? [...inside.querySelectorAll(`.${cls}`)] : []);

    if (mode === 'page') {
        const cap = q(header.TopCapsule);
        put('header', cap);
        // The hero itself, not Steam's blurred placeholder under it (library_hero_blur) or its reflection.
        const img = cap ? [...cap.querySelectorAll('img')].find((i) => /library_hero\.|custom/i.test(i.currentSrc) && !/_blur/.test(i.currentSrc)) : null;
        let headerImg;
        if (img) {
            put('headerImgBox', img);
            const cs = win.getComputedStyle(img);
            headerImg = { src: img.currentSrc.replace(/^.*\/assets\//, 'assets/'), objectFit: cs.objectFit, objectPosition: cs.objectPosition, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight };
        }
        put('titleblock', doc.querySelector('.gg-titleblock'));
        put('title', doc.querySelector('.gg-titleblock .gg-logo, .gg-titleblock .gg-title'));
        put('eyebrow', doc.querySelector('.gg-titleblock .gg-eyebrow'), true);
        const panel = q(root.ActionButtonAndStatusPanel);
        put('play', panel ? panel.querySelector(':scope > div:has(> [role="button"])') ?? panel : null);
        const circles = [...qa(play.MenuButton), ...qa(play.CloudStatusRow)].filter((c) => c.getBoundingClientRect().width > 0)
            .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        circles.forEach((c, i) => put(`circle${i}`, c));
        put('store', doc.querySelector('.gg-pill'), true);
        put('family', doc.querySelector('.gg-family'), true);
        [...doc.querySelectorAll('.gg-card')].forEach((c, i) => put(`card${i}`, c));
        put('clean', doc.querySelector('.gg-clean-info'));
        // Stat columns: by data-stat once the page has it, else by order (Spotlight: info card, then the HLTB card).
        const columns = [...doc.querySelectorAll('.gg-card .gg-stats > div, .gg-clean-info > div')].filter((c) => c.getBoundingClientRect().width > 0);
        const hltbOrder = ['hltb', 'mainExtras', 'completionist'];
        columns.forEach((c, i) => {
            let key = c.getAttribute('data-stat');
            if (!key) {
                const inHltb = c.closest('.gg-hltb');
                const siblings = [...c.parentElement.children];
                key = inHltb ? hltbOrder[siblings.indexOf(c)] : `col${i}`;
            }
            put(`stat:${key}:label`, c.querySelector('.gg-label'), true);
            put(`stat:${key}:value`, c.querySelector('.gg-value'), true);
            put(`stat:${key}:bar`, c.querySelector('.gg-bar'));
        });
        put('hltbTitle', doc.querySelector('.gg-hltb > .gg-label'), true);
        put('desc', doc.querySelector('.gg-desc'));
        put('caption', doc.querySelector('.gg-caption, .gg-muted'), true);
        return { screen: { width: win.innerWidth, height: win.innerHeight }, rects, texts, headerImg };
    }

    const home = doc.querySelector('.gh-root');
    if (!home) return { error: 'Spotlight Home is not on screen' };
    put('root', home);
    put('titleSlot', home.querySelector('.gh-title-slot'));
    put('title', home.querySelector('.gh-title-slot .gh-logo, .gh-title-slot .gh-title'));
    put('eyebrow', home.querySelector('.gh-eyebrow'), true);
    [...home.querySelectorAll('.gh-chip')].forEach((c, i) => {
        const key = c.getAttribute('data-chip') ?? `chip${i}`;
        put(`chip:${key}`, c);
        put(`chip:${key}:label`, c.querySelector('.gh-chip-label'), true);
        put(`chip:${key}:value`, c.querySelector('.gh-chip-value'), true);
        put(`chip:${key}:bar`, c.querySelector('.gh-chip-bar'));
    });
    const buttons = [...home.querySelectorAll('.gh-actions .gh-btn')];
    put('pill', buttons[0]);
    buttons.slice(1).forEach((b, i) => { put(`circle${i}`, b); texts[`circle${i}`] = b.getAttribute('aria-label') ?? ''; });
    put('store', home.querySelector('.gh-source'), true);
    put('recents', home.querySelector('.gh-recents'));
    put('tabs', home.querySelector('.gh-tabs'));
    const hero = home.querySelector('.gh-hero-layer:last-child .gh-hero-full');
    const canvas = home.querySelector('.gh-canvas');
    return {
        screen: { width: win.innerWidth, height: win.innerHeight },
        canvasScale: canvas ? canvas.getBoundingClientRect().width / canvas.offsetWidth : null,
        rects,
        texts,
        hero: hero ? { backgroundPosition: win.getComputedStyle(hero).backgroundPosition, backgroundSize: win.getComputedStyle(hero).backgroundSize, url: (hero.style.backgroundImage.match(/assets\/[^"')]+/) ?? [''])[0] } : null,
    };
}

const targets = await (await fetch(`${base}/json`)).json();
const target = targets.find((t) => t.title === 'SharedJSContext');
if (!target) {
    console.error('Targets:', targets.map((t) => t.title));
    process.exit(1);
}
const ws = new WebSocket(target.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, base.replace(/^http/, 'ws')));
await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
});
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: `(${collect.toString()})(${JSON.stringify(mode)})`, returnByValue: true } }));
ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id !== 1) return;
    ws.close();
    const r = msg.result;
    if (r?.exceptionDetails) {
        console.error(`EXCEPTION: ${JSON.stringify(r.exceptionDetails).slice(0, 800)}`);
        process.exit(1);
    }
    const value = r?.result?.value;
    if (!value || value.error) {
        console.error(value?.error ?? 'no result');
        process.exit(1);
    }
    writeFileSync(out, `${JSON.stringify(value, null, 2)}\n`);
    console.log(`saved ${out}: ${Object.keys(value.rects).length} rects at ${value.screen.width}x${value.screen.height}`);
});
