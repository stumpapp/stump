import {
	type Decoration,
	type DecorationObserver,
	EpubNavigator,
	type EpubNavigatorListeners,
	EpubPreferences,
	type IEpubPreferences,
} from '@readium/navigator'
import type { BasicTextSelection } from '@readium/navigator-html-injectables'
import { Link, Locator, Publication } from '@readium/shared'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { clearFramesSelection } from '../annotations/clearSelection'
import { locatorToHref, resolvePublicationLinkLocator } from './locator'
import {
	attachFrameReloadGuard,
	patchDurableIframeSrc,
	recoverBlankFrames,
} from './patchDurableIframeSrc'

type LoadState = { status: 'idle' | 'loading' | 'ready' } | { status: 'error'; message: string }

type UseReadiumNavigatorArgs = {
	containerRef: React.RefObject<HTMLDivElement | null>
	publication: Publication | null
	positions: Locator[]
	initialLocator?: Locator
	allowedDomains: string[]
	preferences: IEpubPreferences
	onPositionChanged: (locator: Locator) => void
	onToggleControls?: () => void
	onTextSelected?: (selection: BasicTextSelection) => void
	onTextCleared?: () => void
	onDecorationActivated?: DecorationObserver['onDecorationActivated']
}

export type UseReadiumNavigatorResult = {
	loadState: LoadState
	api: ReadiumNavigatorApi
}

export type ReadiumNavigatorApi = {
	goForward: () => Promise<boolean>
	goBackward: () => Promise<boolean>
	go: (locator: Locator) => Promise<boolean>
	goLink: (link: Link) => Promise<boolean>
	canGoForward: boolean
	canGoBackward: boolean
	currentLocator: Locator | null
	submitPreferences: (prefs: IEpubPreferences) => Promise<void>
	/** Replace all decorations in a named group (e.g. annotations). */
	applyDecorations: (decorations: Decoration[], group: string) => void
	/**
	 * Clear the active text selection inside Readium frames.
	 * Uses `_cframes` (documented private API) because the public navigator
	 * surface does not yet expose selection clearing.
	 */
	clearSelection: () => void
}

const MIN_VIEWPORT_PX = 1
const ANNOTATIONS_GROUP = 'annotations'
// A safety cap prevents a hidden/unmounted reader from waiting forever for ResizeObserver.
const VIEWPORT_READY_TIMEOUT_MS = 5_000

/**
 * Mount and lifecycle-manage an EpubNavigator inside a container element.
 *
 * The container's *parent* is what EpubNavigator ResizeObserver watches, and
 * Readium mutates `container.style.width` for column/layout math. Keep that
 * parent stably sized via CSS (not AutoSizer remounts / 0×0 flashes).
 */
export function useReadiumNavigator({
	containerRef,
	publication,
	positions,
	initialLocator,
	allowedDomains,
	preferences,
	onPositionChanged,
	onToggleControls,
	onTextSelected,
	onTextCleared,
	onDecorationActivated,
}: UseReadiumNavigatorArgs): UseReadiumNavigatorResult {
	const { t } = useLocaleContext()
	const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' })
	const [navButtons, setNavButtons] = useState({ canGoBackward: false, canGoForward: false })
	const [currentLocator, setCurrentLocator] = useState<Locator | null>(null)
	const navigatorRef = useRef<EpubNavigator | null>(null)
	const onPositionChangedRef = useRef(onPositionChanged)
	const onToggleControlsRef = useRef(onToggleControls)
	const onTextSelectedRef = useRef(onTextSelected)
	const onTextClearedRef = useRef(onTextCleared)
	const onDecorationActivatedRef = useRef(onDecorationActivated)
	const preferencesRef = useRef(preferences)
	const decorationObserverRef = useRef<DecorationObserver | null>(null)
	const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const navigationTailRef = useRef<Promise<void>>(Promise.resolve())
	const navigationGenerationRef = useRef(0)

	useEffect(() => {
		onPositionChangedRef.current = onPositionChanged
		onToggleControlsRef.current = onToggleControls
		onTextSelectedRef.current = onTextSelected
		onTextClearedRef.current = onTextCleared
		onDecorationActivatedRef.current = onDecorationActivated
		preferencesRef.current = preferences
	}, [
		onPositionChanged,
		onToggleControls,
		onTextSelected,
		onTextCleared,
		onDecorationActivated,
		preferences,
	])

	const syncNavButtons = useCallback((nav: EpubNavigator | null) => {
		if (!nav) return
		setNavButtons({
			canGoBackward: nav.canGoBackward,
			canGoForward: nav.canGoForward,
		})
	}, [])

	/**
	 * Readium rejects a navigation immediately while another one is active. Serialize
	 * Stump-originated requests so bookmark, annotation, search, keyboard, and link
	 * navigation cannot silently race each other.
	 */
	const enqueueNavigation = useCallback(
		(
			navigator: EpubNavigator,
			navigate: (complete: (ok: boolean) => void) => void,
		): Promise<boolean> => {
			const generation = navigationGenerationRef.current
			const result = navigationTailRef.current.then(() => {
				if (generation !== navigationGenerationRef.current || navigator !== navigatorRef.current) {
					return false
				}

				return new Promise<boolean>((resolve) => {
					let settled = false
					const complete = (ok: boolean) => {
						if (settled) return
						settled = true
						syncNavButtons(navigator)
						resolve(ok)
					}

					try {
						navigate(complete)
					} catch (error) {
						console.error('[useReadiumNavigator] navigation failed', error)
						complete(false)
					}
				})
			})

			navigationTailRef.current = result.then(() => undefined)
			return result
		},
		[syncNavButtons],
	)

	const clearSelection = useCallback(() => {
		const nav = navigatorRef.current
		if (!nav) return
		// Private `_cframes` access is intentional and contract-tested — see
		// annotations/__tests__/clearSelection.test.ts. Prefer a public API if
		// Readium adds one.
		clearFramesSelection(nav._cframes)
	}, [])

	const applyDecorations = useCallback((decorations: Decoration[], group: string) => {
		navigatorRef.current?.applyDecorations(decorations, group)
	}, [])

	const handleSelectionChange = useCallback((e: Event) => {
		if (clearTimerRef.current) {
			clearTimeout(clearTimerRef.current)
		}
		clearTimerRef.current = setTimeout(() => {
			const doc = e.target as Document
			const sel = doc.getSelection()
			if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
				onTextClearedRef.current?.()
			}
		}, 100)
	}, [])

	const attachSelectionClearListeners = useCallback(() => {
		const nav = navigatorRef.current
		if (!nav) return
		for (const frame of nav._cframes) {
			try {
				const doc = frame?.iframe?.contentWindow?.document
				if (!doc) continue
				doc.removeEventListener('selectionchange', handleSelectionChange)
				doc.addEventListener('selectionchange', handleSelectionChange)
			} catch {
				// Cross-origin or destroyed frame, ignore.
			}
		}
	}, [handleSelectionChange])

	useEffect(() => {
		if (!publication || !positions.length || !containerRef.current) {
			setLoadState({ status: 'idle' })
			return
		}

		let cancelled = false
		let navigator: EpubNavigator | null = null
		let detachReloadGuard: (() => void) | null = null
		const container = containerRef.current
		const viewport = container.parentElement

		const open = async () => {
			setLoadState({ status: 'loading' })

			try {
				await waitForNonZeroBox(viewport, () => cancelled)
				if (cancelled) return

				// FrameManager uses location.replace(blob) without setting iframe.src;
				// browser reload then lands on about:blank. Patch navigates via src.
				patchDurableIframeSrc()

				const listeners: EpubNavigatorListeners = {
					frameLoaded: () => {},
					timelineItemChanged: () => {},
					positionChanged: (locator: Locator) => {
						setCurrentLocator(locator)
						syncNavButtons(navigatorRef.current)
						onPositionChangedRef.current(locator)
						attachSelectionClearListeners()
					},
					// Return true to suppress Readium's built-in quarter-based tap
					// navigation (left quarter = back, right quarter = forward).
					// Stump's own controls handle all navigation; link clicks inside
					// the iframe are handled before this listener fires.
					tap: () => true,
					click: () => true,
					zoom: () => {},
					miscPointer: () => {},
					scroll: () => {},
					customEvent: () => {},
					handleLocator: (locator) => {
						const internal = resolvePublicationLinkLocator(
							locator,
							positions,
							navigator?.currentLocator?.href,
						)
						if (internal && navigator) {
							const currentNavigator = navigator
							void enqueueNavigation(currentNavigator, (complete) =>
								currentNavigator.go(internal, false, complete),
							)
							return true
						}

						const href = locatorToHref(locator, navigator?.currentLocator?.href)
						if (/^(https?:|mailto:|tel:)/i.test(href)) {
							window.open(href, '_blank', 'noopener,noreferrer')
							return true
						}

						return false
					},
					textSelected: (selection) => {
						onTextSelectedRef.current?.(selection)
					},
					contentProtection: () => {},
					contextMenu: () => {},
					peripheral: () => {},
				}

				const fontHref =
					typeof window !== 'undefined'
						? `${window.location.origin}/assets/fonts/fonts.css`
						: '/assets/fonts/fonts.css'

				navigator = new EpubNavigator(
					container,
					publication,
					listeners,
					positions,
					initialLocator,
					{
						preferences: preferencesRef.current,
						defaults: {},
						injectables: {
							rules: [
								{
									resources: [/.*/],
									prepend: [
										{
											as: 'link',
											rel: 'stylesheet',
											url: fontHref,
											target: 'head',
										},
									],
								},
							],
							allowedDomains,
						},
					},
				)

				wrapResizeWithRecovery(navigator)

				await navigator.load()
				if (cancelled) {
					await navigator.destroy()
					return
				}

				const observer: DecorationObserver = {
					onDecorationActivated: (event) => {
						return onDecorationActivatedRef.current?.(event) ?? false
					},
				}
				decorationObserverRef.current = observer
				navigator.registerDecorationObserver(ANNOTATIONS_GROUP, observer)

				detachReloadGuard = attachFrameReloadGuard(navigator, container)

				navigatorRef.current = navigator
				setCurrentLocator(navigator.currentLocator)
				syncNavButtons(navigator)
				setLoadState({ status: 'ready' })
				attachSelectionClearListeners()
			} catch (error) {
				console.error('[useReadiumNavigator] open failed', error)
				if (!cancelled) {
					setLoadState({
						status: 'error',
						message: error instanceof Error ? error.message : t('epubReader.errors.openFailed'),
					})
				}
			}
		}

		void open()

		return () => {
			cancelled = true
			navigationGenerationRef.current += 1
			navigationTailRef.current = Promise.resolve()
			if (clearTimerRef.current) {
				clearTimeout(clearTimerRef.current)
				clearTimerRef.current = null
			}
			detachReloadGuard?.()
			detachReloadGuard = null
			const current = navigator
			const observer = decorationObserverRef.current
			if (current && observer) {
				try {
					current.unregisterDecorationObserver(observer)
				} catch {
					// Navigator may already be tearing down.
				}
			}
			decorationObserverRef.current = null
			navigatorRef.current = null
			setCurrentLocator(null)
			if (current) {
				void current.destroy().catch((err) => {
					console.error('[useReadiumNavigator] destroy failed', err)
				})
			}
		}
		// Intentionally omit preferences — applied via submitPreferences on change.
	}, [
		publication,
		positions,
		initialLocator,
		allowedDomains,
		attachSelectionClearListeners,
		containerRef,
		enqueueNavigation,
		syncNavButtons,
		t,
	])

	useEffect(() => {
		const nav = navigatorRef.current
		if (!nav || loadState.status !== 'ready') return
		void nav.submitPreferences(new EpubPreferences(preferences)).catch((err) => {
			console.error('[useReadiumNavigator] submitPreferences failed', err)
		})
	}, [preferences, loadState.status])

	const api = useMemo<ReadiumNavigatorApi>(
		() => ({
			goForward: () => {
				const navigator = navigatorRef.current
				return navigator
					? enqueueNavigation(navigator, (complete) => navigator.goForward(false, complete))
					: Promise.resolve(false)
			},
			goBackward: () => {
				const navigator = navigatorRef.current
				return navigator
					? enqueueNavigation(navigator, (complete) => navigator.goBackward(false, complete))
					: Promise.resolve(false)
			},
			go: (locator: Locator) => {
				const navigator = navigatorRef.current
				return navigator
					? enqueueNavigation(navigator, (complete) => navigator.go(locator, false, complete))
					: Promise.resolve(false)
			},
			goLink: (link: Link) => {
				const navigator = navigatorRef.current
				return navigator
					? enqueueNavigation(navigator, (complete) => navigator.goLink(link, false, complete))
					: Promise.resolve(false)
			},
			canGoForward: navButtons.canGoForward,
			canGoBackward: navButtons.canGoBackward,
			currentLocator,
			submitPreferences: async (prefs: IEpubPreferences) => {
				await navigatorRef.current?.submitPreferences(new EpubPreferences(prefs))
			},
			applyDecorations,
			clearSelection,
		}),
		[applyDecorations, clearSelection, currentLocator, enqueueNavigation, navButtons],
	)

	return { loadState, api }
}

/** Wait until `el` has a usable content box, or abort when `isCancelled` is true. */
function waitForNonZeroBox(el: HTMLElement | null, isCancelled: () => boolean): Promise<void> {
	if (!el) return Promise.resolve()
	if (el.clientWidth >= MIN_VIEWPORT_PX && el.clientHeight >= MIN_VIEWPORT_PX) {
		return Promise.resolve()
	}

	return new Promise((resolve, reject) => {
		const observer = new ResizeObserver(() => {
			if (isCancelled()) {
				observer.disconnect()
				resolve()
				return
			}
			if (el.clientWidth >= MIN_VIEWPORT_PX && el.clientHeight >= MIN_VIEWPORT_PX) {
				observer.disconnect()
				resolve()
			}
		})
		observer.observe(el)

		window.setTimeout(() => {
			observer.disconnect()
			if (isCancelled()) {
				resolve()
				return
			}
			if (el.clientWidth >= MIN_VIEWPORT_PX && el.clientHeight >= MIN_VIEWPORT_PX) {
				resolve()
			} else {
				reject(new Error('EPUB viewport never received a non-zero size'))
			}
		}, VIEWPORT_READY_TIMEOUT_MS)
	})
}

/**
 * After Readium's resize path, rebind any frames whose document was wiped or
 * whose Loader still points at a previous contentWindow.
 */
function wrapResizeWithRecovery(navigator: EpubNavigator) {
	const original = navigator.resizeHandler.bind(navigator)
	let inFlight = false
	let queued = false

	navigator.resizeHandler = async () => {
		queued = true
		if (inFlight) return
		inFlight = true
		try {
			while (queued) {
				queued = false
				await original()
				await recoverBlankFrames(navigator)
			}
		} catch (err) {
			console.error('[useReadiumNavigator] resizeHandler failed', err)
		} finally {
			inFlight = false
			if (queued) {
				void navigator.resizeHandler()
			}
		}
	}
}
