import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import ReaderSettings from '../ReaderSettings'

vi.mock('@/hooks/useTranslate', () => ({
	useTranslate: () => ({ t: (s: string) => s, translate: (s: string) => s }),
}))

const readerState = vi.hoisted(() => ({
	bookPreferences: {},
	setBookPreferences: vi.fn(),
	setSettings: vi.fn(),
	settings: {
		animatedReader: false,
		doublePageBehavior: 'off',
		imageScaling: { scaleToFit: 'HEIGHT' },
		panzoomWithoutCtrl: false,
		preload: { ahead: 5, behind: 3 },
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

// TODO: add more meaningful tests

describe('ReaderSettings', () => {
	it('renders localized stable settings copy', () => {
		render(
			<MemoryRouter>
				<ReaderSettings />
			</MemoryRouter>,
		)

		expect(screen.getByText('shared.readerSettings.sections.mode')).toBeInTheDocument()
		expect(screen.getByText('shared.readerSettings.sections.imageOptions')).toBeInTheDocument()
		expect(screen.getByText('shared.common.preferences')).toBeInTheDocument()
		expect(screen.getByText('shared.readerSettings.separateSecondPage')).toBeInTheDocument()
		expect(screen.getByText('shared.readerSettings.panZoomWithoutCtrl')).toBeInTheDocument()
		expect(screen.getByText('shared.readerSettings.tapSidesToNavigate')).toBeInTheDocument()
		expect(screen.getByText('shared.readerSettings.readingTimer.label')).toBeInTheDocument()
	})
})
