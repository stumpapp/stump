/**
 * Pinned to `@readium/navigator@2.6.1` / `@readium/navigator-html-injectables@2.5.0`.
 *
 * This module monkeypatches and reaches into **private/unexported** Readium internals that
 * are not part of its public API contract. Re-verify every one of these against the release
 * notes before bumping either package:
 *
 * - `FrameManager.prototype.load` — patched in place (`patchDurableIframeSrc`) to navigate via
 *   `iframe.src` instead of `contentWindow.location.replace(blob)`, so a browser-driven reload
 *   (e.g. on resize) lands back on the publication resource instead of `about:blank`.
 * - `FrameManager.prototype.show` — patched by `patchHiddenFrameAnimationFrames` so Firefox can
 *   run Readium's rAF-based activation commands before the frame is visually revealed.
 * - `FrameManager#iframe` / `#source` / `#loader` / `#comms` / `#currModules` — private instance
 *   fields read/written directly (no public getters exist).
 * - `EpubNavigator#_cframes` — private field (underscore-prefixed, unexported type) read to
 *   enumerate live frames.
 * - `EpubNavigator#pool` — the `FramePoolManager`'s internal `pool` Map is read directly; there
 *   is no public iteration API for pooled frames.
 * - `EpubNavigator#determineModules` — private method invoked via a duck-typed check.
 * - `EpubNavigator#resizeHandler` — public but undocumented; wrapped (not replaced) to add
 *   blank-frame recovery after every resize.
 * - `EpubNavigator#attachListener` — private method invoked via a duck-typed check after
 *   recovering frames, to re-bind Readium's own event listeners to the rebuilt frame.
 *
 * If any of these renames/removes on upgrade, this file will need a matching rewrite — it is
 * not just a config tweak.
 */
import { type EpubNavigator, FrameManager } from '@readium/navigator'
import { Loader, type ModuleName } from '@readium/navigator-html-injectables'

type FrameManagerInternal = {
	iframe: HTMLIFrameElement
	source: string
	loader?: Loader
	comms?: { halt: () => void; ready?: boolean } | null
	currModules: ModuleName[]
	load: (modules: ModuleName[]) => Promise<Window>
	show: (atProgress?: number) => Promise<void>
}

/** Tracks which Window a FrameManager's Loader was bound to. */
const loaderWindows = new WeakMap<object, Window>()

/**
 * Readium's FrameManager navigates with `contentWindow.location.replace(blobUrl)`
 * and never sets `iframe.src`. The iframe's src attribute therefore stays at its
 * default (`about:blank`). Any browser-driven document reload (observed in
 * Stump on window resize) reloads from `src` → blank page while the shell
 * iframe stays "visible".
 *
 * Navigate via `iframe.src = blobUrl` so reloads restore the publication resource,
 * and rebind Loader/comms when the document window is replaced.
 */
export function patchDurableIframeSrc(): void {
	const proto = FrameManager.prototype as unknown as FrameManagerInternal & {
		__stumpDurableSrc?: boolean
	}

	if (proto.__stumpDurableSrc) return
	proto.__stumpDurableSrc = true

	proto.load = function loadWithDurableSrc(this: FrameManagerInternal, modules: ModuleName[]) {
		return new Promise((resolve, reject) => {
			if (this.loader) {
				const wnd = this.iframe.contentWindow!
				if ([...this.currModules].sort().join('|') === [...modules].sort().join('|')) {
					try {
						resolve(wnd)
					} catch {
						/* ignore */
					}
					return
				}
				this.comms?.halt()
				this.loader.destroy()
				this.loader = new Loader(wnd as never, modules)
				this.currModules = modules
				this.comms = undefined
				loaderWindows.set(this, wnd)
				try {
					resolve(wnd)
				} catch {
					/* ignore */
				}
				return
			}

			this.iframe.onload = () => {
				const wnd = this.iframe.contentWindow!
				this.loader = new Loader(wnd as never, modules)
				this.currModules = modules
				loaderWindows.set(this, wnd)
				try {
					resolve(wnd)
				} catch {
					/* ignore */
				}
			}
			this.iframe.onerror = (err) => {
				try {
					reject(err)
				} catch {
					/* ignore */
				}
			}

			// Durable navigation — survives document reloads.
			this.iframe.src = this.source
		})
	}
}

/**
 * Firefox throttles `requestAnimationFrame` in an iframe with `visibility: hidden` to roughly
 * one frame per second. Readium's `FrameManager.show()` waits for two rAF-backed commands from
 * ColumnSnapper (`focus` and `go_progression`) before it removes that hidden state, turning a
 * cross-chapter transition into a two-second wait.
 *
 * Make the frame renderable before calling Readium's show lifecycle, while keeping it fully
 * transparent, non-interactive, and aria-hidden. Readium still removes all temporary styles on
 * success. Restore the previous visibility if its lifecycle fails.
 */
export function patchHiddenFrameAnimationFrames(): void {
	const proto = FrameManager.prototype as unknown as FrameManagerInternal & {
		__stumpFrameAnimationFrames?: boolean
	}

	if (proto.__stumpFrameAnimationFrames) return
	proto.__stumpFrameAnimationFrames = true

	const show = proto.show
	proto.show = async function showWithRenderableFrame(
		this: FrameManagerInternal,
		atProgress?: number,
	) {
		const previousVisibility = this.iframe.style.visibility
		if (previousVisibility === 'hidden') {
			this.iframe.style.visibility = 'visible'
		}

		try {
			await show.call(this, atProgress)
		} catch (error) {
			this.iframe.style.visibility = previousVisibility
			throw error
		}
	}
}

function allFrameManagers(navigator: EpubNavigator): FrameManagerInternal[] {
	const fromCframes = navigator._cframes.filter(
		(f): f is FrameManager => f instanceof FrameManager,
	) as unknown as FrameManagerInternal[]

	const poolMap = (navigator.pool as unknown as { pool?: Map<string, FrameManager> })?.pool
	if (!poolMap) return fromCframes

	const fromPool = [...poolMap.values()] as unknown as FrameManagerInternal[]
	const seen = new Set<FrameManagerInternal>()
	const out: FrameManagerInternal[] = []
	for (const frame of [...fromPool, ...fromCframes]) {
		if (seen.has(frame)) continue
		seen.add(frame)
		out.push(frame)
	}
	return out
}

function modulesFor(frame: FrameManagerInternal, navigator: EpubNavigator): ModuleName[] | null {
	if (frame.currModules.length) return [...frame.currModules]
	const determineModules = (navigator as unknown as { determineModules?: () => ModuleName[] })
		.determineModules
	if (typeof determineModules === 'function') {
		return determineModules.call(navigator)
	}
	return null
}

/** ColumnSnapper.mount reads document.body.dir — body must exist first. */
function documentReadyForInjectables(wnd: Window): boolean {
	return !!wnd.document?.body && wnd.document.readyState !== 'loading'
}

async function waitForInjectableDocument(wnd: Window, timeoutMs = 2000): Promise<boolean> {
	if (documentReadyForInjectables(wnd)) return true
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		await new Promise<void>((r) => requestAnimationFrame(() => r()))
		if (documentReadyForInjectables(wnd)) return true
	}
	return documentReadyForInjectables(wnd)
}

async function rebindFrame(
	frame: FrameManagerInternal,
	navigator: EpubNavigator,
	opts?: { show?: boolean },
): Promise<boolean> {
	const modules = modulesFor(frame, navigator)
	if (!modules?.length) return false

	const wnd = frame.iframe.contentWindow
	if (!wnd) return false

	let href = ''
	try {
		href = wnd.location.href
	} catch {
		return false
	}

	const blank = href === 'about:blank' || href === ''

	frame.comms?.halt()
	frame.loader?.destroy()
	frame.loader = undefined
	frame.comms = undefined
	frame.currModules = []

	if (blank) {
		await frame.load(modules)
	} else {
		const ready = await waitForInjectableDocument(wnd)
		if (!ready) return false
		frame.loader = new Loader(wnd as never, modules)
		frame.currModules = modules
		loaderWindows.set(frame, wnd)
	}

	const shouldShow = opts?.show === true || frame.iframe.style.visibility !== 'hidden'
	if (shouldShow) {
		const progression = navigator.currentLocator?.locations?.progression
		await frame.show(progression ?? undefined)
	}

	return true
}

/**
 * Rebind frames wiped to about:blank, or whose Loader is bound to a previous
 * contentWindow after a same-src reload.
 *
 * Per-frame errors are isolated — one broken pool neighbor must not abort resize.
 */
export async function recoverBlankFrames(navigator: EpubNavigator): Promise<number> {
	let recovered = 0

	for (const frame of allFrameManagers(navigator)) {
		let href = ''
		try {
			href = frame.iframe.contentWindow?.location.href ?? ''
		} catch {
			continue
		}

		const currentWnd = frame.iframe.contentWindow
		const boundWnd = loaderWindows.get(frame)
		const blank = href === 'about:blank' || href === ''
		const stale = !!currentWnd && !!boundWnd && boundWnd !== currentWnd

		if (!blank && !stale) continue

		try {
			const ok = await rebindFrame(frame, navigator, {
				// Only re-activate the visible frame; pool neighbors stay hidden.
				show: frame.iframe.style.visibility !== 'hidden',
			})
			if (ok) recovered += 1
		} catch (err) {
			console.error('[readium] frame recover failed', err)
		}
	}

	if (recovered > 0) {
		try {
			;(navigator as unknown as { attachListener?: () => void }).attachListener?.()
		} catch {
			/* ignore */
		}
	}

	return recovered
}

/**
 * When the browser reloads an iframe (resize path), rebind injectables to the
 * new contentWindow so pagination/comms keep working.
 */
export function attachFrameReloadGuard(
	navigator: EpubNavigator,
	container: HTMLElement,
): () => void {
	let scheduled = false

	const onLoad = () => {
		if (scheduled) return
		scheduled = true
		queueMicrotask(() => {
			scheduled = false
			void recoverBlankFrames(navigator).catch((err) => {
				console.error('[readium] frame reload recover failed', err)
			})
		})
	}

	container.addEventListener('load', onLoad, true)
	return () => container.removeEventListener('load', onLoad, true)
}
