import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CollectionCard } from '../../src/library/LibraryGrid';
import { LibraryInspector } from '../../src/library/LibraryInspector';
import { LibraryCategoryBar } from '../../src/library/LibraryCategoryBar';
import { SpotlightLibrary } from '../../src/library/SpotlightLibrary';
import { LibraryCollectionItem, LibraryGameItem } from '../../src/library/libraryData';

describe('Collections Interaction & Browsing Tests', () => {
    const mockGames1: LibraryGameItem[] = [
        {
            appId: 1001,
            name: 'Game 1',
            isShortcut: false,
            installed: true,
            running: false,
            playedMinutes: 60,
            achievements: null,
            heroic: null,
            source: 'Steam',
        },
        {
            appId: 1002,
            name: 'Game 2',
            isShortcut: false,
            installed: true,
            running: false,
            playedMinutes: 120,
            achievements: null,
            heroic: null,
            source: 'Steam',
        },
    ];

    const mockCollections: LibraryCollectionItem[] = [
        {
            id: 'col-ps2',
            name: 'PlayStation 2',
            count: 2,
            games: mockGames1,
        },
        {
            id: 'col-snes',
            name: 'SNES Classics',
            count: 2,
            games: mockGames1,
        },
        {
            id: 'col-empty',
            name: 'Empty Collection',
            count: 0,
            games: [],
        },
    ];

    it('renders CollectionCard for both customized and default collections', () => {
        try {
            renderToString(
                <CollectionCard
                    collection={mockCollections[0]}
                    index={0}
                    isFocused={true}
                    accent="#1a9fff"
                    onDoubleClick={() => {}}
                />
            );
        } catch (e: any) {
            console.error('COLLECTION CARD ERROR:', e, e.stack);
            throw e;
        }

        expect(() => {
            renderToString(
                <CollectionCard
                    collection={mockCollections[1]}
                    index={1}
                    isFocused={false}
                    accent="#1a9fff"
                    onDoubleClick={() => {}}
                />
            );
        }).not.toThrow();

        expect(() => {
            renderToString(
                <CollectionCard
                    collection={mockCollections[2]}
                    index={2}
                    isFocused={false}
                    accent="#1a9fff"
                    onDoubleClick={() => {}}
                />
            );
        }).not.toThrow();
    });

    it('renders LibraryInspector for collections (isCollectionView=true)', () => {
        expect(() => {
            renderToString(
                <LibraryInspector
                    game={null}
                    collection={mockCollections[0]}
                    isCollectionView={true}
                    accent="#1a9fff"
                    description={null}
                    hltbMainHours={null}
                    onPlay={() => {}}
                    onDetails={() => {}}
                    onOpenCollection={() => {}}
                    onCustomizeCollection={() => {}}
                />
            );
        }).not.toThrow();

        expect(() => {
            renderToString(
                <LibraryInspector
                    game={null}
                    collection={mockCollections[1]}
                    isCollectionView={true}
                    accent="#1a9fff"
                    description={null}
                    hltbMainHours={null}
                    onPlay={() => {}}
                    onDetails={() => {}}
                    onOpenCollection={() => {}}
                    onCustomizeCollection={() => {}}
                />
            );
        }).not.toThrow();

        expect(() => {
            renderToString(
                <LibraryInspector
                    game={null}
                    collection={mockCollections[2]}
                    isCollectionView={true}
                    accent="#1a9fff"
                    description={null}
                    hltbMainHours={null}
                    onPlay={() => {}}
                    onDetails={() => {}}
                    onOpenCollection={() => {}}
                    onCustomizeCollection={() => {}}
                />
            );
        }).not.toThrow();
    });

    it('renders LibraryCategoryBar when inside subcollection', () => {
        expect(() => {
            renderToString(
                <LibraryCategoryBar
                    categories={[
                        { id: 'installed', name: 'INSTALLED', count: 10, games: [] },
                        { id: 'collections', name: 'COLLECTIONS', count: 3, games: [], collections: mockCollections, isCollectionsTab: true },
                    ]}
                    activeCategoryId="collections"
                    onSelectCategory={() => {}}
                    isInsideSubCollection={true}
                    collections={mockCollections}
                    activeSubCollectionId="col-ps2"
                    activeSubCollectionName="PlayStation 2"
                    onBackToCollections={() => {}}
                />
            );
        }).not.toThrow();
    });

    it('renders SpotlightLibrary with mockGames', () => {
        expect(() => {
            renderToString(<SpotlightLibrary mockGames={mockGames1} />);
        }).not.toThrow();
    });

    it('navigates seamlessly across collections with different art modes without hook mismatch', () => {
        // Transition from collection 0 (console auto-detect 'ps2') to collection 1 (console auto-detect 'snes') to collection 2 (fan default)
        for (let i = 0; i < mockCollections.length; i++) {
            expect(() => {
                renderToString(
                    <LibraryInspector
                        game={null}
                        collection={mockCollections[i]}
                        isCollectionView={true}
                        accent="#1a9fff"
                        description={null}
                        hltbMainHours={null}
                        onPlay={() => {}}
                        onDetails={() => {}}
                        onOpenCollection={() => {}}
                        onCustomizeCollection={() => {}}
                    />
                );
            }).not.toThrow();
        }
    });
});
