import { ReadingMode } from '@stump/graphql'
import { fireEvent, render, screen } from '@testing-library/react'

import ReadingModeSelect from '../ReadingModeSelect'

vi.mock('@stump/i18n', () => ({
	useLocaleContext: () => ({
		locale: 'en-US',
		t: (key: string) => `translated:${key}`,
	}),
}))

describe('ReadingModeSelect', () => {
	const originalWarn = console.warn
	beforeAll(() => {
		console.warn = vi.fn()
	})
	afterAll(() => {
		console.warn = originalWarn
	})

	it('should render', () => {
		const { container } = render(<ReadingModeSelect value={ReadingMode.Paged} onChange={vi.fn()} />)
		expect(container).not.toBeEmptyDOMElement()
	})

	it('should render translated reading mode label and options', () => {
		render(<ReadingModeSelect value={ReadingMode.Paged} onChange={vi.fn()} />)

		expect(
			screen.getByLabelText('translated:imageReader.settings.readingMode.label'),
		).toBeInTheDocument()
		expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
			'translated:imageReader.settings.readingMode.options.verticalScroll',
			'translated:imageReader.settings.readingMode.options.horizontalScroll',
			'translated:imageReader.settings.readingMode.options.paged',
		])
	})

	it('should not allow invalid reading modes', () => {
		const onChange = vi.fn()
		const { getByLabelText } = render(
			<ReadingModeSelect value={ReadingMode.Paged} onChange={onChange} />,
		)

		fireEvent.change(getByLabelText('translated:imageReader.settings.readingMode.label'), {
			target: { value: 'invalid' },
		})
		expect(onChange).not.toHaveBeenCalled()
	})
})
