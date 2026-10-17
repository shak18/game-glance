import { definePlugin } from '@decky/api';
import { staticClasses } from '@decky/ui';
import { FaBook } from 'react-icons/fa';
import { SettingsPanel } from './components/SettingsPanel';
import { LOG_PREFIX, PLUGIN_NAME } from './constants';
import { settings } from './data/settings';
import { getSteamLanguage } from './data/steam';
import { patchLibraryPage } from './patches/libraryPage';

export default definePlugin(() => {
    settings.load().catch((error) => console.error(`${LOG_PREFIX} failed to load settings`, error));
    void getSteamLanguage(); // resolve early so library renders in the right locale immediately
    const unpatchLibrary = patchLibraryPage();
    console.log(`${LOG_PREFIX} loaded`);

    return {
        name: PLUGIN_NAME,
        titleView: <div className={staticClasses.Title}>{PLUGIN_NAME}</div>,
        content: <SettingsPanel />,
        icon: <FaBook />,
        onDismount() {
            try {
                unpatchLibrary();
            } catch (error) {
                console.error(`${LOG_PREFIX} Library unpatch failed`, error);
            }
            console.log(`${LOG_PREFIX} unloaded`);
        },
    };
});
