import { clearFramesSelection } from '../clearSelection'

describe('clearFramesSelection', () => {
	it('removes all ranges from every frame content window selection', () => {
		const removeAllRanges = vi.fn()
		const getSelection = vi.fn(() => ({ removeAllRanges }))
		const frameA = { iframe: { contentWindow: { getSelection } as unknown as Window } }
		const frameB = { iframe: { contentWindow: { getSelection } as unknown as Window } }

		clearFramesSelection([frameA, frameB])

		expect(getSelection).toHaveBeenCalledTimes(2)
		expect(removeAllRanges).toHaveBeenCalledTimes(2)
	})

	it('skips frames with no iframe, no content window, or no active selection', () => {
		const getSelection = vi.fn(() => null)
		expect(() =>
			clearFramesSelection([
				{ iframe: null },
				{ iframe: { contentWindow: null } },
				{ iframe: { contentWindow: { getSelection } as unknown as Window } },
				null,
				undefined,
			]),
		).not.toThrow()
		expect(getSelection).toHaveBeenCalledTimes(1)
	})

	it('swallows errors thrown by cross-origin or destroyed frames', () => {
		const frame = {
			get iframe(): never {
				throw new Error('destroyed frame')
			},
		}

		expect(() => clearFramesSelection([frame])).not.toThrow()
	})
})
