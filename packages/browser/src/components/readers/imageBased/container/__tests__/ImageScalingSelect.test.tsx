import { ReadingImageScaleFit } from '@stump/graphql'
import { fireEvent, render, screen } from '@testing-library/react'

import ImageScalingSelect from '../ImageScalingSelect'

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
			fireEvent.change(screen.getByLabelText('Image scaling'), { target: { value: option } })
			expect(onChange).toHaveBeenCalledWith(option)
		}
	})

	it('should not allow invalid image scaling options', () => {
		const onChange = vi.fn()
		render(<ImageScalingSelect value={ReadingImageScaleFit.Height} onChange={onChange} />)
		fireEvent.change(screen.getByLabelText('Image scaling'), { target: { value: 'invalid' } })
		expect(onChange).not.toHaveBeenCalled()
	})
})
