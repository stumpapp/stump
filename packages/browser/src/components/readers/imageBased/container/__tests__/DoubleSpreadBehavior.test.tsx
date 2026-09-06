import { LocaleProvider } from '@stump/i18n'
import { fireEvent, render, screen, within } from '@testing-library/react'

import DoubleSpreadBehavior from '../DoubleSpreadBehavior'

describe('DoubleSpreadBehavior', () => {
	const renderSubject = (onChange = vi.fn()) =>
		render(
			<LocaleProvider locale="en-US">
				<DoubleSpreadBehavior behavior="off" onChange={onChange} />
			</LocaleProvider>,
		)

	const originalWarn = console.warn
	beforeAll(() => {
		console.warn = vi.fn()
	})
	afterAll(() => {
		console.warn = originalWarn
	})

	it('renders the localized label and options', () => {
		renderSubject()

		const select = screen.getByRole('combobox', { name: 'Double Paged' })
		expect(
			within(select)
				.getAllByRole('option')
				.map(({ textContent }) => textContent),
		).toEqual(['Auto', 'Always', 'Off'])
	})

	it('updates the double-page behavior', () => {
		const onChange = vi.fn()
		renderSubject(onChange)

		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'always' } })

		expect(onChange).toHaveBeenCalledWith('always')
	})

	it('ignores invalid double-page behavior values', () => {
		const onChange = vi.fn()
		renderSubject(onChange)

		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'invalid' } })

		expect(onChange).not.toHaveBeenCalled()
	})
})
