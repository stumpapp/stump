import { fireEvent, render, screen } from '@testing-library/react'

import GoToPage, { clampPage } from '../GoToPage'

describe('clampPage', () => {
	it('returns the value when already in range', () => {
		expect(clampPage(5, 10)).toBe(5)
	})

	it('clamps values below 1 up to 1', () => {
		expect(clampPage(0, 10)).toBe(1)
		expect(clampPage(-3, 10)).toBe(1)
	})

	it('clamps values above the total down to the total', () => {
		expect(clampPage(99999, 10)).toBe(10)
	})

	it('never returns less than 1 even for an empty book', () => {
		expect(clampPage(1, 0)).toBe(1)
	})
})

describe('GoToPage', () => {
	// The component emits console.debug for manual verification during development;
	// silence it so the test output stays clean.
	const originalDebug = console.debug
	beforeAll(() => {
		console.debug = jest.fn()
	})
	afterAll(() => {
		console.debug = originalDebug
	})

	const openPopover = () => {
		fireEvent.click(screen.getByRole('button', { name: 'Go to page' }))
	}
	const getInput = () => screen.getByRole('spinbutton')
	const clickSubmit = () => fireEvent.click(screen.getByRole('button', { name: 'Go' }))

	it('should render the trigger with the current position', () => {
		render(<GoToPage currentPage={3} totalPages={42} onSubmit={jest.fn()} />)
		expect(screen.getByText('3 of 42')).toBeInTheDocument()
	})

	it('submits the entered page when valid', () => {
		const onSubmit = jest.fn()
		render(<GoToPage currentPage={1} totalPages={42} onSubmit={onSubmit} />)
		openPopover()

		fireEvent.change(getInput(), { target: { value: '7' } })
		clickSubmit()

		expect(onSubmit).toHaveBeenCalledWith(7)
	})

	it('clamps a too-large page down to the last page', () => {
		const onSubmit = jest.fn()
		render(<GoToPage currentPage={1} totalPages={42} onSubmit={onSubmit} />)
		openPopover()

		fireEvent.change(getInput(), { target: { value: '99999' } })
		clickSubmit()

		expect(onSubmit).toHaveBeenCalledWith(42)
	})

	it('clamps a too-small page up to 1', () => {
		const onSubmit = jest.fn()
		render(<GoToPage currentPage={5} totalPages={42} onSubmit={onSubmit} />)
		openPopover()

		fireEvent.change(getInput(), { target: { value: '0' } })
		clickSubmit()

		expect(onSubmit).toHaveBeenCalledWith(1)
	})

	it('ignores non-numeric input', () => {
		const onSubmit = jest.fn()
		render(<GoToPage currentPage={5} totalPages={42} onSubmit={onSubmit} />)
		openPopover()

		fireEvent.change(getInput(), { target: { value: '' } })
		clickSubmit()

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('submits on Enter keypress', () => {
		const onSubmit = jest.fn()
		render(<GoToPage currentPage={1} totalPages={42} onSubmit={onSubmit} />)
		openPopover()

		const input = getInput()
		fireEvent.change(input, { target: { value: '12' } })
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onSubmit).toHaveBeenCalledWith(12)
	})
})
