import '@/__mocks__/resizeObserver'

import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import TagSelect, { TagOption } from '../TagSelect'

jest.mock('@stump/client', () => ({
	useSDK: jest.fn(),
	useSuspenseGraphQL: jest.fn(),
}))

const mockCacheKey = jest.fn().mockReturnValue(['tags'])
const mockSdk = { cacheKey: mockCacheKey } as any

const createTags = (names: string[]) => names.map((name, i) => ({ id: i + 1, name }))

describe('TagSelect', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.mocked(useSDK).mockReturnValue({ sdk: mockSdk } as any)
	})

	it('should sort options alphabetically', async () => {
		jest.mocked(useSuspenseGraphQL).mockReturnValue({
			data: { tags: createTags(['Kiwi', 'Apple', 'Mango']) },
		} as any)

		const onChange = jest.fn()
		render(<TagSelect onChange={onChange} />)

		// Open the combobox
		await userEvent.click(screen.getByRole('combobox'))

		const options = screen.getAllByRole('option')
		const labels = options.map((opt) => opt.textContent)
		expect(labels).toEqual(['Apple', 'Kiwi', 'Mango'])
	})

	it('should sort selected tags alphabetically in display', () => {
		jest.mocked(useSuspenseGraphQL).mockReturnValue({
			data: { tags: createTags(['Kiwi', 'Apple', 'Mango']) },
		} as any)

		const selected: TagOption[] = [
			{ label: 'Kiwi', value: 'kiwi' },
			{ label: 'Apple', value: 'apple' },
		]
		const onChange = jest.fn()
		render(<TagSelect selected={selected} onChange={onChange} />)

		const trigger = screen.getByRole('combobox')
		expect(trigger.textContent).toBe('Apple, Kiwi')
	})

	it('should sort newly created tags into the correct position', async () => {
		jest.mocked(useSuspenseGraphQL).mockReturnValue({
			data: { tags: createTags(['Cherry', 'Apple']) },
		} as any)

		const onChange = jest.fn()
		const selected: TagOption[] = [
			{ label: 'Apple', value: 'apple' },
			{ label: 'Cherry', value: 'cherry' },
		]
		render(<TagSelect selected={selected} onChange={onChange} />)

		// Open the combobox
		const trigger = screen.getByRole('combobox')
		await userEvent.click(trigger)

		// Type a new tag name that doesn't exist
		const input = screen.getByPlaceholderText('Filter...')
		await userEvent.type(input, 'Banana')

		// Click the "Add" button
		const addButton = screen.getByRole('button', { name: /Add "Banana"/ })
		await userEvent.click(addButton)

		// onChange should have been called with the new tag included
		expect(onChange).toHaveBeenCalledWith(
			expect.arrayContaining([{ label: 'Banana', value: 'Banana' }]),
		)

		// The new tag should be sorted into the correct position in the options
		const options = screen.getAllByRole('option')
		const labels = options.map((opt) => opt.textContent)
		expect(labels).toEqual(['Apple', 'Banana', 'Cherry'])
	})
})
