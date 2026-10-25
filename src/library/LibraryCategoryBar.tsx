import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaGamepad } from 'react-icons/fa';
import { LibraryCategory, LibraryCollectionItem } from './libraryData';
import { LibrarySortMode } from '../data/settings';
import { SORT_ICONS, SORT_LABELS } from './librarySort';

export interface LibraryCategoryBarProps {
    categories: LibraryCategory[];
    activeCategoryId: string;
    onSelectCategory: (id: string) => void;
    focusedIndex?: number;
    isHeaderFocused?: boolean;
    isInsideSubCollection?: boolean;
    collections?: LibraryCollectionItem[];
    activeSubCollectionId?: string | null;
    onSelectSubCollection?: (id: string) => void;
    activeSubCollectionName?: string | null;
    onBackToCollections?: () => void;
    sortMode?: LibrarySortMode;
    onCycleSort?: () => void;
}

export function LibraryCategoryBar({
    categories,
    activeCategoryId,
    onSelectCategory,
    focusedIndex = 0,
    isHeaderFocused = false,
    isInsideSubCollection = false,
    collections,
    activeSubCollectionId = null,
    onSelectSubCollection,
    activeSubCollectionName = null,
    onBackToCollections,
    sortMode = 'recent',
    onCycleSort,
}: LibraryCategoryBarProps) {
    const isShowingCollections = Boolean(
        isInsideSubCollection && collections && collections.length > 0
    );

    const tabsList: Array<{ id: string; name: string; count: number }> = isShowingCollections
        ? collections!
        : categories;

    const currentActiveId = isShowingCollections
        ? (activeSubCollectionId ?? (collections?.[0]?.id ?? ''))
        : activeCategoryId;

    const activeItem = isShowingCollections
        ? collections?.find((c) => c.id === currentActiveId) ?? collections?.[0]
        : categories.find((c) => c.id === activeCategoryId) ?? categories[0];

    const handleSelectTab = (id: string) => {
        if (isShowingCollections) {
            onSelectSubCollection?.(id);
        } else {
            onSelectCategory(id);
        }
    };

    const navRef = useRef<HTMLElement | null>(null);
    const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    const [isDragging, setIsDragging] = useState(false);
    const pointerStartRef = useRef<{ x: number; scrollLeft: number; time: number } | null>(null);
    const lastPositionsRef = useRef<Array<{ x: number; time: number }>>([]);
    const wasDraggedRef = useRef(false);
    const dragEndTimeRef = useRef(0);
    const momentumRafRef = useRef<number | null>(null);

    const stopMomentum = useCallback(() => {
        if (momentumRafRef.current !== null) {
            cancelAnimationFrame(momentumRafRef.current);
            momentumRafRef.current = null;
        }
    }, []);

    const startMomentum = useCallback((initialVelocity: number) => {
        const nav = navRef.current;
        if (!nav) return;

        let velocity = initialVelocity * 16;
        velocity = Math.max(-35, Math.min(35, velocity));

        let lastTime = performance.now();
        const step = (time: number) => {
            const dt = Math.min(32, time - lastTime);
            lastTime = time;
            if (!navRef.current || Math.abs(velocity) < 0.5) {
                momentumRafRef.current = null;
                return;
            }
            navRef.current.scrollLeft += velocity * (dt / 16);
            velocity *= 0.92;
            momentumRafRef.current = requestAnimationFrame(step);
        };
        momentumRafRef.current = requestAnimationFrame(step);
    }, []);

    const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        const nav = navRef.current;
        if (!nav) return;

        stopMomentum();
        pointerStartRef.current = {
            x: e.clientX,
            scrollLeft: nav.scrollLeft,
            time: performance.now(),
        };
        lastPositionsRef.current = [{ x: e.clientX, time: performance.now() }];
    };

    const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
        const start = pointerStartRef.current;
        const nav = navRef.current;
        if (!start || !nav) return;

        const deltaX = e.clientX - start.x;
        if (!isDragging && Math.abs(deltaX) > 6) {
            setIsDragging(true);
            try {
                e.currentTarget.setPointerCapture?.(e.pointerId);
            } catch {
                // Ignore pointer capture errors
            }
        }

        if (isDragging) {
            nav.scrollLeft = start.scrollLeft - deltaX;
            const now = performance.now();
            const filtered = lastPositionsRef.current.filter((p) => now - p.time < 120);
            filtered.push({ x: e.clientX, time: now });
            lastPositionsRef.current = filtered;
        }
    };

    const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
        if (!pointerStartRef.current) return;
        pointerStartRef.current = null;

        if (isDragging) {
            setIsDragging(false);
            wasDraggedRef.current = true;
            dragEndTimeRef.current = Date.now();

            try {
                e.currentTarget.releasePointerCapture?.(e.pointerId);
            } catch {
                // Ignore
            }

            const positions = lastPositionsRef.current;
            if (positions.length >= 2) {
                const first = positions[0];
                const last = positions[positions.length - 1];
                const dt = last.time - first.time;
                if (dt > 10 && dt < 200) {
                    const vx = (last.x - first.x) / dt;
                    if (Math.abs(vx) > 0.15) {
                        startMomentum(-vx);
                    }
                }
            }

            setTimeout(() => {
                wasDraggedRef.current = false;
            }, 400);
        }
    };

    const onPointerCancel = () => {
        pointerStartRef.current = null;
        if (isDragging) {
            setIsDragging(false);
            wasDraggedRef.current = true;
            dragEndTimeRef.current = Date.now();
            setTimeout(() => {
                wasDraggedRef.current = false;
            }, 400);
        }
    };

    const onWheel = (e: React.WheelEvent<HTMLElement>) => {
        const nav = navRef.current;
        if (!nav) return;
        stopMomentum();
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        nav.scrollLeft += delta;
    };

    useEffect(() => {
        return () => {
            stopMomentum();
        };
    }, [stopMomentum]);

    // Automatically scroll the active tab strictly within the tabs nav container (never scrolls parent layout)
    useEffect(() => {
        // Do not auto-scroll while user is actively dragging tabs
        if (isDragging) return;
        const nav = navRef.current;
        const activeTabEl = tabRefs.current.get(currentActiveId);
        if (nav && activeTabEl) {
            const navRect = nav.getBoundingClientRect();
            const tabRect = activeTabEl.getBoundingClientRect();
            const relativeLeft = tabRect.left - navRect.left + nav.scrollLeft;
            const targetLeft = relativeLeft - (nav.clientWidth / 2) + (tabRect.width / 2);
            nav.scrollTo({
                left: Math.max(0, targetLeft),
                behavior: 'smooth',
            });
        }
    }, [currentActiveId, isDragging]);

    return (
        <header className="sgl-header">
            {/* Left: Brand / Title OR Back to Collections Button */}
            <div className="sgl-brand">
                {isShowingCollections ? (
                    <button
                        className="sgl-btn-back-col"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onBackToCollections?.();
                        }}
                    >
                        <span className="sgl-btn-back-text">‹ COLLECTIONS</span>
                        <span className="sgl-btn-badge" style={{ marginLeft: 2 }}>B</span>
                    </button>
                ) : (
                    <>
                        <FaGamepad className="sgl-brand-icon" size={14} />
                        <span className="sgl-brand-text">LIBRARY</span>
                    </>
                )}
            </div>

            {/* Center: Category or Collection Tabs with Bumper Prompts (or fallback breadcrumb if collections array empty) */}
            {activeSubCollectionName && !isShowingCollections ? (
                <div className="sgl-breadcrumb">
                    <button
                        className="sgl-btn-back-col"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onBackToCollections?.();
                        }}
                    >
                        <span className="sgl-btn-back-text">‹ COLLECTIONS</span>
                        <span className="sgl-btn-badge" style={{ marginLeft: 2 }}>B</span>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="sgl-bumper-badge">L1</span>
                        <span className="sgl-breadcrumb-title">{String(activeSubCollectionName || '').toUpperCase()}</span>
                        <span className="sgl-bumper-badge">R1</span>
                    </div>
                </div>
            ) : (
                <div className="sgl-tabs-container">
                    <span className="sgl-bumper-badge">L1</span>
                    <nav
                        className={`sgl-tabs${isDragging ? ' sgl-tabs-dragging' : ''}`}
                        role="tablist"
                        ref={navRef}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerCancel}
                        onWheel={onWheel}
                    >
                        {tabsList.map((item, idx) => {
                            const isActive = item.id === currentActiveId;
                            const isFocused = isHeaderFocused && idx === focusedIndex;
                            return (
                                <button
                                    key={item.id}
                                    ref={(el) => {
                                        if (el) tabRefs.current.set(item.id, el);
                                        else tabRefs.current.delete(item.id);
                                    }}
                                    role="tab"
                                    aria-selected={isActive}
                                    className={`sgl-tab${isActive ? ' active' : ''}${isFocused ? ' focused' : ''}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (wasDraggedRef.current || Date.now() - dragEndTimeRef.current < 400) {
                                            return;
                                        }
                                        handleSelectTab(item.id);
                                    }}
                                >
                                    <span className="sgl-tab-label">{item.name}</span>
                                    <span className="sgl-tab-count">{item.count}</span>
                                    <div className="sgl-tab-line" />
                                </button>
                            );
                        })}
                    </nav>
                    <span className="sgl-bumper-badge">R1</span>
                </div>
            )}

            {/* Right: Category/Collection Count Info & Library Sort Toggle */}
            <div className="sgl-header-right">
                <button
                    type="button"
                    className="sgl-sort-btn"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCycleSort?.();
                    }}
                    title={`Current sort: ${SORT_LABELS[sortMode]}. Click to cycle.`}
                >
                    <span className="sgl-sort-icon">{SORT_ICONS[sortMode]}</span>
                    <span className="sgl-sort-text">{SORT_LABELS[sortMode]}</span>
                </button>
                <div className="sgl-header-info">
                    {isShowingCollections
                        ? `${activeItem?.count ?? 0} GAMES`
                        : activeSubCollectionName
                            ? 'IN COLLECTION'
                            : activeItem
                                ? (activeItem.id === 'soundtracks' || (activeItem as LibraryCategory).isSoundtracksTab)
                                    ? `${activeItem.count} SOUNDTRACKS`
                                    : (activeItem.id === 'collections' || (activeItem as LibraryCategory).isCollectionsTab)
                                        ? `${activeItem.count} COLLECTIONS`
                                        : `${activeItem.count} GAMES`
                                : ''}
                </div>
            </div>
        </header>
    );
}
