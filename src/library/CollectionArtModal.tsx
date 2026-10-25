import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaFolder, FaPalette, FaCheck, FaTimes, FaUndo, FaSearch, FaGamepad, FaSlidersH } from 'react-icons/fa';
import { Focusable, GamepadButton, GamepadEvent } from '@decky/ui';
import { LibraryCollectionItem, LibraryGameItem } from './libraryData';
import {
    browseLocalCollectionImage,
    CONSOLE_LABELS,
    CONSOLE_SHORT_LABELS,
    resolveCollectionArt,
    resolveImageUri,
    setCachedImageUri,
    useImageUri,
} from './enhancedCollection';
import { getBundledConsoleIcon } from './consoleIconData';
import { CollectionArtFit, CollectionArtMode, settings, useSettings } from '../data/settings';
import { playNavSound } from './navSound';

interface CollectionArtModalProps {
    collection: LibraryCollectionItem;
    accent: string;
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess?: () => void;
    registerGamepadHandler?: (handler: ((evt: GamepadEvent) => void) | null) => void;
    registerKeyDownHandler?: (handler: ((evt: KeyboardEvent) => void) | null) => void;
}

function MiniCover({ game, className }: { game?: LibraryGameItem; className: string }) {
    const [hasError, setHasError] = useState(false);
    const src = game?.capsuleUrl ?? '';

    if (!game || !src || hasError) {
        return (
            <div className={`sgl-col-fan-card ${className}`}>
                <div style={{ width: '100%', height: '100%', background: '#1c2433', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaFolder size={18} color="rgba(255,255,255,0.4)" />
                </div>
            </div>
        );
    }

    return (
        <div className={`sgl-col-fan-card ${className}`}>
            <img src={src} alt={game.name} onError={() => setHasError(true)} />
        </div>
    );
}

const FIT_CYCLE: CollectionArtFit[] = ['center', 'contain', 'cover', 'fill'];

const FIT_INFO: Record<CollectionArtFit, { label: string; desc: string }> = {
    center: { label: 'Centered Badge', desc: 'Preserves badge proportions on banner background' },
    contain: { label: 'Contain (Fit Full)', desc: 'Fits full image inside card without cropping' },
    cover: { label: 'Cover (Fill Card)', desc: 'Fills entire card surface; edges cropped if aspect differs' },
    fill: { label: 'Fill (Stretch to Edge)', desc: 'Stretches image to all edges of the card' },
};

type ModalFocusZone = 'mode' | 'sizing' | 'browse' | 'autodetect' | 'consoleGrid' | 'footer';

export function CollectionArtModal({
    collection,
    accent,
    isOpen,
    onClose,
    onSaveSuccess,
    registerGamepadHandler,
    registerKeyDownHandler,
}: CollectionArtModalProps) {
    const currentSettings = useSettings();
    const existingCustom =
        currentSettings.collectionCustomArt?.[collection.id] ?? currentSettings.collectionCustomArt?.[collection.name];

    const currentArt = resolveCollectionArt(collection, currentSettings);

    const [mode, setMode] = useState<CollectionArtMode>(existingCustom?.mode ?? currentArt.mode);
    const [customUrl, setCustomUrl] = useState<string>(existingCustom?.url ?? currentArt.customUrl ?? '');

    // customFitChosen is true ONLY if user explicitly chose a fit override
    const [customFitChosen, setCustomFitChosen] = useState<boolean>(Boolean(existingCustom?.hasCustomFit));
    const [fit, setFit] = useState<CollectionArtFit>(
        existingCustom?.hasCustomFit && existingCustom.fit
            ? existingCustom.fit
            : (currentSettings.collectionArtFit ?? (currentArt.mode === 'icon' ? 'center' : 'cover'))
    );
    const [selectedIcon, setSelectedIcon] = useState<string>(existingCustom?.icon ?? currentArt.iconKey ?? '');
    const [isBrowsing, setIsBrowsing] = useState(false);

    // Navigation state
    const [focusZone, setFocusZone] = useState<ModalFocusZone>('mode');
    const [modeIndex, setModeIndex] = useState<number>(mode === 'fan' ? 0 : mode === 'custom' ? 1 : 2);
    const [gridIndex, setGridIndex] = useState<number>(0);
    const [footerIndex, setFooterIndex] = useState<number>(0);
    const consoleGridRef = useRef<HTMLDivElement | null>(null);

    const consoleKeys = useMemo(() => Object.keys(CONSOLE_LABELS), []);

    // Set initial gridIndex to currently active icon if any
    useEffect(() => {
        const activeKey = selectedIcon || currentArt.iconKey;
        if (activeKey) {
            const idx = consoleKeys.indexOf(activeKey);
            if (idx >= 0) setGridIndex(idx);
        }
    }, [consoleKeys, currentArt.iconKey, selectedIcon]);

    const effectiveFit: CollectionArtFit = customFitChosen
        ? fit
        : (currentSettings.collectionArtFit ?? (mode === 'icon' ? 'center' : 'cover'));

    const handleSelectMode = useCallback((newMode: CollectionArtMode) => {
        setMode(newMode);
        setModeIndex(newMode === 'fan' ? 0 : newMode === 'custom' ? 1 : 2);
        if (newMode === 'icon' && !selectedIcon && currentArt.iconKey) {
            setSelectedIcon(currentArt.iconKey);
        }
    }, [currentArt.iconKey, selectedIcon]);

    const handleSelectFit = useCallback((newFit: CollectionArtFit) => {
        setCustomFitChosen(true);
        setFit(newFit);
    }, []);

    const cycleFit = useCallback((delta: number) => {
        const curIdx = FIT_CYCLE.indexOf(effectiveFit);
        const nextIdx = (curIdx + delta + FIT_CYCLE.length) % FIT_CYCLE.length;
        handleSelectFit(FIT_CYCLE[nextIdx]);
    }, [effectiveFit, handleSelectFit]);

    const previewCustomUri = useImageUri(customUrl);
    const activeIconKey = selectedIcon || currentArt.iconKey;
    const previewIconUri = activeIconKey ? getBundledConsoleIcon(activeIconKey) : null;

    const safePreviewCustomSrc =
        previewCustomUri ||
        (customUrl && (customUrl.startsWith('data:') || customUrl.startsWith('http://') || customUrl.startsWith('https://'))
            ? customUrl
            : undefined);

    const handleBrowseFile = useCallback(async () => {
        setIsBrowsing(true);
        try {
            const startPath = customUrl || '/home/deck/Pictures';
            const chosen = await browseLocalCollectionImage(startPath);
            if (chosen) {
                setCustomUrl(chosen);
                setMode('custom');
                setModeIndex(1);
                const resolved = await resolveImageUri(chosen);
                if (resolved) {
                    setCachedImageUri(chosen, resolved);
                }
            }
        } finally {
            setIsBrowsing(false);
        }
    }, [customUrl]);

    const handleSave = useCallback(() => {
        try {
            const cleanUrl = typeof customUrl === 'string' ? customUrl.trim() : '';
            const cleanIcon = typeof selectedIcon === 'string' ? selectedIcon.trim() : '';
            const entry = {
                mode,
                url: cleanUrl || undefined,
                fit: customFitChosen ? fit : undefined,
                hasCustomFit: customFitChosen ? true : undefined,
                icon: cleanIcon || undefined,
            };
            const keysToSave = [collection.id];
            if (collection.name && collection.name !== collection.id) {
                keysToSave.push(collection.name);
            }
            settings.setCollectionCustomArt(keysToSave, entry).catch((e) => {
                console.error('[glance-library] Failed to save custom artwork:', e);
            });
        } catch (e) {
            console.error('[glance-library] Failed to save custom artwork:', e);
        }
        onSaveSuccess?.();
        onClose();
    }, [collection.id, collection.name, customFitChosen, customUrl, fit, mode, onClose, onSaveSuccess, selectedIcon]);

    const handleReset = useCallback(() => {
        try {
            const keysToRemove = [collection.id];
            if (collection.name && collection.name !== collection.id) {
                keysToRemove.push(collection.name);
            }
            settings.removeCollectionCustomArt(keysToRemove).catch(() => {});
        } catch {}
        setMode(currentSettings.collectionArtMode ?? 'fan');
        setModeIndex(currentSettings.collectionArtMode === 'custom' ? 1 : currentSettings.collectionArtMode === 'icon' ? 2 : 0);
        setCustomUrl('');
        setCustomFitChosen(false);
        setFit(currentSettings.collectionArtFit ?? 'cover');
        setSelectedIcon('');
        onSaveSuccess?.();
        onClose();
    }, [collection.id, collection.name, currentSettings.collectionArtFit, currentSettings.collectionArtMode, onClose, onSaveSuccess]);

    // Controller & Keyboard Navigation State Handlers
    const handleNavUp = useCallback(() => {
        if (focusZone === 'mode') {
            // NEVER escape upward to Steam's search bar! Trapped completely.
            playNavSound('FailedNav');
            return;
        }
        if (focusZone === 'sizing') {
            setFocusZone('mode');
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'browse') {
            setFocusZone('sizing');
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'autodetect') {
            setFocusZone('sizing');
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'consoleGrid') {
            const COLS = 4;
            if (gridIndex >= COLS) {
                setGridIndex((prev) => prev - COLS);
                playNavSound('BasicNav');
            } else {
                setFocusZone('autodetect');
                playNavSound('BasicNav');
            }
            return;
        }
        if (focusZone === 'footer') {
            if (mode === 'fan') {
                setFocusZone('mode');
            } else if (mode === 'custom') {
                setFocusZone('browse');
            } else {
                setFocusZone('consoleGrid');
            }
            playNavSound('BasicNav');
            return;
        }
    }, [focusZone, gridIndex, mode]);

    const handleNavDown = useCallback(() => {
        if (focusZone === 'mode') {
            if (mode === 'fan') {
                setFocusZone('footer');
                setFooterIndex(0);
            } else {
                setFocusZone('sizing');
            }
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'sizing') {
            if (mode === 'custom') {
                setFocusZone('browse');
            } else {
                setFocusZone('autodetect');
            }
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'browse') {
            setFocusZone('footer');
            setFooterIndex(0);
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'autodetect') {
            setFocusZone('consoleGrid');
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'consoleGrid') {
            const COLS = 4;
            if (gridIndex + COLS < consoleKeys.length) {
                setGridIndex((prev) => prev + COLS);
                playNavSound('BasicNav');
            } else {
                setFocusZone('footer');
                setFooterIndex(0);
                playNavSound('BasicNav');
            }
            return;
        }
        if (focusZone === 'footer') {
            // NEVER escape downward past footer! Trapped completely.
            playNavSound('FailedNav');
            return;
        }
    }, [consoleKeys.length, focusZone, gridIndex, mode]);

    const handleNavLeft = useCallback(() => {
        if (focusZone === 'mode') {
            if (modeIndex > 0) {
                const nextIdx = modeIndex - 1;
                setModeIndex(nextIdx);
                handleSelectMode(nextIdx === 0 ? 'fan' : nextIdx === 1 ? 'custom' : 'icon');
                playNavSound('BasicNav');
            } else {
                playNavSound('FailedNav');
            }
            return;
        }
        if (focusZone === 'sizing') {
            cycleFit(-1);
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'consoleGrid') {
            const COLS = 4;
            if (gridIndex % COLS > 0) {
                setGridIndex((prev) => prev - 1);
                playNavSound('BasicNav');
            } else {
                playNavSound('FailedNav');
            }
            return;
        }
        if (focusZone === 'footer') {
            if (footerIndex > 0) {
                setFooterIndex((prev) => prev - 1);
                playNavSound('BasicNav');
            } else {
                playNavSound('FailedNav');
            }
            return;
        }
    }, [cycleFit, focusZone, footerIndex, gridIndex, handleSelectMode, modeIndex]);

    const handleNavRight = useCallback(() => {
        if (focusZone === 'mode') {
            if (modeIndex < 2) {
                const nextIdx = modeIndex + 1;
                setModeIndex(nextIdx);
                handleSelectMode(nextIdx === 0 ? 'fan' : nextIdx === 1 ? 'custom' : 'icon');
                playNavSound('BasicNav');
            } else {
                playNavSound('FailedNav');
            }
            return;
        }
        if (focusZone === 'sizing') {
            cycleFit(1);
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'consoleGrid') {
            const COLS = 4;
            if (gridIndex % COLS < COLS - 1 && gridIndex < consoleKeys.length - 1) {
                setGridIndex((prev) => prev + 1);
                playNavSound('BasicNav');
            } else {
                playNavSound('FailedNav');
            }
            return;
        }
        if (focusZone === 'footer') {
            const maxFooter = existingCustom ? 2 : 1;
            if (footerIndex < maxFooter) {
                setFooterIndex((prev) => prev + 1);
                playNavSound('BasicNav');
            } else {
                playNavSound('FailedNav');
            }
            return;
        }
    }, [consoleKeys.length, cycleFit, existingCustom, focusZone, footerIndex, gridIndex, handleSelectMode, modeIndex]);

    const handleActivateCurrentFocus = useCallback(() => {
        if (focusZone === 'mode') {
            handleSelectMode(modeIndex === 0 ? 'fan' : modeIndex === 1 ? 'custom' : 'icon');
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'sizing') {
            cycleFit(1);
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'browse') {
            handleBrowseFile();
            return;
        }
        if (focusZone === 'autodetect') {
            setSelectedIcon('');
            setMode('icon');
            playNavSound('BasicNav');
            return;
        }
        if (focusZone === 'consoleGrid') {
            const key = consoleKeys[gridIndex];
            if (key) {
                setSelectedIcon(key);
                setMode('icon');
                playNavSound('BasicNav');
            }
            return;
        }
        if (focusZone === 'footer') {
            if (footerIndex === 0) {
                handleSave();
            } else if (existingCustom && footerIndex === 1) {
                handleReset();
            } else {
                onClose();
            }
            return;
        }
    }, [consoleKeys, cycleFit, existingCustom, focusZone, footerIndex, gridIndex, handleBrowseFile, handleReset, handleSave, handleSelectMode, modeIndex, onClose]);

    // Keep console grid scrolled to focused icon using direct container scrolling
    useEffect(() => {
        if (focusZone === 'consoleGrid' && consoleGridRef.current) {
            const container = consoleGridRef.current;
            const itemEl = container.children[gridIndex] as HTMLElement | undefined;
            if (itemEl) {
                const itemTop = itemEl.offsetTop - container.offsetTop;
                const itemBottom = itemTop + itemEl.offsetHeight;
                const pad = 6;
                if (itemTop < container.scrollTop + pad) {
                    container.scrollTop = Math.max(0, itemTop - pad);
                } else if (itemBottom > container.scrollTop + container.clientHeight - pad) {
                    container.scrollTop = itemBottom - container.clientHeight + pad;
                }
            }
        }
    }, [focusZone, gridIndex]);

    // Initial scroll when opening in icon mode
    useEffect(() => {
        if (isOpen && mode === 'icon' && consoleGridRef.current) {
            const container = consoleGridRef.current;
            const itemEl = container.children[gridIndex] as HTMLElement | undefined;
            if (itemEl) {
                const itemTop = itemEl.offsetTop - container.offsetTop;
                container.scrollTop = Math.max(0, itemTop - 6);
            }
        }
    }, [isOpen, mode]);

    // Handle gamepad buttons
    const handleGamepadButton = useCallback((evt: GamepadEvent) => {
        const btn = Number(evt?.detail?.button);
        // CANCEL: B button (or 2)
        if (btn === GamepadButton.CANCEL || btn === 2) {
            evt.preventDefault?.();
            evt.stopPropagation?.();
            onClose();
            return;
        }
        // OK: A button (or 1, 0)
        if (btn === GamepadButton.OK || btn === 1 || btn === 0) {
            evt.preventDefault?.();
            evt.stopPropagation?.();
            handleActivateCurrentFocus();
            return;
        }
        // D-Pad Left
        if (btn === GamepadButton.DIR_LEFT || btn === 11) {
            evt.preventDefault?.();
            evt.stopPropagation?.();
            handleNavLeft();
            return;
        }
        // D-Pad Right
        if (btn === GamepadButton.DIR_RIGHT || btn === 12) {
            evt.preventDefault?.();
            evt.stopPropagation?.();
            handleNavRight();
            return;
        }
        // D-Pad Up
        if (btn === GamepadButton.DIR_UP || btn === 9) {
            evt.preventDefault?.();
            evt.stopPropagation?.();
            handleNavUp();
            return;
        }
        // D-Pad Down
        if (btn === GamepadButton.DIR_DOWN || btn === 10) {
            evt.preventDefault?.();
            evt.stopPropagation?.();
            handleNavDown();
            return;
        }
    }, [handleActivateCurrentFocus, handleNavDown, handleNavLeft, handleNavRight, handleNavUp, onClose]);

    // Handle keyboard events (physical keyboard and synthetic Gamepad key presses)
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onClose();
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            handleActivateCurrentFocus();
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            e.stopPropagation();
            handleNavLeft();
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            e.stopPropagation();
            handleNavRight();
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            handleNavUp();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            handleNavDown();
            return;
        }
    }, [handleActivateCurrentFocus, handleNavDown, handleNavLeft, handleNavRight, handleNavUp, onClose]);

    // Register handlers with parent SpotlightLibrary
    useEffect(() => {
        if (registerGamepadHandler) {
            registerGamepadHandler(handleGamepadButton);
        }
        if (registerKeyDownHandler) {
            registerKeyDownHandler(handleKeyDown);
        }
        return () => {
            if (registerGamepadHandler) registerGamepadHandler(null);
            if (registerKeyDownHandler) registerKeyDownHandler(null);
        };
    }, [handleGamepadButton, handleKeyDown, registerGamepadHandler, registerKeyDownHandler]);

    // Global capture listener to catch all events and stop propagation
    useEffect(() => {
        if (!isOpen) return;
        const captureKeyDown = (e: KeyboardEvent) => {
            handleKeyDown(e);
        };
        window.addEventListener('keydown', captureKeyDown, true);
        return () => window.removeEventListener('keydown', captureKeyDown, true);
    }, [handleKeyDown, isOpen]);

    const games = Array.isArray(collection?.games) ? collection.games : [];
    const game0 = games[0];
    const game1 = games[1];
    const game2 = games[2];
    const game3 = games[3];
    const game4 = games[4];

    if (!isOpen) return null;

    return (
        <div className="sgl-modal-backdrop" onClick={onClose}>
            <Focusable
                className="sgl-modal-window"
                style={{ '--accent': accent } as React.CSSProperties}
                onCancel={onClose}
                onButtonDown={handleGamepadButton}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                noFocusRing
            >
                {/* Modal Header */}
                <div className="sgl-modal-header">
                    <div className="sgl-modal-title-row">
                        <FaPalette size={16} color="var(--accent, #58a6ff)" />
                        <h2 className="sgl-modal-title">Customize Collection Artwork</h2>
                        <span className="sgl-modal-subtitle">— {collection.name}</span>
                    </div>
                    <div
                        className="sgl-modal-close-btn"
                        onClick={onClose}
                        title="Close (B)"
                    >
                        <FaTimes size={14} />
                    </div>
                </div>

                {/* Modal Body */}
                <div className="sgl-modal-body">
                    {/* Left Column: Live Card Preview */}
                    <div className="sgl-modal-preview-pane">
                        <div className="sgl-modal-preview-label">Live Library Preview</div>
                        <div
                            className="sgl-modal-card-preview sgl-card-collection"
                            style={{ '--accent': accent, '--accent-glow': `${accent}55` } as React.CSSProperties}
                        >
                            {mode === 'custom' ? (
                                safePreviewCustomSrc ? (
                                    <div className={`sgl-col-custom-art-area sgl-fit-${effectiveFit}`}>
                                        <img
                                            src={safePreviewCustomSrc}
                                            alt={collection.name}
                                            className={`sgl-col-custom-img sgl-fit-${effectiveFit}`}
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="sgl-col-custom-art-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'rgba(255,255,255,0.6)' }}>
                                        <FaFolder size={32} color="var(--accent, #58a6ff)" />
                                        <span style={{ fontSize: 11, fontWeight: 600 }}>{customUrl ? 'Loading Image...' : 'No Image Selected'}</span>
                                    </div>
                                )
                            ) : mode === 'icon' ? (
                                previewIconUri ? (
                                    <div className={`sgl-col-icon-art-area sgl-fit-${effectiveFit}`}>
                                        <img
                                            src={previewIconUri}
                                            alt=""
                                            className={`sgl-col-icon-large sgl-fit-${effectiveFit}`}
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="sgl-col-icon-art-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'rgba(255,255,255,0.6)' }}>
                                        <span style={{ fontSize: 11, fontWeight: 600 }}>Loading Icon...</span>
                                    </div>
                                )
                            ) : (
                                <div className="sgl-col-fan-area">
                                    {games.length >= 5 ? (
                                        <>
                                            <MiniCover game={game3} className="sgl-col-card-far-left" />
                                            <MiniCover game={game1} className="sgl-col-card-left" />
                                            <MiniCover game={game4} className="sgl-col-card-far-right" />
                                            <MiniCover game={game2} className="sgl-col-card-right" />
                                            <MiniCover game={game0} className="sgl-col-card-center" />
                                        </>
                                    ) : games.length === 4 ? (
                                        <>
                                            <MiniCover game={game3} className="sgl-col-card-far-left" />
                                            <MiniCover game={game1} className="sgl-col-card-left" />
                                            <MiniCover game={game2} className="sgl-col-card-right" />
                                            <MiniCover game={game0} className="sgl-col-card-center" />
                                        </>
                                    ) : games.length === 3 ? (
                                        <>
                                            <MiniCover game={game1} className="sgl-col-card-left" />
                                            <MiniCover game={game2} className="sgl-col-card-right" />
                                            <MiniCover game={game0} className="sgl-col-card-center" />
                                        </>
                                    ) : games.length === 2 ? (
                                        <>
                                            <MiniCover game={game1} className="sgl-col-card-left" />
                                            <MiniCover game={game0} className="sgl-col-card-center" />
                                        </>
                                    ) : games.length === 1 ? (
                                        <MiniCover game={game0} className="sgl-col-card-center" />
                                    ) : (
                                        <div style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                            <FaFolder size={32} color="var(--accent, #58a6ff)" />
                                            <span style={{ fontSize: 11, fontWeight: 600 }}>Empty Collection</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="sgl-col-footer">
                                <div className="sgl-col-footer-header">
                                    {mode === 'icon' && previewIconUri ? (
                                        <img src={previewIconUri} className="sgl-col-icon-img" alt="" />
                                    ) : currentArt.iconKey ? (
                                        <img src={getBundledConsoleIcon(currentArt.iconKey)} className="sgl-col-icon-img" alt="" />
                                    ) : null}
                                    <div className="sgl-col-footer-title">{collection.name}</div>
                                </div>
                                <div className="sgl-col-footer-badge">{collection.count} {collection.count === 1 ? 'GAME' : 'GAMES'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Customization Controls */}
                    <div className="sgl-modal-controls-pane">
                        {/* Display Mode Segmented Buttons */}
                        <div className="sgl-modal-section">
                            <label className="sgl-modal-section-title">Display Mode</label>
                            <div className="sgl-modal-btn-row">
                                <div
                                    className={`sgl-modal-mode-pill sgl-modal-mode-fan${mode === 'fan' ? ' active' : ''}${focusZone === 'mode' && modeIndex === 0 ? ' focused' : ''}`}
                                    onClick={() => {
                                        setFocusZone('mode');
                                        handleSelectMode('fan');
                                    }}
                                >
                                    <FaFolder size={13} style={{ marginRight: 6 }} />
                                    <span>5-Game Fan</span>
                                </div>

                                <div
                                    className={`sgl-modal-mode-pill sgl-modal-mode-custom${mode === 'custom' ? ' active' : ''}${focusZone === 'mode' && modeIndex === 1 ? ' focused' : ''}`}
                                    onClick={() => {
                                        setFocusZone('mode');
                                        handleSelectMode('custom');
                                    }}
                                >
                                    <FaPalette size={13} style={{ marginRight: 6 }} />
                                    <span>Custom Artwork</span>
                                </div>

                                <div
                                    className={`sgl-modal-mode-pill sgl-modal-mode-icon${mode === 'icon' ? ' active' : ''}${focusZone === 'mode' && modeIndex === 2 ? ' focused' : ''}`}
                                    onClick={() => {
                                        setFocusZone('mode');
                                        handleSelectMode('icon');
                                    }}
                                >
                                    <FaGamepad size={13} style={{ marginRight: 6 }} />
                                    <span>Console Icon</span>
                                </div>
                            </div>
                        </div>

                        {/* Mode Description for Fan view */}
                        {mode === 'fan' && (
                            <div className="sgl-modal-section">
                                <div className="sgl-modal-info-card">
                                    Dynamic fan mode showcases the top 5 games in your collection using a rich 3D fanned capsule stack with library accents.
                                </div>
                            </div>
                        )}

                        {/* Stepper Sizing Selector (for custom image and console icon) */}
                        {(mode === 'custom' || mode === 'icon') && (
                            <div className="sgl-modal-section">
                                <label className="sgl-modal-section-title">
                                    <FaSlidersH size={12} style={{ marginRight: 6 }} />
                                    {mode === 'icon' ? 'Icon Sizing & Fit' : 'Artwork Sizing & Fit'}
                                </label>
                                <div
                                    className={`sgl-modal-stepper${focusZone === 'sizing' ? ' focused' : ''}`}
                                    onClick={() => {
                                        setFocusZone('sizing');
                                        cycleFit(1);
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="sgl-modal-stepper-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFocusZone('sizing');
                                            cycleFit(-1);
                                        }}
                                        aria-label="Previous sizing"
                                    >
                                        ◀
                                    </button>
                                    <div className="sgl-modal-stepper-content">
                                        <span className="sgl-modal-stepper-title">{FIT_INFO[effectiveFit]?.label ?? effectiveFit}</span>
                                        <span className="sgl-modal-stepper-sub">{FIT_INFO[effectiveFit]?.desc ?? ''}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="sgl-modal-stepper-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFocusZone('sizing');
                                            cycleFit(1);
                                        }}
                                        aria-label="Next sizing"
                                    >
                                        ▶
                                    </button>
                                </div>
                                <span className="sgl-modal-select-hint">
                                    Use D-Pad ◀ / ▶ to cycle sizing modes.
                                </span>
                            </div>
                        )}

                        {/* Custom Image File Controls */}
                        {mode === 'custom' && (
                            <div className="sgl-modal-section">
                                <label className="sgl-modal-section-title">Artwork Image File</label>
                                <div
                                    className={`sgl-modal-browse-btn${focusZone === 'browse' ? ' focused' : ''}`}
                                    onClick={() => {
                                        setFocusZone('browse');
                                        handleBrowseFile();
                                    }}
                                >
                                    <FaSearch size={13} style={{ marginRight: 6 }} />
                                    <span>{isBrowsing ? 'Opening File Browser...' : 'Browse Local Files (Steam Deck Native)...'}</span>
                                </div>

                                {customUrl ? (
                                    <div className="sgl-modal-filepath-text" title={customUrl}>
                                        <span className="sgl-modal-filepath-prefix">Path: </span>
                                        {customUrl}
                                    </div>
                                ) : (
                                    <div className="sgl-modal-filepath-hint">
                                        Select any PNG, JPG, or WebP from your storage (~/Pictures, SD card, etc.)
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Console Icon Selector */}
                        {mode === 'icon' && (
                            <div className="sgl-modal-section">
                                <label className="sgl-modal-section-title">Console / Platform Icon</label>
                                <div className="sgl-modal-console-header-row">
                                    <div
                                        className={`sgl-modal-console-auto-btn${!selectedIcon ? ' active' : ''}${focusZone === 'autodetect' ? ' focused' : ''}`}
                                        onClick={() => {
                                            setFocusZone('autodetect');
                                            setSelectedIcon('');
                                            setMode('icon');
                                        }}
                                    >
                                        ⚡ Auto-Detect ({currentArt.iconKey ? (CONSOLE_SHORT_LABELS[currentArt.iconKey] ?? currentArt.iconKey) : 'None'})
                                    </div>
                                    <div className="sgl-modal-console-selected-badge">
                                        <span>Active: </span>
                                        <strong>
                                            {selectedIcon
                                                ? (CONSOLE_SHORT_LABELS[selectedIcon] ?? selectedIcon)
                                                : (currentArt.iconKey ? `Auto (${CONSOLE_SHORT_LABELS[currentArt.iconKey] ?? currentArt.iconKey})` : 'Default')}
                                        </strong>
                                    </div>
                                </div>

                                <div ref={consoleGridRef} className="sgl-modal-console-grid">
                                    {consoleKeys.map((key, idx) => {
                                        const iconUri = getBundledConsoleIcon(key);
                                        const isSelected = selectedIcon === key;
                                        const isItemFocused = focusZone === 'consoleGrid' && gridIndex === idx;
                                        return (
                                            <div
                                                key={key}
                                                data-console-key={key}
                                                className={`sgl-modal-console-item${isSelected ? ' active' : ''}${isItemFocused ? ' focused' : ''}`}
                                                onClick={() => {
                                                    setFocusZone('consoleGrid');
                                                    setGridIndex(idx);
                                                    setSelectedIcon(key);
                                                    setMode('icon');
                                                }}
                                                title={CONSOLE_LABELS[key]}
                                            >
                                                {iconUri ? (
                                                    <img
                                                        src={iconUri}
                                                        alt={CONSOLE_LABELS[key]}
                                                        className="sgl-modal-console-thumb"
                                                    />
                                                ) : (
                                                    <div className="sgl-modal-console-thumb-fallback" />
                                                )}
                                                <span className="sgl-modal-console-name">{CONSOLE_SHORT_LABELS[key] ?? key}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="sgl-modal-footer">
                    <div
                        className={`sgl-modal-action-btn sgl-modal-btn-save${focusZone === 'footer' && footerIndex === 0 ? ' focused' : ''}`}
                        onClick={() => {
                            setFocusZone('footer');
                            setFooterIndex(0);
                            handleSave();
                        }}
                    >
                        <FaCheck size={12} />
                        <span>Save Changes</span>
                        <span className="sgl-btn-badge">A</span>
                    </div>

                    {existingCustom && (
                        <div
                            className={`sgl-modal-action-btn sgl-modal-btn-reset${focusZone === 'footer' && footerIndex === 1 ? ' focused' : ''}`}
                            onClick={() => {
                                setFocusZone('footer');
                                setFooterIndex(1);
                                handleReset();
                            }}
                        >
                            <FaUndo size={11} />
                            <span>Reset to Default</span>
                        </div>
                    )}

                    <div
                        className={`sgl-modal-action-btn sgl-modal-btn-cancel${focusZone === 'footer' && footerIndex === (existingCustom ? 2 : 1) ? ' focused' : ''}`}
                        onClick={() => {
                            setFocusZone('footer');
                            setFooterIndex(existingCustom ? 2 : 1);
                            onClose();
                        }}
                    >
                        <FaTimes size={12} />
                        <span>Cancel</span>
                        <span className="sgl-btn-badge">B</span>
                    </div>
                </div>
            </Focusable>
        </div>
    );
}
