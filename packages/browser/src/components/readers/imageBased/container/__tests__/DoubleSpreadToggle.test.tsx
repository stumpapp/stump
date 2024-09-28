import { Media } from '@stump/types'
import { fireEvent, render } from '@testing-library/react'
import { DeepPartial } from 'react-hook-form'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { IImageBaseReaderContext, useImageBaseReaderContext } from '../../context'
import DoubleSpreadToggle from '../DoubleSpreadToggle'

jest.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: jest.fn(),
}))
const setBookPreferences = jest.fn()
const createBookPreferences = (
	overrides: DeepPartial<ReturnType<typeof useBookPreferences>> = {},
): ReturnType<typeof useBookPreferences> =>
	({
		bookPreferences: { doubleSpread: false },
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

describe('DoubleSpreadToggle', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		jest.mocked(useBookPreferences).mockReturnValue(createBookPreferences())
		jest.mocked(useImageBaseReaderContext).mockReturnValue(createReaderContext())
	})

	it('should render', () => {
		expect(render(<DoubleSpreadToggle />).container).not.toBeEmptyDOMElement()
	})

	it('should properly update the double spread', () => {
		const { getByLabelText, rerender } = render(<DoubleSpreadToggle />)

		fireEvent.click(getByLabelText('Double spread'))
		expect(setBookPreferences).toHaveBeenCalledWith({ doubleSpread: true })

		jest
			.mocked(useBookPreferences)
			.mockReturnValue(createBookPreferences({ bookPreferences: { doubleSpread: true } }))
		rerender(<DoubleSpreadToggle />)

		fireEvent.click(getByLabelText('Double spread'))
		expect(setBookPreferences).toHaveBeenCalledWith({ doubleSpread: false })
	})
})
