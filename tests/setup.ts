import { vi } from 'vitest';

vi.mock('@decky/api', () => ({
    callable: (route?: string) => {
        if (route === 'get_storage_locations') {
            return async () => [
                { label: 'Pictures (~/Pictures)', path: '/home/deck/Pictures' },
                { label: 'User Home (~)', path: '/home/deck' },
                { label: 'SD Card (/run/media)', path: '/run/media' },
                { label: 'Root (/)', path: '/' },
            ];
        }
        if (route === 'get_image_data') {
            return async (path: string) => (path ? `data:image/png;base64,mock_${path}` : null);
        }
        if (route === 'find_collection_art') {
            return async () => ({ found: false });
        }
        return async () => null;
    },
    fetchNoCors: vi.fn(),
    routerHook: { addPatch: vi.fn(), removePatch: vi.fn() },
    definePlugin: (fn: () => unknown) => fn,
    toaster: { toast: vi.fn() },
    openFilePicker: vi.fn().mockResolvedValue({ path: '', realpath: '' }),
    FileSelectionType: { FILE: 0, FOLDER: 1 },
}));

// @decky/ui reads Steam's webpack chunks from `window` on import; Home components import it, and the
// Home route patch test reaches them through HomeGate. Components are not rendered in node tests.
// afterPatch is Decky's real one (its module has no imports): the Home route patch and its tests chain through it.
vi.mock('@decky/ui', async () => ({
    afterPatch: (await import('@decky/ui/dist/utils/patcher.js')).afterPatch,
    Focusable: () => null,
    Navigation: { Navigate: vi.fn(), NavigateToExternalWeb: vi.fn(), NavigateToSteamWeb: vi.fn() },
}));

// react-dom is Steam's (Decky provides it at runtime; it is an external of the bundle and not installed here). Home's status bar
// draws through a portal; nothing is rendered in node tests.
vi.mock('react-dom', () => ({ createPortal: () => null }));
