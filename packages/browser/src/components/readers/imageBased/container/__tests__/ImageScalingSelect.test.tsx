import { Media } from '@stump/sdk'
import { fireEvent, render, screen } from '@testing-library/react'
import { DeepPartial } from 'react-hook-form'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { IImageBaseReaderContext, useImageBaseReaderContext } from '../../context'
import ImageScalingSelect from '../ImageScalingSelect'

jest.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: jest.fn(),
}))
const setBookPreferences = jest.fn()
const createBookPreferences = (
	overrides: DeepPartial<ReturnType<typeof useBookPreferences>> = {},
): ReturnType<typeof useBookPreferences> =>
	({
		bookPreferences: {
			imageScaling: {
				scaleToFit: 'height',
			},
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
		book: {} as Media,
		currentPage: 1,
		...overrides,
	}) as IImageBaseReaderContext

describe('ImageScalingSelect', () => {
	const originalWarn = console.warn
	beforeAll(() => {
		console.warn = jest.fn()
	})
	afterAll(() => {
		console.warn = originalWarn
	})

	beforeEach(() => {
		jest.clearAllMocks()

		jest.mocked(useBookPreferences).mockReturnValue(createBookPreferences())
		jest.mocked(useImageBaseReaderContext).mockReturnValue(createReaderContext())
	})

	it('should render', () => {
		expect(render(<ImageScalingSelect />).container).not.toBeEmptyDOMElement()
	})

	it('should change the image scaling properly', () => {
		render(<ImageScalingSelect />)

		const validOptions = ['height', 'width', 'none']
		for (const option of validOptions) {
			fireEvent.change(screen.getByLabelText('Image scaling'), { target: { value: option } })
			expect(setBookPreferences).toHaveBeenCalledWith({
				imageScaling: {
					scaleToFit: option,
				},
			})
		}
	})

	it('should not allow invalid image scaling options', () => {
		render(<ImageScalingSelect />)
		fireEvent.change(screen.getByLabelText('Image scaling'), { target: { value: 'invalid' } })
		expect(setBookPreferences).not.toHaveBeenCalled()
	})
})
