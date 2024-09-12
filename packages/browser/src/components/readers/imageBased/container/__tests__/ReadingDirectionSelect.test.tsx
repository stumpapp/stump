import { Media } from '@stump/types'
import { fireEvent, render } from '@testing-library/react'
import { DeepPartial } from 'react-hook-form'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { IImageBaseReaderContext, useImageBaseReaderContext } from '../../context'
import ReadingDirectionSelect from '../ReadingDirectionSelect'

jest.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: jest.fn(),
}))
const setBookPreferences = jest.fn()
const createBookPreferences = (
	overrides: DeepPartial<ReturnType<typeof useBookPreferences>> = {},
): ReturnType<typeof useBookPreferences> =>
	({
		bookPreferences: { readingDirection: 'ltr' },
		setBookPreferences,
		...overrides,
	}) as ReturnType<typeof useBookPreferences>

jest.mock('../../context', () => ({
	...jest.requireActual('../../context'),
	useImageBaseReaderContext: jest.fn(),
}))

const createReaderContext = (
	overrides: DeepPartial<IImageBaseReaderContext> = {},
): IImageBaseReaderContext =>
	({
		book: {} as Media,
		...overrides,
	}) as IImageBaseReaderContext

describe('ReadingDirectionSelect', () => {
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
		expect(render(<ReadingDirectionSelect />).container).not.toBeEmptyDOMElement()
	})

	it('should properly update the reading direction', () => {
		const { getByLabelText } = render(<ReadingDirectionSelect />)

		fireEvent.change(getByLabelText('Reading direction'), { target: { value: 'rtl' } })
		expect(setBookPreferences).toHaveBeenCalledWith({ readingDirection: 'rtl' })

		fireEvent.change(getByLabelText('Reading direction'), { target: { value: 'ltr' } })
		expect(setBookPreferences).toHaveBeenCalledWith({ readingDirection: 'ltr' })
	})

	it('should not allow invalid reading directions', () => {
		const { getByLabelText } = render(<ReadingDirectionSelect />)

		fireEvent.change(getByLabelText('Reading direction'), { target: { value: 'invalid' } })
		expect(setBookPreferences).not.toHaveBeenCalled()
	})
})
