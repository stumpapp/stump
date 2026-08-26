import { ReadingDirection } from '@stump/graphql'
import { fireEvent, render } from '@testing-library/react'

import ReadingDirectionSelect from '../ReadingDirectionSelect'

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

	it('should properly update the reading direction', () => {
		const onChange = vi.fn()
		const { getByLabelText } = render(
			<ReadingDirectionSelect direction={ReadingDirection.Ltr} onChange={onChange} />,
		)

		fireEvent.change(getByLabelText('Reading direction'), { target: { value: 'RTL' } })
		expect(onChange).toHaveBeenCalledWith(ReadingDirection.Rtl)

		fireEvent.change(getByLabelText('Reading direction'), { target: { value: 'LTR' } })
		expect(onChange).toHaveBeenCalledWith(ReadingDirection.Ltr)
	})

	it('should not allow invalid reading directions', () => {
		const onChange = vi.fn()
		const { getByLabelText } = render(
			<ReadingDirectionSelect direction={ReadingDirection.Ltr} onChange={onChange} />,
		)

		fireEvent.change(getByLabelText('Reading direction'), { target: { value: 'invalid' } })
		expect(onChange).not.toHaveBeenCalled()
	})
})
