import { ReadingDirection } from '@stump/graphql'
import { LocaleProvider } from '@stump/i18n'
import { fireEvent, render, screen } from '@testing-library/react'

import ReadingDirectionSelect from '../ReadingDirectionSelect'

describe('ReadingDirectionSelect', () => {
	const renderSubject = (onChange = vi.fn()) =>
		render(
			<LocaleProvider locale="en-US">
				<ReadingDirectionSelect direction={ReadingDirection.Ltr} onChange={onChange} />
			</LocaleProvider>,
		)

	const originalWarn = console.warn
	beforeAll(() => {
		console.warn = vi.fn()
	})
	afterAll(() => {
		console.warn = originalWarn
	})

	it('should render', () => {
		expect(renderSubject().container).not.toBeEmptyDOMElement()
	})

	it('should properly update the reading direction', () => {
		const onChange = vi.fn()
		renderSubject(onChange)
		const select = screen.getByRole('combobox')

		fireEvent.change(select, { target: { value: 'RTL' } })
		expect(onChange).toHaveBeenCalledWith(ReadingDirection.Rtl)

		fireEvent.change(select, { target: { value: 'LTR' } })
		expect(onChange).toHaveBeenCalledWith(ReadingDirection.Ltr)
	})

	it('should not allow invalid reading directions', () => {
		const onChange = vi.fn()
		renderSubject(onChange)

		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'invalid' } })
		expect(onChange).not.toHaveBeenCalled()
	})
})
