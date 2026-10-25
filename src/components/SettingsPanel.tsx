import { ButtonItem, DropdownItem, PanelSection, PanelSectionRow, SliderField, ToggleField } from '@decky/ui';
import { toaster } from '@decky/api';
import { PLUGIN_NAME } from '../constants';
import { CollectionArtFit, CollectionArtMode, LibrarySortMode, settings, useSettings } from '../data/settings';
import { installUpdate, UpdateState, useUpdate } from '../data/update';
import { reloadArtworkCache } from '../library/artwork';
import { cache } from '../data/cache';

function updateLine(state: UpdateState): string {
    const version = state.current ? `Version ${state.current}` : PLUGIN_NAME;
    switch (state.status) {
        case 'checking':
            return `${version} · checking for updates…`;
        case 'upToDate':
            return `${version} · up to date`;
        case 'available':
            return `${version} · ${state.release.version} is available`;
        default:
            return `${version} · could not check for updates`;
    }
}

function UpdatesSection() {
    const { state, recheck } = useUpdate();
    return (
        <PanelSection title="Updates">
            <PanelSectionRow>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{updateLine(state)}</div>
            </PanelSectionRow>
            {state.status === 'available' && (
                <PanelSectionRow>
                    <ButtonItem
                        layout="below"
                        description="Decky asks to confirm, then installs it and reloads Glance Library."
                        onClick={async () => {
                            if (!(await installUpdate(state.release))) {
                                toaster.toast({
                                    title: PLUGIN_NAME,
                                    body: 'Could not start the update. Install it from the release page instead.',
                                });
                            }
                        }}
                    >
                        Update to {state.release.version}
                    </ButtonItem>
                </PanelSectionRow>
            )}
            <PanelSectionRow>
                <ButtonItem layout="below" disabled={state.status === 'checking'} onClick={recheck}>
                    Check for updates
                </ButtonItem>
            </PanelSectionRow>
        </PanelSection>
    );
}

export function SettingsPanel() {
    const {
        enabled,
        spotlightLibrary,
        libraryGridColumns,
        libraryCollectionColumns,
        dimUninstalledGames,
        tabMasterSync,
        libraryStatusBar,
        statusAvatar,
        collectionConsoleIcons,
        collectionArtMode,
        collectionArtFit,
        librarySort,
    } = useSettings();

    const isLibraryActive = enabled && spotlightLibrary;

    return (
        <div>
            <PanelSection title={PLUGIN_NAME}>
                <PanelSectionRow>
                    <ToggleField
                        label="Spotlight Library"
                        description="Replaces Steam's Library with the Spotlight Library 2-panel view. Turn off to return to Steam's native Library."
                        checked={isLibraryActive}
                        onChange={(value) => {
                            void settings.setEnabled(value);
                            void settings.setSpotlightLibrary(value);
                        }}
                    />
                </PanelSectionRow>
            </PanelSection>

            {isLibraryActive && (
                <>
                    <PanelSection title="Layout & Grid Density">
                        <PanelSectionRow>
                            <SliderField
                                label="Game Columns"
                                description="Number of poster columns in games views (3 to 7)."
                                value={libraryGridColumns}
                                min={3}
                                max={7}
                                step={1}
                                notchCount={5}
                                notchLabels={[
                                    { notchIndex: 0, label: '3', value: 3 },
                                    { notchIndex: 1, label: '4', value: 4 },
                                    { notchIndex: 2, label: '5', value: 5 },
                                    { notchIndex: 3, label: '6', value: 6 },
                                    { notchIndex: 4, label: '7', value: 7 },
                                ]}
                                onChange={(value: number) => {
                                    const cols = value < 3 ? value + 3 : value;
                                    void settings.setLibraryGridColumns(cols);
                                }}
                            />
                        </PanelSectionRow>
                        <PanelSectionRow>
                            <SliderField
                                label="Collection Columns"
                                description="Number of columns in collections view (3 to 8)."
                                value={libraryCollectionColumns}
                                min={3}
                                max={8}
                                step={1}
                                notchCount={6}
                                notchLabels={[
                                    { notchIndex: 0, label: '3', value: 3 },
                                    { notchIndex: 1, label: '4', value: 4 },
                                    { notchIndex: 2, label: '5', value: 5 },
                                    { notchIndex: 3, label: '6', value: 6 },
                                    { notchIndex: 4, label: '7', value: 7 },
                                    { notchIndex: 5, label: '8', value: 8 },
                                ]}
                                onChange={(value: number) => {
                                    const cols = value < 3 ? value + 3 : value;
                                    void settings.setLibraryCollectionColumns(cols);
                                }}
                            />
                        </PanelSectionRow>
                    </PanelSection>

                    <PanelSection title="Library Browsing & Sorting">
                        <PanelSectionRow>
                            <DropdownItem
                                label="Default sorting order"
                                description="How games and collections are ordered in the library."
                                rgOptions={[
                                    { data: 'recent', label: 'Last Played (Recent)' },
                                    { data: 'alpha', label: 'Alphabetical (A–Z)' },
                                    { data: 'playtime', label: 'Hours Played' },
                                    { data: 'size', label: 'Size on Disk' },
                                ]}
                                selectedOption={librarySort}
                                onChange={(val: { data: unknown }) => settings.setLibrarySort(val.data as LibrarySortMode)}
                            />
                        </PanelSectionRow>
                    </PanelSection>

                    <PanelSection title="TabMaster Integration">
                        <PanelSectionRow>
                            <ToggleField
                                label="Sync with TabMaster"
                                description="Inherits custom tabs, tab ordering, and rule filters from the TabMaster plugin when installed."
                                checked={tabMasterSync}
                                onChange={(value) => settings.setTabMasterSync(value)}
                            />
                        </PanelSectionRow>
                    </PanelSection>

                    <PanelSection title="Collections Display & Artwork">
                        <PanelSectionRow>
                            <ToggleField
                                label="Console icons"
                                description="Automatically detects and displays console badges (PS1/2/3/4, GameCube, Switch, N64, GBA, Xbox, Genesis, etc.) on collection cards."
                                checked={collectionConsoleIcons}
                                onChange={(value) => settings.setCollectionConsoleIcons(value)}
                            />
                        </PanelSectionRow>
                        <PanelSectionRow>
                            <DropdownItem
                                label="Default collection display"
                                description="Choose between the dynamic 5-game fan, custom image, or console icon."
                                rgOptions={[
                                    { data: 'fan', label: '5-Game Fan (Default)' },
                                    { data: 'custom', label: 'Custom Image' },
                                    { data: 'icon', label: 'Console Icon' },
                                ]}
                                selectedOption={collectionArtMode}
                                onChange={(val: { data: unknown }) => settings.setCollectionArtMode(val.data as CollectionArtMode)}
                            />
                        </PanelSectionRow>
                        <PanelSectionRow>
                            <DropdownItem
                                label="Default image sizing (fit)"
                                description="How custom artwork and console icons scale inside collection cards (Cover, Contain, Fill, Centered)."
                                rgOptions={[
                                    { data: 'cover', label: 'Cover (Fill & Crop)' },
                                    { data: 'contain', label: 'Contain (Fit whole image)' },
                                    { data: 'fill', label: 'Stretch to fill' },
                                    { data: 'center', label: 'Centered (Default icon badge)' },
                                ]}
                                selectedOption={collectionArtFit}
                                onChange={(val: { data: unknown }) => settings.setCollectionArtFit(val.data as CollectionArtFit)}
                            />
                        </PanelSectionRow>
                    </PanelSection>

                    <PanelSection title="Status Bar">
                        <PanelSectionRow>
                            <ToggleField
                                label="Status bar"
                                description="Recycles the sleek glass status bar with clock, battery level, and connection status at the top right of the library."
                                checked={libraryStatusBar}
                                onChange={(value) => settings.setLibraryStatusBar(value)}
                            />
                        </PanelSectionRow>
                        {libraryStatusBar && (
                            <PanelSectionRow>
                                <ToggleField
                                    label="Profile picture"
                                    description="Displays your Steam avatar ringed in your online status colour in the status bar instead of the dot."
                                    checked={statusAvatar}
                                    onChange={(value) => settings.setStatusAvatar(value)}
                                />
                            </PanelSectionRow>
                        )}
                    </PanelSection>

                    <PanelSection title="Visuals & Effects">
                        <PanelSectionRow>
                            <ToggleField
                                label="Unhighlight uninstalled games"
                                description="Applies neutral gray accents and grayscale tones to games in the library grid that are not installed on this device."
                                checked={dimUninstalledGames}
                                onChange={(value) => settings.setDimUninstalledGames(value)}
                            />
                        </PanelSectionRow>
                    </PanelSection>

                    <PanelSection title="Artwork & Cache">
                        <PanelSectionRow>
                            <ButtonItem
                                layout="below"
                                description="Forces Steam covers and collection artwork to re-fetch and refresh in the library."
                                onClick={() => {
                                    reloadArtworkCache();
                                    toaster.toast({ title: PLUGIN_NAME, body: 'Artwork reloaded.' });
                                }}
                            >
                                Reload Steam artwork
                            </ButtonItem>
                        </PanelSectionRow>
                        <PanelSectionRow>
                            <ButtonItem
                                layout="below"
                                description="Clears all cached HowLongToBeat times, descriptions, accent colors, and reloads artwork."
                                onClick={async () => {
                                    await cache.clear();
                                    reloadArtworkCache();
                                    toaster.toast({ title: PLUGIN_NAME, body: 'Cached data cleared.' });
                                }}
                            >
                                Clear cache
                            </ButtonItem>
                        </PanelSectionRow>
                    </PanelSection>
                </>
            )}
            <UpdatesSection />
        </div>
    );
}
