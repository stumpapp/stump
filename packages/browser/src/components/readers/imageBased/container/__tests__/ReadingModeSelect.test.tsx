import { ReadingMode } from '@stump/graphql'
import { LocaleProvider } from '@stump/i18n'
import { fireEvent, render, screen } from '@testing-library/react'

import ReadingModeSelect from '../ReadingModeSelect'

describe('ReadingModeSelect', () => {
	const renderSubject = (onChange = vi.fn()) =>
		render(
			<LocaleProvider locale="en-US">
				<ReadingModeSelect value={ReadingMode.Paged} onChange={onChange} />
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

	it('should update the reading mode', () => {
		const onChange = vi.fn()
		renderSubject(onChange)

		fireEvent.change(screen.getByRole('combobox'), {
			target: { value: ReadingMode.ContinuousVertical },
		})
		expect(onChange).toHaveBeenCalledWith(ReadingMode.ContinuousVertical)
	})

	it('should not allow invalid reading modes', () => {
		const onChange = vi.fn()
		renderSubject(onChange)

		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'invalid' } })
		expect(onChange).not.toHaveBeenCalled()
	})
})
