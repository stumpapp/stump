import { ReadingImageScaleFit } from '@stump/graphql'
import { fireEvent, render, screen } from '@testing-library/react'

import ImageScalingSelect from '../ImageScalingSelect'

vi.mock('@/hooks/useTranslate', () => ({
	useTranslate: () => ({ t: (s: string) => s, translate: (s: string) => s }),
}))

vi.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: vi.fn(),
}))

describe('ImageScalingSelect', () => {
	const renderSubject = (onChange = vi.fn()) =>
		render(<ImageScalingSelect value={ReadingImageScaleFit.Height} onChange={onChange} />)

	it('should render', () => {
		expect(renderSubject().container).not.toBeEmptyDOMElement()
	})

	it('should change the image scaling properly', () => {
		const onChange = vi.fn()
		renderSubject(onChange)
		const select = screen.getByRole('combobox')

		const validOptions = [
			ReadingImageScaleFit.Height,
			ReadingImageScaleFit.Width,
			ReadingImageScaleFit.Auto,
			ReadingImageScaleFit.None,
		]
		for (const option of validOptions) {
			fireEvent.change(select, { target: { value: option } })
			expect(onChange).toHaveBeenCalledWith(option)
		}
	})

	it('should not allow invalid image scaling options', () => {
		const onChange = vi.fn()
		renderSubject(onChange)
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'invalid' } })
		expect(onChange).not.toHaveBeenCalled()
	})
})
