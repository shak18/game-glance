import { tr } from '../i18n/steamText';

/**
 * Steam's "Play from" choice for a game on more than one device (Steam Link / Remote Play: installed here and on a PC,
 * or only on a PC). The game page's Play pill then ends in an arrow that opens a menu: this device, then "Stream from:
 * {device}" for each other one, the selected one ticked; picking one calls SteamClient.Apps.SetStreamingClientForApp,
 * and Steam's own Play action becomes Stream (Home's pill reads Steam's, home/steamPill). Probed on the Ally (Neva,
 * installed here and on a MacBook): per_client_data lists both, clientid "0" is this device. Pure.
 */

export interface StreamChoice {
    clientid: string;
    label: string;
    selected: boolean;
}

interface ClientData {
    clientid?: unknown;
    client_name?: unknown;
}

export interface StreamOverview {
    per_client_data?: ClientData[];
    selected_clientid?: unknown;
}

/** The menu's entries, or null when the game is on one device only (Steam shows no arrow then). */
export function streamChoices(overview: StreamOverview | null | undefined): StreamChoice[] | null {
    const clients = Array.isArray(overview?.per_client_data) ? overview!.per_client_data! : [];
    if (clients.length < 2) return null;
    const selected = String(overview?.selected_clientid ?? '0');
    return clients.map((c) => {
        const clientid = String(c?.clientid ?? '');
        const name = typeof c?.client_name === 'string' ? c.client_name : '';
        return { clientid, label: clientid === '0' ? tr('thisDevice') : tr('streamFrom', [name]), selected: clientid === selected };
    });
}
