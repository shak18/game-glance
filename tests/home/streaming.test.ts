import { describe, expect, it } from 'vitest';
import { streamChoices } from '../../src/home/streaming';

const ally = { clientid: '0', client_name: 'This machine' };
const pc = { clientid: '4080', client_name: 'Desktop-PC' };

describe('streamChoices (Steam\'s "Play from" menu, as the game page\'s Play arrow opens it)', () => {
    it('none for a game on one device only (Steam shows no arrow then)', () => {
        expect(streamChoices({ per_client_data: [ally], selected_clientid: '0' })).toBeNull();
        expect(streamChoices({ per_client_data: [], selected_clientid: '0' })).toBeNull();
        expect(streamChoices(undefined)).toBeNull();
        expect(streamChoices({} as never)).toBeNull();
    });
    it("this device, then each other one to stream from, in Steam's order and words, the selected one ticked", () => {
        expect(streamChoices({ per_client_data: [ally, pc], selected_clientid: '0' })).toEqual([
            { clientid: '0', label: 'This device', selected: true },
            { clientid: '4080', label: 'Stream from: Desktop-PC', selected: false },
        ]);
        expect(streamChoices({ per_client_data: [ally, pc], selected_clientid: '4080' })?.map((c) => c.selected)).toEqual([false, true]);
    });
    it('a device without a name keeps its place with an empty name rather than breaking the menu', () => {
        expect(streamChoices({ per_client_data: [ally, { clientid: '9' }], selected_clientid: '0' })?.[1].label).toBe('Stream from: ');
    });
});
