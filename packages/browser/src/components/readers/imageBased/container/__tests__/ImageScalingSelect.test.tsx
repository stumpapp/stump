import { ReadingImageScaleFit } from '@stump/graphql'
import { fireEvent, render, screen } from '@testing-library/react'

import ImageScalingSelect from '../ImageScalingSelect'

vi.mock('@stump/i18n', () => ({
	useLocaleContext: () => ({
		locale: 'en-US',
		t: (key: string) => `translated:${key}`,
	}),
}))

vi.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: vi.fn(),
}))

describe('ImageScalingSelect', () => {
	const originalWarn = console.warn
	beforeAll(() => {
		console.warn = vi.fn()
	})
	afterAll(() => {
		console.warn = originalWarn
	})

	it('should render', () => {
		expect(
			render(<ImageScalingSelect value={ReadingImageScaleFit.Height} onChange={vi.fn()} />)
				.container,
		).not.toBeEmptyDOMElement()
	})

	it('should render translated image scaling label and options', () => {
		render(<ImageScalingSelect value={ReadingImageScaleFit.Height} onChange={vi.fn()} />)

		expect(
			screen.getByLabelText('translated:imageReader.settings.imageScaling.label'),
		).toBeInTheDocument()
		expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
			'translated:imageReader.settings.imageScaling.options.auto',
			'translated:imageReader.settings.imageScaling.options.height',
			'translated:imageReader.settings.imageScaling.options.width',
			'translated:imageReader.settings.imageScaling.options.original',
		])
	})

	it('should change the image scaling properly', () => {
		const onChange = vi.fn()
		render(<ImageScalingSelect value={ReadingImageScaleFit.Height} onChange={onChange} />)

		const validOptions = [
			ReadingImageScaleFit.Height,
			ReadingImageScaleFit.Width,
			ReadingImageScaleFit.Auto,
			ReadingImageScaleFit.None,
		]
		for (const option of validOptions) {
			fireEvent.change(
				screen.getByLabelText('translated:imageReader.settings.imageScaling.label'),
				{
					target: { value: option },
				},
			)
			expect(onChange).toHaveBeenCalledWith(option)
		}
	})

	it('should not allow invalid image scaling options', () => {
		const onChange = vi.fn()
		render(<ImageScalingSelect value={ReadingImageScaleFit.Height} onChange={onChange} />)
		fireEvent.change(screen.getByLabelText('translated:imageReader.settings.imageScaling.label'), {
			target: { value: 'invalid' },
		})
		expect(onChange).not.toHaveBeenCalled()
	})
})
