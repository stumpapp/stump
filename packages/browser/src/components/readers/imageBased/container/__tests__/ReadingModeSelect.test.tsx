import { ReadingMode } from '@stump/graphql'
import { fireEvent, render } from '@testing-library/react'

import ReadingModeSelect from '../ReadingModeSelect'

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

	it('should not allow invalid reading modes', () => {
		const onChange = vi.fn()
		const { getByLabelText } = render(
			<ReadingModeSelect value={ReadingMode.Paged} onChange={onChange} />,
		)

		fireEvent.change(getByLabelText('Flow'), { target: { value: 'invalid' } })
		expect(onChange).not.toHaveBeenCalled()
	})
})
