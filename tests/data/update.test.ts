import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCache } from '../../src/data/cache';
import { memoryKv } from '../../src/data/kv';
import {
    checkForUpdate,
    extractVersionString,
    installUpdate,
    isNewer,
    LATEST_TTL_MS,
    latestReleases,
    parseVersion,
    pickRelease,
    resetUpdateCheck,
    UPDATE_CHECK_EVERY_MS,
} from '../../src/data/update';

const SHA = 'a'.repeat(64);

const createRelease = (over: Record<string, unknown> = {}) => ({
    tag_name: 'glance-library-v1.1.0',
    name: 'Glance Library v1.1.0',
    draft: false,
    prerelease: false,
    assets: [
        { name: 'other.zip', browser_download_url: 'https://github.com/x/other.zip' },
        {
            name: 'glance-library.zip',
            browser_download_url:
                'https://github.com/shak18/game-glance/releases/download/glance-library-v1.1.0/glance-library.zip',
            digest: `sha256:${SHA}`,
        },
    ],
    ...over,
});

describe('versions', () => {
    it('parses standard tags with or without v, plus glance-library prefixes', () => {
        expect(parseVersion('glance-library-v1.1.0')).toEqual([1, 1, 0]);
        expect(parseVersion('glance-library-1.2.0')).toEqual([1, 2, 0]);
        expect(parseVersion('library-v2.0.0')).toEqual([2, 0, 0]);
        expect(parseVersion('v1.0.5')).toEqual([1, 0, 5]);
        expect(parseVersion('1.0.10')).toEqual([1, 0, 10]);
        expect(parseVersion('v1.0.0-beta.1')).toEqual([1, 0, 0]);
        for (const bad of ['', 'latest', 'v', '1..0', null, 42]) {
            expect(parseVersion(bad)).toBeNull();
        }
    });

    it('extracts clean version strings', () => {
        expect(extractVersionString('glance-library-v1.1.0')).toBe('1.1.0');
        expect(extractVersionString('v1.0.5')).toBe('1.0.5');
        expect(extractVersionString('invalid')).toBeNull();
    });

    it('compares versions numerically', () => {
        expect(isNewer('1.0.10', '1.0.9')).toBe(true);
        expect(isNewer('glance-library-v1.1.0', '1.0.0')).toBe(true);
        expect(isNewer('1.0.0', '1.0.0')).toBe(false);
        expect(isNewer('0.9.0', '1.0.0')).toBe(false);
        expect(isNewer('invalid', '1.0.0')).toBe(false);
    });
});

describe('pickRelease', () => {
    it('picks release with glance-library.zip and parses version and sha256', () => {
        const picked = pickRelease(createRelease());
        expect(picked).toEqual({
            version: '1.1.0',
            url: 'https://github.com/shak18/game-glance/releases/download/glance-library-v1.1.0/glance-library.zip',
            sha256: SHA,
        });
    });

    it('handles release list and skips releases without glance-library.zip', () => {
        const releaseList = [
            // Game Glance release without glance-library.zip
            {
                tag_name: 'v3.4.0',
                name: 'Game Glance v3.4.0',
                draft: false,
                prerelease: false,
                assets: [
                    {
                        name: 'game-glance.zip',
                        browser_download_url: 'https://github.com/x/game-glance.zip',
                    },
                ],
            },
            // Glance Library release
            createRelease(),
        ];
        const picked = pickRelease(releaseList);
        expect(picked?.version).toBe('1.1.0');
        expect(picked?.url).toContain('glance-library.zip');
    });

    it('ignores draft and prerelease entries', () => {
        expect(pickRelease(createRelease({ draft: true }))).toBeNull();
        expect(pickRelease(createRelease({ prerelease: true }))).toBeNull();
    });

    it('accepts versioned asset names like glance-library-v1.1.0.zip', () => {
        const versioned = {
            name: 'glance-library-v1.1.0.zip',
            browser_download_url: 'https://github.com/x/glance-library-v1.1.0.zip',
            digest: `sha256:${SHA}`,
        };
        const picked = pickRelease(createRelease({ assets: [versioned] }));
        expect(picked?.url).toBe(versioned.browser_download_url);
    });

    it('provides empty sha256 when digest is absent or invalid', () => {
        const asset = {
            name: 'glance-library.zip',
            browser_download_url: 'https://github.com/x/glance-library.zip',
        };
        const picked = pickRelease(createRelease({ assets: [asset] }));
        expect(picked?.sha256).toBe('');
    });

    it('correctly extracts Glance Library v1.0.0 from mixed release with tag 3.4.1', () => {
        const mixedRelease = {
            tag_name: '3.4.1',
            name: 'Glance Library v1.0.0 & Game Glance Modded v3.4.0',
            draft: false,
            prerelease: false,
            assets: [
                {
                    name: 'game-glance-modded-v3.4.1.zip',
                    browser_download_url: 'https://github.com/shak18/game-glance/releases/download/3.4.1/game-glance-modded-v3.4.1.zip',
                },
                {
                    name: 'glance-library.zip',
                    browser_download_url: 'https://github.com/shak18/game-glance/releases/download/3.4.1/glance-library.zip',
                },
            ],
        };
        const picked = pickRelease(mixedRelease);
        expect(picked).not.toBeNull();
        expect(picked?.version).toBe('1.0.0');
        expect(picked?.url).toBe('https://github.com/shak18/game-glance/releases/download/3.4.1/glance-library.zip');
    });
});

describe('checkForUpdate', () => {
    afterEach(() => {
        resetUpdateCheck();
    });

    it('reports available when a newer Glance Library release exists', async () => {
        const deps = {
            currentVersion: async () => '1.0.0',
            latestRelease: async () => createRelease(),
        };
        const res = await checkForUpdate(deps);
        expect(res.status).toBe('available');
        if (res.status === 'available') {
            expect(res.current).toBe('1.0.0');
            expect(res.release.version).toBe('1.1.0');
        }
    });

    it('reports upToDate when installed version is equal or newer', async () => {
        const deps = {
            currentVersion: async () => '1.1.0',
            latestRelease: async () => createRelease(),
        };
        const res = await checkForUpdate(deps);
        expect(res.status).toBe('upToDate');
        expect(res.current).toBe('1.1.0');
    });

    it('reports upToDate when release list contains no glance-library releases', async () => {
        const deps = {
            currentVersion: async () => '1.0.0',
            latestRelease: async () => [
                {
                    tag_name: 'v3.4.0',
                    assets: [{ name: 'game-glance.zip', browser_download_url: 'https://x/a.zip' }],
                },
            ],
        };
        const res = await checkForUpdate(deps);
        expect(res.status).toBe('upToDate');
        expect(res.current).toBe('1.0.0');
    });

    it('reports error when currentVersion fails or is invalid', async () => {
        const deps = {
            currentVersion: async () => 'not-a-version',
            latestRelease: async () => createRelease(),
        };
        const res = await checkForUpdate(deps);
        expect(res.status).toBe('error');
    });

    it('reports error when fetch throws', async () => {
        const deps = {
            currentVersion: async () => '1.0.0',
            latestRelease: async () => {
                throw new Error('network down');
            },
        };
        const res = await checkForUpdate(deps);
        expect(res.status).toBe('error');
        expect(res.current).toBe('1.0.0');
    });
});

describe('installUpdate', () => {
    it('calls Decky backend utilities/install_plugin with release info', async () => {
        const call = vi.fn().mockResolvedValue(true);
        const rel = {
            version: '1.1.0',
            url: 'https://github.com/shak18/game-glance/releases/download/v1.1.0/glance-library.zip',
            sha256: SHA,
        };
        const success = await installUpdate(rel, { call });
        expect(success).toBe(true);
        expect(call).toHaveBeenCalledWith(
            'utilities/install_plugin',
            rel.url,
            'Glance Library',
            rel.version,
            rel.sha256,
            2
        );
    });

    it('returns false when backend is unavailable or call throws', async () => {
        const success = await installUpdate(
            { version: '1.1.0', url: 'https://x', sha256: '' },
            undefined
        );
        expect(success).toBe(false);

        const failing = vi.fn().mockRejectedValue(new Error('Decky rejected'));
        const success2 = await installUpdate(
            { version: '1.1.0', url: 'https://x', sha256: '' },
            { call: failing }
        );
        expect(success2).toBe(false);
    });
});

describe('latestReleases cache', () => {
    it('caches response in store with TTL', async () => {
        let calls = 0;
        const fetcher = async () => {
            calls++;
            return createRelease();
        };
        const store = createCache(memoryKv());
        const lr = latestReleases(fetcher, store);

        const r1 = await lr.daily();
        expect(calls).toBe(1);

        const r2 = await lr.daily();
        expect(calls).toBe(1); // Cached
        expect(r2).toBeDefined();

        const r3 = await lr.fresh();
        expect(calls).toBe(2); // Forced fresh
        expect(r3).toBeDefined();
    });
});
