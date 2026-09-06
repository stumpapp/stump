import { LocaleProvider } from '@stump/i18n'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import ReaderSettings from '../ReaderSettings'

const readerState = vi.hoisted(() => ({
	bookPreferences: {},
	setBookPreferences: vi.fn(),
	setSettings: vi.fn(),
	settings: {
		animatedReader: false,
		doublePageBehavior: 'off',
		imageScaling: { scaleToFit: 'HEIGHT' },
		panzoomWithoutCtrl: false,
		readingDirection: 'LTR',
		readingMode: 'PAGED',
		secondPageSeparate: false,
		tapSidesToNavigate: true,
		trackElapsedTime: true,
	},
}))

vi.mock('@/stores', () => ({
	useReaderStore: (selector: (state: typeof readerState) => unknown) => selector(readerState),
}))

describe('ReaderSettings', () => {
	it('renders localized stable settings copy', () => {
		render(
			<MemoryRouter>
				<LocaleProvider locale="en-US">
					<ReaderSettings />
				</LocaleProvider>
			</MemoryRouter>,
		)

		expect(screen.getByText('Mode')).toBeInTheDocument()
		expect(screen.getByText('Image Options')).toBeInTheDocument()
		expect(screen.getByText('Preferences')).toBeInTheDocument()
		expect(screen.getByText('Separate second page')).toBeInTheDocument()
		expect(screen.getByText('Pan and zoom without Ctrl / Cmd')).toBeInTheDocument()
		expect(screen.getByText('Tap sides to navigate')).toBeInTheDocument()
		expect(screen.getByText('Reading timer')).toBeInTheDocument()
	})
})
