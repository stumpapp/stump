import { LocaleProvider } from '@stump/i18n'
import { fireEvent, render, screen } from '@testing-library/react'

import GoToPage, { clampPage, GoToPageProps } from '../GoToPage'

describe('clampPage', () => {
	it('returns the value when already in range', () => {
		expect(clampPage(5, 10)).toBe(5)
	})

	it('clamps values below 1 up to 1', () => {
		expect(clampPage(0, 10)).toBe(1)
		expect(clampPage(-3, 10)).toBe(1)
	})

	it('clamps values above the total down to the total', () => {
		expect(clampPage(99999, 10)).toBe(10)
	})

	it('never returns less than 1 even for an empty book', () => {
		expect(clampPage(1, 0)).toBe(1)
	})
})

describe('GoToPage', () => {
	const renderSubject = ({
		currentPage = 1,
		totalPages = 42,
		onSubmit = vi.fn(),
		...props
	}: Partial<GoToPageProps> = {}) =>
		render(
			<LocaleProvider locale="en-US">
				<GoToPage
					currentPage={currentPage}
					totalPages={totalPages}
					onSubmit={onSubmit}
					{...props}
				/>
			</LocaleProvider>,
		)

	const openPopover = () => {
		fireEvent.click(screen.getByRole('button', { name: 'Go to page' }))
	}
	const getInput = () => screen.getByRole('spinbutton')
	const clickSubmit = () => fireEvent.click(screen.getByRole('button', { name: 'Go' }))

	it('should render the trigger with the current position', () => {
		renderSubject({ currentPage: 3 })
		expect(screen.getByText('3 of 42')).toBeInTheDocument()
	})

	it('associates the label with the input', () => {
		renderSubject()
		openPopover()

		/**
		 * The label lives outside the Input and is tied to it via htmlFor/id, so the
		 * input should still be reachable by its accessible label. Scope to the input
		 * since the trigger button also carries a "Go to page" aria-label.
		 */
		expect(screen.getByLabelText('Go to page', { selector: 'input' })).toBe(getInput())
	})

	it('submits the entered page when valid', () => {
		const onSubmit = vi.fn()
		renderSubject({ onSubmit })
		openPopover()

		fireEvent.change(getInput(), { target: { value: '7' } })
		clickSubmit()

		expect(onSubmit).toHaveBeenCalledWith(7)
	})

	it('clamps a too-large page down to the last page', () => {
		const onSubmit = vi.fn()
		renderSubject({ onSubmit })
		openPopover()

		fireEvent.change(getInput(), { target: { value: '99999' } })
		clickSubmit()

		expect(onSubmit).toHaveBeenCalledWith(42)
	})

	it('clamps a too-small page up to 1', () => {
		const onSubmit = vi.fn()
		renderSubject({ currentPage: 5, onSubmit })
		openPopover()

		fireEvent.change(getInput(), { target: { value: '0' } })
		clickSubmit()

		expect(onSubmit).toHaveBeenCalledWith(1)
	})

	it('ignores non-numeric input', () => {
		const onSubmit = vi.fn()
		renderSubject({ currentPage: 5, onSubmit })
		openPopover()

		fireEvent.change(getInput(), { target: { value: '' } })
		clickSubmit()

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('submits on Enter keypress', () => {
		const onSubmit = vi.fn()
		renderSubject({ onSubmit })
		openPopover()

		const input = getInput()
		fireEvent.change(input, { target: { value: '12' } })
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onSubmit).toHaveBeenCalledWith(12)
	})

	it('honors custom copy overrides', () => {
		renderSubject({ label: 'Jump to page', submitLabel: 'Jump', triggerLabel: 'Page 3' })

		fireEvent.click(screen.getByRole('button', { name: 'Jump to page' }))
		expect(screen.getByText('Page 3')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Jump' })).toBeInTheDocument()
	})
})
