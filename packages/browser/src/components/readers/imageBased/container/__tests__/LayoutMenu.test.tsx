import { Media } from '@stump/types'
import { fireEvent, render, screen } from '@testing-library/react'
import { DeepPartial } from 'react-hook-form'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { IImageBaseReaderContext, useImageBaseReaderContext } from '../../context'
import LayoutMenu from '../LayoutMenu'

jest.mock('../ReadingDirectionSelect', () => ({
	__esModule: true,
	default: () => <div data-testid="ReadingDirectionSelect" />,
}))

jest.mock('../ReadingModeSelect', () => ({
	__esModule: true,
	default: () => <div data-testid="ReadingModeSelect" />,
}))

jest.mock('../DoubleSpreadToggle', () => ({
	__esModule: true,
	default: () => <div data-testid="DoubleSpreadToggle" />,
}))

jest.mock('../ImageScalingSelect', () => ({
	__esModule: true,
	default: () => <div data-testid="ImageScalingSelect" />,
}))

jest.mock('../BrightnessControl', () => ({
	__esModule: true,
	default: () => <div data-testid="BrightnessControl" />,
}))

jest.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: jest.fn(),
}))
const setBookPreferences = jest.fn()
const createBookPreferences = (
	overrides: DeepPartial<ReturnType<typeof useBookPreferences>> = {},
): ReturnType<typeof useBookPreferences> =>
	({
		bookPreferences: { readingDirection: 'ltr', readingMode: 'paged' },
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

describe('LayoutMenu', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		jest.mocked(useBookPreferences).mockReturnValue(createBookPreferences())
		jest.mocked(useImageBaseReaderContext).mockReturnValue(createReaderContext())
	})

	it('should render', () => {
		const { container } = render(<LayoutMenu />)

		expect(container).not.toBeEmptyDOMElement()

		fireEvent.click(screen.getByTestId('trigger'))

		expect(screen.getByTestId('ReadingModeSelect')).toBeInTheDocument()
		expect(screen.getByTestId('DoubleSpreadToggle')).toBeInTheDocument()
		expect(screen.getByTestId('ReadingDirectionSelect')).toBeInTheDocument()
		expect(screen.getByTestId('BrightnessControl')).toBeInTheDocument()
	})

	it('should not render reading direction select or double spread when reading mode is continuous:vertical', () => {
		jest
			.mocked(useBookPreferences)
			.mockReturnValue(
				createBookPreferences({ bookPreferences: { readingMode: 'continuous:vertical' } }),
			)

		const { container } = render(<LayoutMenu />)

		expect(container).not.toBeEmptyDOMElement()

		fireEvent.click(screen.getByTestId('trigger'))

		expect(screen.getByTestId('ReadingModeSelect')).toBeInTheDocument()

		expect(screen.queryByTestId('DoubleSpreadToggle')).not.toBeInTheDocument()
		expect(screen.queryByTestId('ReadingDirectionSelect')).not.toBeInTheDocument()
	})
})
