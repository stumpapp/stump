import {
	EpubNavigator,
	type EpubNavigatorListeners,
	EpubPreferences,
	type IEpubPreferences,
} from '@readium/navigator'
import { Link, Locator, Publication } from '@readium/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
	attachFrameReloadGuard,
	patchDurableIframeSrc,
	recoverBlankFrames,
} from './patchDurableIframeSrc'

type LoadState =
	| { status: 'idle' | 'loading' }
	| { status: 'ready' }
	| { status: 'error'; message: string }

type UseReadiumNavigatorArgs = {
	containerRef: React.RefObject<HTMLDivElement | null>
	publication: Publication | null
	positions: Locator[]
	initialLocator?: Locator
	allowedDomains: string[]
	preferences: IEpubPreferences
	onPositionChanged: (locator: Locator) => void
	onToggleControls?: () => void
}

export type ReadiumNavigatorApi = {
	goForward: () => void
	goBackward: () => void
	go: (locator: Locator) => void
	goLink: (link: Link) => void
	canGoForward: boolean
	canGoBackward: boolean
	currentLocator: Locator | null
	submitPreferences: (prefs: IEpubPreferences) => Promise<void>
}

const MIN_VIEWPORT_PX = 1

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
}: UseReadiumNavigatorArgs): {
	loadState: LoadState
	api: ReadiumNavigatorApi | null
} {
	const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' })
	const [navButtons, setNavButtons] = useState({ canGoBackward: false, canGoForward: false })
	const [currentLocator, setCurrentLocator] = useState<Locator | null>(null)
	const navigatorRef = useRef<EpubNavigator | null>(null)
	const onPositionChangedRef = useRef(onPositionChanged)
	const onToggleControlsRef = useRef(onToggleControls)
	const preferencesRef = useRef(preferences)

	onPositionChangedRef.current = onPositionChanged
	onToggleControlsRef.current = onToggleControls
	preferencesRef.current = preferences

	const syncNavButtons = useCallback((nav: EpubNavigator | null) => {
		if (!nav) return
		setNavButtons({
			canGoBackward: nav.canGoBackward,
			canGoForward: nav.canGoForward,
		})
	}, [])

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
					positionChanged: (locator: Locator) => {
						setCurrentLocator(locator)
						syncNavButtons(navigatorRef.current)
						onPositionChangedRef.current(locator)
					},
					tap: () => {
						onToggleControlsRef.current?.()
						return true
					},
					click: () => {
						onToggleControlsRef.current?.()
						return true
					},
					zoom: () => {},
					miscPointer: () => {},
					scroll: () => {},
					customEvent: () => {},
					handleLocator: () => false,
					textSelected: () => {},
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

				detachReloadGuard = attachFrameReloadGuard(navigator, container)

				navigatorRef.current = navigator
				setCurrentLocator(navigator.currentLocator)
				syncNavButtons(navigator)
				setLoadState({ status: 'ready' })
			} catch (error) {
				console.error('[useReadiumNavigator] open failed', error)
				if (!cancelled) {
					setLoadState({
						status: 'error',
						message: error instanceof Error ? error.message : 'Failed to open EPUB with Readium.',
					})
				}
			}
		}

		void open()

		return () => {
			cancelled = true
			detachReloadGuard?.()
			detachReloadGuard = null
			navigatorRef.current = null
			setCurrentLocator(null)
			const current = navigator
			if (current) {
				void current.destroy().catch((err) => {
					console.error('[useReadiumNavigator] destroy failed', err)
				})
			}
		}
		// Intentionally omit preferences — applied via submitPreferences on change.
	}, [publication, positions, initialLocator, allowedDomains, containerRef, syncNavButtons])

	useEffect(() => {
		const nav = navigatorRef.current
		if (!nav || loadState.status !== 'ready') return
		void nav.submitPreferences(new EpubPreferences(preferences)).catch((err) => {
			console.error('[useReadiumNavigator] submitPreferences failed', err)
		})
	}, [preferences, loadState.status])

	const api: ReadiumNavigatorApi | null =
		loadState.status === 'ready' && navigatorRef.current
			? {
					goForward: () => {
						navigatorRef.current?.goForward(false, () => syncNavButtons(navigatorRef.current))
					},
					goBackward: () => {
						navigatorRef.current?.goBackward(false, () => syncNavButtons(navigatorRef.current))
					},
					go: (locator: Locator) => {
						navigatorRef.current?.go(locator, false, () => syncNavButtons(navigatorRef.current))
					},
					goLink: (link: Link) => {
						navigatorRef.current?.goLink(link, false, () => syncNavButtons(navigatorRef.current))
					},
					canGoForward: navButtons.canGoForward,
					canGoBackward: navButtons.canGoBackward,
					currentLocator,
					submitPreferences: async (prefs: IEpubPreferences) => {
						await navigatorRef.current?.submitPreferences(new EpubPreferences(prefs))
					},
				}
			: null

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
		}, 5000)
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
