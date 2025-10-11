import '@/__mocks__/resizeObserver'
import '@/__mocks__/pointerCapture'

import { fireEvent, render, screen } from '@testing-library/react'
import { DeepPartial } from 'react-hook-form'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { IImageBaseReaderContext, useImageBaseReaderContext } from '../../context'
import BrightnessControl from '../BrightnessControl'

jest.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: jest.fn(),
}))
const setBookPreferences = jest.fn()
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

jest.mock('../../context', () => ({
	...jest.requireActual('../../context'),
	useImageBaseReaderContext: jest.fn(),
}))

const createReaderContext = (
	overrides: Partial<IImageBaseReaderContext> = {},
): IImageBaseReaderContext =>
	({
		book: {} as any,
		currentPage: 1,
		...overrides,
	}) as IImageBaseReaderContext

window.HTMLElement.prototype.setPointerCapture = jest
	.fn()
	.mockImplementation(() => setBookPreferences())

// Note: This is a bit funky to test
describe('BrightnessControl', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		jest.mocked(useBookPreferences).mockReturnValue(createBookPreferences())
		jest.mocked(useImageBaseReaderContext).mockReturnValue(createReaderContext())
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
