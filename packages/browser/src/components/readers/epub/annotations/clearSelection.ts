type FrameLike =
	| {
			iframe?: { contentWindow?: Window | null } | null
	  }
	| null
	| undefined

/**
 * Walks a Readium navigator's frame pool and clears any active text selection inside
 * each frame's content window. Extracted as a pure helper so the navigator's private
 * `_cframes` contract (see `useReadiumNavigator`'s `clearSelection`) can be unit tested
 * without mounting the full navigator.
 */
export function clearFramesSelection(frames: Iterable<FrameLike>): void {
	for (const frame of frames) {
		try {
			const win = frame?.iframe?.contentWindow
			win?.getSelection()?.removeAllRanges()
		} catch {
			// Cross-origin or destroyed frame, ignore.
		}
	}
}
