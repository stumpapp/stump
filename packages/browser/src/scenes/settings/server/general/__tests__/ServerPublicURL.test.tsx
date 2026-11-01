import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ServerPublicURL from '../ServerPublicURL'

const mocks = vi.hoisted(() => ({
	serverConfigPublicUrl: null as string | null,
}))

const mutate = vi.fn()
const setQueryData = vi.fn()

vi.mock('@stump/client', () => ({
	useGraphQLMutation: vi.fn(() => ({ mutate })),
	useSuspenseGraphQL: vi.fn(() => ({
		data: { serverConfig: { publicUrl: mocks.serverConfigPublicUrl } },
	})),
}))

vi.mock('@stump/components', () => ({
	Input: (props: { value?: string; onChange?: (event: { target: { value: string } }) => void }) => (
		<input
			data-testid="public-url-input"
			value={props.value}
			onChange={props.onChange}
			placeholder="https://my-stump-instance.cloud"
		/>
	),
}))

vi.mock('@tanstack/react-query', () => ({
	useQueryClient: () => ({ setQueryData }),
}))

vi.mock('@/hooks/useTranslate', () => ({
	useTranslate: () => ({
		t: (key: string) => key,
		translate: (key: string) => key,
	}),
}))

// the save is debounced to 1000ms so 1500 should be
// sufficient for forwarding
const DEBOUNCE_MS = 1500

const flush = async () => {
	await act(async () => {
		vi.advanceTimersByTime(DEBOUNCE_MS)
	})
}

describe('ServerPublicURL', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('does not persist an empty public URL on mount', async () => {
		mocks.serverConfigPublicUrl = null

		render(<ServerPublicURL />)

		await flush()

		expect(mutate).not.toHaveBeenCalled()
	})

	it('persists a trimmed, non-empty public URL after the debounce', async () => {
		mocks.serverConfigPublicUrl = null

		render(<ServerPublicURL />)

		fireEvent.change(screen.getByTestId('public-url-input'), {
			target: { value: ' https://public.example.com ' },
		})

		await flush()

		expect(mutate).toHaveBeenCalledWith({ publicUrl: 'https://public.example.com' })
	})

	it('clears a previously-set public URL when the input is empty', async () => {
		mocks.serverConfigPublicUrl = 'https://public.example.com'

		render(<ServerPublicURL />)

		await flush()
		expect(mutate).not.toHaveBeenCalled()

		fireEvent.change(screen.getByTestId('public-url-input'), {
			target: { value: '' },
		})

		await flush()

		expect(mutate).toHaveBeenCalledWith({ publicUrl: '' })
	})
})
