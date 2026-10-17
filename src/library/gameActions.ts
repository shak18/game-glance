import { Navigation } from '@decky/ui';
import { openGameMenu } from './gameMenu';
import { LOG_PREFIX } from '../constants';

type AppsApi = {
    OpenAppSettingsDialog?(appId: number, section: string): void;
};

export function openGameActions(appId: number, anchor: HTMLElement | null) {
    if (openGameMenu(appId, anchor)) return;
    try {
        const apps = (globalThis as { SteamClient?: { Apps?: AppsApi } }).SteamClient?.Apps;
        if (apps?.OpenAppSettingsDialog) {
            apps.OpenAppSettingsDialog(appId, '');
            return;
        }
    } catch (error) {
        console.warn(`${LOG_PREFIX} Library: properties dialog failed`, error);
    }
    try {
        Navigation.Navigate(`/game/${appId}`);
    } catch {}
}
