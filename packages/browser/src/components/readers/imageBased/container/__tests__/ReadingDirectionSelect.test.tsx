import { fireEvent, render } from '@testing-library/react'

import ReadingDirectionSelect from '../ReadingDirectionSelect'

describe('ReadingDirectionSelect', () => {
	const originalWarn = console.warn
	beforeAll(() => {
		console.warn = jest.fn()
	})
	afterAll(() => {
		console.warn = originalWarn
	})

	it('should render', () => {
		expect(
			render(<ReadingDirectionSelect direction="ltr" onChange={jest.fn()} />).container,
		).not.toBeEmptyDOMElement()
	})

	it('should properly update the reading direction', () => {
		const onChange = jest.fn()
		const { getByLabelText } = render(
			<ReadingDirectionSelect direction="ltr" onChange={onChange} />,
		)

		fireEvent.change(getByLabelText('Reading direction'), { target: { value: 'rtl' } })
		expect(onChange).toHaveBeenCalledWith('rtl')

		fireEvent.change(getByLabelText('Reading direction'), { target: { value: 'ltr' } })
		expect(onChange).toHaveBeenCalledWith('ltr')
	})

	it('should not allow invalid reading directions', () => {
		const onChange = jest.fn()
		const { getByLabelText } = render(
			<ReadingDirectionSelect direction="ltr" onChange={onChange} />,
		)

		fireEvent.change(getByLabelText('Reading direction'), { target: { value: 'invalid' } })
		expect(onChange).not.toHaveBeenCalled()
	})
})
