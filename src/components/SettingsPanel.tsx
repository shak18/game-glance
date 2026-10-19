import { ButtonItem, PanelSection, PanelSectionRow, SliderField, ToggleField } from '@decky/ui';
import { toaster } from '@decky/api';
import { PLUGIN_NAME } from '../constants';
import { settings, useSettings } from '../data/settings';
import { installUpdate, UpdateState, useUpdate } from '../data/update';

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
        gameLogo,
        dimUninstalledGames,
        tabMasterSync,
        pulsingBackground,
        zoomTransition,
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

                    <PanelSection title="Visuals & Effects">
                        <PanelSectionRow>
                            <ToggleField
                                label="Game logos"
                                description="Displays the game's logo art in the inspector preview above the description instead of plain text."
                                checked={gameLogo}
                                onChange={(value) => settings.setGameLogo(value)}
                            />
                        </PanelSectionRow>
                        <PanelSectionRow>
                            <ToggleField
                                label="Unhighlight uninstalled games"
                                description="Applies neutral gray accents and grayscale tones to games in the library grid that are not installed on this device."
                                checked={dimUninstalledGames}
                                onChange={(value) => settings.setDimUninstalledGames(value)}
                            />
                        </PanelSectionRow>
                        <PanelSectionRow>
                            <ToggleField
                                label="Pulsing background"
                                description="Adds subtle, breathing ambient motion to hero artwork in the background."
                                checked={pulsingBackground}
                                onChange={(value) => settings.setPulsingBackground(value)}
                            />
                        </PanelSectionRow>
                        <PanelSectionRow>
                            <ToggleField
                                label="Zoom transition"
                                description="Animates banner expanding into full screen when opening a game."
                                checked={zoomTransition}
                                onChange={(value) => settings.setZoomTransition(value)}
                            />
                        </PanelSectionRow>
                    </PanelSection>
                </>
            )}
            <UpdatesSection />
        </div>
    );
}
