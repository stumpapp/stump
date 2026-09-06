import { LocaleProvider } from '@stump/i18n'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useFullscreen } from 'rooks'

import { usePaths } from '@/paths'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../../context'
import ReaderHeader from '../ReaderHeader'

vi.mock('rooks', () => ({
	useFullscreen: vi.fn(),
}))

vi.mock('@/paths', () => ({
	usePaths: vi.fn(),
}))

vi.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: vi.fn(),
}))

vi.mock('../../context', async () => ({
	...(await vi.importActual<typeof import('../../context')>('../../context')),
	useImageBaseReaderContext: vi.fn(),
}))

vi.mock('../SettingsDialog', () => ({
	default: () => <div data-testid="settings-dialog" />,
}))

vi.mock('../TimerMenu', () => ({
	default: () => <div data-testid="timer-menu" />,
}))

describe('ReaderHeader', () => {
	beforeEach(() => {
		vi.mocked(useFullscreen).mockReturnValue({
			disableFullscreen: vi.fn(async () => undefined),
			enableFullscreen: vi.fn(async () => undefined),
			fullscreenElement: null,
			isFullscreenAvailable: false,
			isFullscreenEnabled: false,
			toggleFullscreen: vi.fn(async () => undefined),
		})
		vi.mocked(usePaths).mockReturnValue({
			bookOverview: (id: string) => `/books/${id}`,
		} as ReturnType<typeof usePaths>)
		vi.mocked(useBookPreferences).mockReturnValue({
			settings: { showToolBar: true },
		} as ReturnType<typeof useBookPreferences>)
		vi.mocked(useImageBaseReaderContext).mockReturnValue({
			book: { id: 'book-id', resolvedName: 'Sample Book' },
		} as ReturnType<typeof useImageBaseReaderContext>)
	})

	it('links back to the media overview with localized copy', () => {
		render(
			<MemoryRouter>
				<LocaleProvider locale="en-US">
					<ReaderHeader />
				</LocaleProvider>
			</MemoryRouter>,
		)

		expect(screen.getByTitle('Go to media overview')).toHaveAttribute('href', '/books/book-id')
		expect(screen.getByText('Sample Book')).toBeInTheDocument()
	})
})
