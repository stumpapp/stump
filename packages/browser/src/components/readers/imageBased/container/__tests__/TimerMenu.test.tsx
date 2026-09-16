import { ReadingDirection, ReadingImageScaleFit, ReadingMode } from '@stump/graphql'
import { LocaleProvider } from '@stump/i18n'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { IImageBaseReaderContext, useImageBaseReaderContext } from '../../context'
import TimerMenu from '../TimerMenu'

vi.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: vi.fn(),
}))

vi.mock('../../context', async () => ({
	...(await vi.importActual<typeof import('../../context')>('../../context')),
	useImageBaseReaderContext: vi.fn(),
}))

const resetTimer = vi.fn()
const setBookPreferences = vi.fn()
const setSettings = vi.fn()

const createReaderContext = (): IImageBaseReaderContext => ({
	book: { id: 'book-id' } as IImageBaseReaderContext['book'],
	currentPage: 1,
	getPageUrl: vi.fn(),
	imageSizes: {},
	pageSets: [],
	setCurrentPage: vi.fn(),
	setPageSize: vi.fn(),
	timer: {
		getCurrentTime: vi.fn(() => 0),
		pause: vi.fn(),
		reset: resetTimer,
		resume: vi.fn(),
	},
	toggleToolbar: vi.fn(),
})

const mockPreferences = (trackElapsedTime: boolean) => {
	const bookPreferences = {
		brightness: 1,
		imageScaling: { scaleToFit: ReadingImageScaleFit.Height },
		readingDirection: ReadingDirection.Ltr,
		readingMode: ReadingMode.Paged,
		secondPageSeparate: false,
		tapSidesToNavigate: true,
		trackElapsedTime,
	}

	vi.mocked(useBookPreferences).mockReturnValue({
		bookPreferences,
		setBookPreferences,
		setSettings,
		settings: {
			...bookPreferences,
			preload: { ahead: 5, behind: 3 },
			showToolBar: false,
		},
	})
}

describe('TimerMenu', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useImageBaseReaderContext).mockReturnValue(createReaderContext())
	})

	it('starts and resets the reader timer', async () => {
		const user = userEvent.setup()
		mockPreferences(false)
		render(
			<LocaleProvider locale="en-US">
				<TimerMenu />
			</LocaleProvider>,
		)

		await user.click(screen.getByRole('button'))
		await user.click(await screen.findByText('Start Timer'))
		expect(setBookPreferences).toHaveBeenCalledWith({ trackElapsedTime: true })

		await user.click(screen.getByRole('button'))
		await user.click(await screen.findByText('Reset Timer'))
		expect(resetTimer).toHaveBeenCalledOnce()
	})

	it('shows the stop action when the timer is active', async () => {
		const user = userEvent.setup()
		mockPreferences(true)
		render(
			<LocaleProvider locale="en-US">
				<TimerMenu />
			</LocaleProvider>,
		)

		await user.click(screen.getByRole('button'))
		expect(await screen.findByText('Stop Timer')).toBeInTheDocument()
	})
})
