import '@/__mocks__/resizeObserver'

import { FilterableArrangementEntity } from '@stump/graphql'
import { LocaleProvider } from '@stump/i18n'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { getHomeSectionId, HomeSection, toHomeSectionInput } from '@/scenes/home/arrangement'

import { HomeArrangementForm } from '../HomeArrangementPreference'

const initialSections: HomeSection[] = [
	{ visible: true, config: { __typename: 'InProgressBooks', name: null, links: [] } },
	{ visible: true, config: { __typename: 'OnDeckBooks', name: null, links: [] } },
	{
		visible: true,
		config: {
			__typename: 'RecentlyAdded',
			entity: FilterableArrangementEntity.Books,
			name: null,
			links: [],
		},
	},
	{
		visible: true,
		config: {
			__typename: 'RecentlyAdded',
			entity: FilterableArrangementEntity.Series,
			name: null,
			links: [],
		},
	},
]

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

function rowLabels() {
	return within(screen.getByRole('list', { name: 'Home sections' }))
		.getAllByRole('switch')
		.map((item) => item.getAttribute('aria-labelledby'))
		.map((id) => document.getElementById(id!)?.textContent)
}

describe('HomeArrangementForm', () => {
	it('saves visibility and order together, preserving the section identities', async () => {
		const user = userEvent.setup()
		const { onSave } = renderForm()
		await user.click(screen.getByRole('switch', { name: 'Recently added books' }))
		await user.click(screen.getByRole('button', { name: 'Move Recently added series up' }))
		expect(onSave).not.toHaveBeenCalled()
		expect(rowLabels()).toEqual([
			'Continue reading',
			'Your next read',
			'Recently added series',
			'Recently added books',
		])
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
			config: { recentlyAdded: { entity: 'BOOKS', name: null, links: [] } },
		})
	})

	it('restores the default order and makes all sections visible before saving', async () => {
		const user = userEvent.setup()
		const { onSave } = renderForm(
			vi.fn().mockResolvedValue(undefined),
			[...initialSections].reverse().map((section) => ({ ...section, visible: false })),
		)
		await user.click(screen.getByRole('button', { name: 'Restore defaults' }))
		expect(rowLabels()).toEqual([
			'Continue reading',
			'Your next read',
			'Recently added books',
			'Recently added series',
		])
		screen.getAllByRole('switch').forEach((item) => expect(item).toBeChecked())
		expect(onSave).not.toHaveBeenCalled()
	})

	it('retains edits after a failed save and allows retry', async () => {
		const user = userEvent.setup()
		const onSave = vi
			.fn()
			.mockRejectedValueOnce(new Error('Offline'))
			.mockResolvedValueOnce(undefined)
		renderForm(onSave)
		await user.click(screen.getByRole('switch', { name: 'Recently added series' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('Your changes are still here')
		expect(screen.getByRole('switch', { name: 'Recently added series' })).not.toBeChecked()
		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(onSave).toHaveBeenCalledTimes(2)
		expect(onSave.mock.calls[1]![0]).toEqual(onSave.mock.calls[0]![0])
	})

	it('prevents overlapping saves and editing while a save is pending', async () => {
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
		expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
		screen.getAllByRole('switch').forEach((item) => expect(item).toBeDisabled())
		resolve()
		await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled())
		expect(onSave).toHaveBeenCalledTimes(1)
	})

	it('cancels without saving and permits an all-hidden configuration', async () => {
		const user = userEvent.setup()
		const { onSave, onCancel } = renderForm()
		for (const item of screen.getAllByRole('switch')) await user.click(item)
		await user.click(screen.getByRole('button', { name: 'Cancel' }))
		expect(onCancel).toHaveBeenCalledOnce()
		expect(onSave).not.toHaveBeenCalled()
		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(onSave.mock.calls[0]![0].every((section: HomeSection) => !section.visible)).toBe(true)
	})

	it('does not overwrite configurations containing unsupported sections', () => {
		const { onSave } = renderForm(vi.fn(), [
			...initialSections,
			{ visible: true, config: { __typename: 'CustomArrangementConfig' } },
		])
		expect(screen.getByRole('alert')).toHaveTextContent('does not support')
		expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
		expect(onSave).not.toHaveBeenCalled()
	})
})
