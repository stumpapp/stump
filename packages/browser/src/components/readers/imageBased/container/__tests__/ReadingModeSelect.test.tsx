import { Media } from '@stump/sdk'
import { fireEvent, render } from '@testing-library/react'
import { DeepPartial } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { IImageBaseReaderContext, useImageBaseReaderContext } from '../../context'
import ReadingModeSelect from '../ReadingModeSelect'

jest.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: jest.fn(),
}))
const setBookPreferences = jest.fn()
const createBookPreferences = (
	overrides: DeepPartial<ReturnType<typeof useBookPreferences>> = {},
): ReturnType<typeof useBookPreferences> =>
	({
		bookPreferences: { readingMode: 'paged' },
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

jest.mock('react-router-dom', () => ({
	useSearchParams: jest.fn(),
}))
const setSearch = jest.fn()

describe('ReadingModeSelect', () => {
	const originalWarn = console.warn
	beforeAll(() => {
		console.warn = jest.fn()
	})
	afterAll(() => {
		console.warn = originalWarn
	})

	beforeEach(() => {
		jest.clearAllMocks()

		jest.mocked(useSearchParams).mockReturnValue([new URLSearchParams(), setSearch])
		jest.mocked(useBookPreferences).mockReturnValue(createBookPreferences())
		jest.mocked(useImageBaseReaderContext).mockReturnValue(createReaderContext())
	})

	it('should render', () => {
		const { container } = render(<ReadingModeSelect />)
		expect(container).not.toBeEmptyDOMElement()
	})

	it('should properly set the page in the URL when changing from a continuous mode to a paged mode', () => {
		jest
			.mocked(useBookPreferences)
			.mockReturnValue(
				createBookPreferences({ bookPreferences: { readingMode: 'continuous:vertical' } }),
			)

		const { getByLabelText } = render(<ReadingModeSelect />)

		fireEvent.change(getByLabelText('Mode'), { target: { value: 'paged' } })

		expect(setSearch).toHaveBeenCalledTimes(1)
		expect(setSearch).toHaveBeenCalledWith(new URLSearchParams('page=1'))
		expect(setBookPreferences).toHaveBeenCalledWith({ readingMode: 'paged' })
	})

	it('should delete the page in the URL when changing from a paged mode to a continuous mode', () => {
		const { getByLabelText } = render(<ReadingModeSelect />)

		fireEvent.change(getByLabelText('Mode'), { target: { value: 'continuous:vertical' } })

		expect(setSearch).toHaveBeenCalledTimes(1)
		expect(setSearch).toHaveBeenCalledWith(new URLSearchParams())
		expect(setBookPreferences).toHaveBeenCalledWith({ readingMode: 'continuous:vertical' })
	})

	it('should not allow invalid reading modes', () => {
		const { getByLabelText } = render(<ReadingModeSelect />)

		fireEvent.change(getByLabelText('Mode'), { target: { value: 'invalid' } })

		expect(setSearch).not.toHaveBeenCalled()
		expect(setBookPreferences).not.toHaveBeenCalled()
	})
})
