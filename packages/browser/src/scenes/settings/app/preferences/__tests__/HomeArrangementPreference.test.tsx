import '@/__mocks__/resizeObserver'

import { FilterableArrangementEntity } from '@stump/graphql'
import { LocaleProvider } from '@stump/i18n'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

import { getHomeSectionId, HomeSection, toHomeSectionInput } from '@/scenes/home/arrangement'

import { HomeArrangementForm } from '../HomeArrangementPreference'

const initialSections: HomeSection[] = [
	{ visible: true, config: { __typename: 'InProgressBooks', name: null } },
	{ visible: true, config: { __typename: 'OnDeckBooks', name: null } },
	{
		visible: true,
		config: {
			__typename: 'RecentlyAdded',
			entity: FilterableArrangementEntity.Books,
			name: null,
		},
	},
	{
		visible: true,
		config: {
			__typename: 'RecentlyAdded',
			entity: FilterableArrangementEntity.Series,
			name: null,
		},
	},
]

vi.mock('sonner', () => ({ toast: { error: vi.fn(), dismiss: vi.fn() } }))

function renderForm(
	onSave = vi.fn().mockResolvedValue(undefined),
	sections = initialSections,
	onCancel = vi.fn(),
) {
	return {
		onSave,
		onCancel,
		...render(
			<LocaleProvider locale="en-US">
				<HomeArrangementForm sections={sections} onSave={onSave} onCancel={onCancel} />
			</LocaleProvider>,
		),
	}
}

function visibilityButtons() {
	return within(screen.getByRole('list', { name: 'Home sections' }))
		.getAllByRole('button')
		.filter((button) => button.hasAttribute('aria-pressed'))
}

function rowLabels() {
	return visibilityButtons().map((button) => button.getAttribute('aria-label'))
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('HomeArrangementForm', () => {
	it('saves keyboard ordering and visibility together', async () => {
		// jsdom has no layout; give sortable rows their actual vertical relationship.
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: HTMLElement,
		) {
			const row = this.closest('li')
			const index = row ? Array.from(row.parentElement!.children).indexOf(row) : 0
			return new DOMRect(0, index * 60, 400, 60)
		})
		const user = userEvent.setup()
		const { onSave } = renderForm()
		await user.click(screen.getByRole('button', { name: 'Recently added books' }))
		screen.getByRole('button', { name: 'Reorder Recently added series' }).focus()
		await user.keyboard('[Space][ArrowUp][Space]')
		await waitFor(() =>
			expect(rowLabels()).toEqual([
				'Continue reading',
				'Your next read',
				'Recently added series',
				'Recently added books',
			]),
		)
		expect(onSave).not.toHaveBeenCalled()
		await user.click(screen.getByRole('button', { name: 'Save' }))
		const saved: HomeSection[] = onSave.mock.calls[0]![0]
		expect(saved.map(getHomeSectionId)).toEqual([
			'continueReading',
			'onDeck',
			'recentlyAddedSeries',
			'recentlyAddedBooks',
		])
		expect(saved[3]!.visible).toBe(false)
		expect(saved.map(toHomeSectionInput)[3]).toEqual({
			visible: false,
			config: { recentlyAdded: { entity: 'BOOKS', name: null } },
		})
	})

	it('resets the order and visibility before saving', async () => {
		const user = userEvent.setup()
		const { onSave } = renderForm(
			vi.fn().mockResolvedValue(undefined),
			[...initialSections].reverse().map((section) => ({ ...section, visible: false })),
		)
		await user.click(screen.getByRole('button', { name: 'Reset' }))
		expect(rowLabels()).toEqual([
			'Continue reading',
			'Your next read',
			'Recently added books',
			'Recently added series',
		])
		visibilityButtons().forEach((item) => expect(item).toHaveAttribute('aria-pressed', 'true'))
		expect(onSave).not.toHaveBeenCalled()
	})

	it('shows the save error and retains edits for retry', async () => {
		const user = userEvent.setup()
		const onSave = vi
			.fn()
			.mockRejectedValueOnce(new Error('Offline'))
			.mockResolvedValueOnce(undefined)
		renderForm(onSave)
		await user.click(screen.getByRole('button', { name: 'Recently added series' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(toast.error).toHaveBeenCalledWith('Failed to save your changes', {
			description: 'Offline',
		})
		expect(screen.getByRole('button', { name: 'Recently added series' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)
		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(onSave).toHaveBeenCalledTimes(2)
		expect(onSave.mock.calls[1]![0]).toEqual(onSave.mock.calls[0]![0])
	})

	it('disables editing during a pending save without changing the button label', async () => {
		const user = userEvent.setup()
		let resolve!: () => void
		const { onSave } = renderForm(
			vi.fn(
				() =>
					new Promise<void>((done) => {
						resolve = done
					}),
			),
		)
		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
		visibilityButtons().forEach((item) => expect(item).toBeDisabled())
		resolve()
		await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled())
		expect(onSave).toHaveBeenCalledTimes(1)
	})

	it('cancels without saving', async () => {
		const user = userEvent.setup()
		const { onSave, onCancel } = renderForm()
		await user.click(screen.getByRole('button', { name: 'Recently added series' }))
		await user.click(screen.getByRole('button', { name: 'Cancel' }))
		expect(onCancel).toHaveBeenCalledOnce()
		expect(onSave).not.toHaveBeenCalled()
	})

	it('can hide every section', async () => {
		const user = userEvent.setup()
		const { onSave } = renderForm()
		for (const item of visibilityButtons()) await user.click(item)
		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(onSave.mock.calls[0]![0].every((section: HomeSection) => !section.visible)).toBe(true)
	})

	it('recovers an unsupported configuration using Reset', async () => {
		const user = userEvent.setup()
		const { onSave } = renderForm(vi.fn(), [
			{ visible: true, config: { __typename: 'CustomArrangementConfig' } },
		])
		expect(toast.error).toHaveBeenCalledWith(
			'Invalid configuration',
			expect.objectContaining({ description: 'Please reset to defaults and try again' }),
		)
		expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
		await user.click(screen.getByRole('button', { name: 'Reset' }))
		expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
		expect(rowLabels()).toEqual([
			'Continue reading',
			'Your next read',
			'Recently added books',
			'Recently added series',
		])
		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(onSave.mock.calls[0]![0]).toEqual(initialSections)
	})
})
