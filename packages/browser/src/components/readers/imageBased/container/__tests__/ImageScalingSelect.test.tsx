import { fireEvent, render, screen } from '@testing-library/react'

import ImageScalingSelect from '../ImageScalingSelect'

jest.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: jest.fn(),
}))

describe('ImageScalingSelect', () => {
	const originalWarn = console.warn
	beforeAll(() => {
		console.warn = jest.fn()
	})
	afterAll(() => {
		console.warn = originalWarn
	})

	it('should render', () => {
		expect(
			render(<ImageScalingSelect value="height" onChange={jest.fn()} />).container,
		).not.toBeEmptyDOMElement()
	})

	it('should change the image scaling properly', () => {
		const onChange = jest.fn()
		render(<ImageScalingSelect value="height" onChange={onChange} />)

		const validOptions = ['height', 'width', 'auto', 'none']
		for (const option of validOptions) {
			fireEvent.change(screen.getByLabelText('Image scaling'), { target: { value: option } })
			expect(onChange).toHaveBeenCalledWith(option)
		}
	})

	it('should not allow invalid image scaling options', () => {
		const onChange = jest.fn()
		render(<ImageScalingSelect value="height" onChange={onChange} />)
		fireEvent.change(screen.getByLabelText('Image scaling'), { target: { value: 'invalid' } })
		expect(onChange).not.toHaveBeenCalled()
	})
})
