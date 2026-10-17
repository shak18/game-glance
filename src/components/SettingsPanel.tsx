import { PanelSection, PanelSectionRow, SliderField, ToggleField } from '@decky/ui';
import { PLUGIN_NAME } from '../constants';
import { settings, useSettings } from '../data/settings';

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
                                    { notchIndex: 0, label: '3' },
                                    { notchIndex: 1, label: '4' },
                                    { notchIndex: 2, label: '5' },
                                    { notchIndex: 3, label: '6' },
                                    { notchIndex: 4, label: '7' },
                                ]}
                                onChange={(value: number) => settings.setLibraryGridColumns(value)}
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
                                    { notchIndex: 0, label: '3' },
                                    { notchIndex: 1, label: '4' },
                                    { notchIndex: 2, label: '5' },
                                    { notchIndex: 3, label: '6' },
                                    { notchIndex: 4, label: '7' },
                                    { notchIndex: 5, label: '8' },
                                ]}
                                onChange={(value: number) => settings.setLibraryCollectionColumns(value)}
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
        </div>
    );
}
