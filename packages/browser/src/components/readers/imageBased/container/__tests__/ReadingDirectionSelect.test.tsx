import { ReadingDirection } from '@stump/graphql'
import { fireEvent, render, screen } from '@testing-library/react'

import ReadingDirectionSelect from '../ReadingDirectionSelect'

vi.mock('@stump/i18n', () => ({
	useLocaleContext: () => ({
		locale: 'en-US',
		t: (key: string) => `translated:${key}`,
	}),
}))

describe('ReadingDirectionSelect', () => {
	const originalWarn = console.warn
	beforeAll(() => {
		console.warn = vi.fn()
	})
	afterAll(() => {
		console.warn = originalWarn
	})

	it('should render', () => {
		expect(
			render(<ReadingDirectionSelect direction={ReadingDirection.Ltr} onChange={vi.fn()} />)
				.container,
		).not.toBeEmptyDOMElement()
	})

	it('should render translated reading direction label and options', () => {
		render(<ReadingDirectionSelect direction={ReadingDirection.Ltr} onChange={vi.fn()} />)

		expect(
			screen.getByLabelText('translated:imageReader.settings.readingDirection.label'),
		).toBeInTheDocument()
		expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
			'translated:imageReader.settings.readingDirection.options.leftToRight',
			'translated:imageReader.settings.readingDirection.options.rightToLeft',
		])
	})

	it('should properly update the reading direction', () => {
		const onChange = vi.fn()
		const { getByLabelText } = render(
			<ReadingDirectionSelect direction={ReadingDirection.Ltr} onChange={onChange} />,
		)

		fireEvent.change(getByLabelText('translated:imageReader.settings.readingDirection.label'), {
			target: { value: 'RTL' },
		})
		expect(onChange).toHaveBeenCalledWith(ReadingDirection.Rtl)

		fireEvent.change(getByLabelText('translated:imageReader.settings.readingDirection.label'), {
			target: { value: 'LTR' },
		})
		expect(onChange).toHaveBeenCalledWith(ReadingDirection.Ltr)
	})

	it('should not allow invalid reading directions', () => {
		const onChange = vi.fn()
		const { getByLabelText } = render(
			<ReadingDirectionSelect direction={ReadingDirection.Ltr} onChange={onChange} />,
		)

		fireEvent.change(getByLabelText('translated:imageReader.settings.readingDirection.label'), {
			target: { value: 'invalid' },
		})
		expect(onChange).not.toHaveBeenCalled()
	})
})
