import '@/__mocks__/resizeObserver'
import '@/__mocks__/pointerCapture'

import { fireEvent, render, screen } from '@testing-library/react'
import { DeepPartial } from 'react-hook-form'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { IImageBaseReaderContext, useImageBaseReaderContext } from '../../context'
import BrightnessControl from '../BrightnessControl'

vi.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: vi.fn(),
}))
const setBookPreferences = vi.fn()
const createBookPreferences = (
	overrides: DeepPartial<ReturnType<typeof useBookPreferences>> = {},
): ReturnType<typeof useBookPreferences> =>
	({
		bookPreferences: {
			brightness: 1,
		},
		setBookPreferences,
		...overrides,
	}) as ReturnType<typeof useBookPreferences>

vi.mock('../../context', async () => ({
	...(await vi.importActual<typeof import('../../context')>('../../context')),
	useImageBaseReaderContext: vi.fn(),
}))

const createReaderContext = (
	overrides: Partial<IImageBaseReaderContext> = {},
): IImageBaseReaderContext =>
	({
		book: {} as any,
		currentPage: 1,
		...overrides,
	}) as IImageBaseReaderContext

window.HTMLElement.prototype.setPointerCapture = vi
	.fn()
	.mockImplementation(() => setBookPreferences())

// Note: This is a bit funky to test
describe('BrightnessControl', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		vi.mocked(useBookPreferences).mockReturnValue(createBookPreferences())
		vi.mocked(useImageBaseReaderContext).mockReturnValue(createReaderContext())
	})

	it('should render', () => {
		expect(render(<BrightnessControl />).container).not.toBeEmptyDOMElement()
	})

	it('should properly change the brightness on drag', async () => {
		render(<BrightnessControl />)

		const slider = screen.getByTestId('sliderThumb')

		fireEvent.pointerEnter(slider)
		fireEvent.pointerDown(slider, { clientX: 0 })
		fireEvent.pointerMove(slider, { clientX: 10 })
		fireEvent.pointerUp(slider)

		expect(window.HTMLElement.prototype.setPointerCapture).toHaveBeenCalledTimes(1)

		expect(setBookPreferences).toHaveBeenCalledTimes(1)
	})
})
