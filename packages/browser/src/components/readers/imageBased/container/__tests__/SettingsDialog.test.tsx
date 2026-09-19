import { LocaleProvider } from '@stump/i18n'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useImageBaseReaderContext } from '../../context'
import SettingsDialog from '../SettingsDialog'

vi.mock('../../context', async () => ({
	...(await vi.importActual<typeof import('../../context')>('../../context')),
	useImageBaseReaderContext: vi.fn(),
}))

vi.mock('../ReaderSettings', () => ({
	default: ({ forBook, currentPage }: { forBook?: string; currentPage?: number }) => (
		<div
			data-testid="reader-settings"
			data-for-book={forBook ?? ''}
			data-current-page={currentPage ?? ''}
		/>
	),
}))

describe('SettingsDialog', () => {
	beforeEach(() => {
		vi.mocked(useImageBaseReaderContext).mockReturnValue({
			book: { id: 'book-id' },
			currentPage: 7,
		} as ReturnType<typeof useImageBaseReaderContext>)
	})

	it('switches between localized book and global settings scopes', async () => {
		const user = userEvent.setup()
		render(
			<LocaleProvider locale="en-US">
				<SettingsDialog />
			</LocaleProvider>,
		)

		await user.click(screen.getByRole('button'))

		const readerSettings = await screen.findByTestId('reader-settings')
		expect(screen.getByRole('tab', { name: 'Book' })).toHaveAttribute('data-state', 'active')
		expect(readerSettings).toHaveAttribute('data-for-book', 'book-id')
		expect(readerSettings).toHaveAttribute('data-current-page', '7')

		await user.click(screen.getByRole('tab', { name: 'Global' }))

		expect(screen.getByRole('tab', { name: 'Global' })).toHaveAttribute('data-state', 'active')
		expect(readerSettings).toHaveAttribute('data-for-book', '')
		expect(readerSettings).toHaveAttribute('data-current-page', '')
	})
})
