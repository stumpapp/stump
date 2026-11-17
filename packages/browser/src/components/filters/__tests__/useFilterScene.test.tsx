import { act, renderHook } from '@testing-library/react'
import { PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router'

import { useFilterScene } from '../useFilterScene'

// the dynamic default is 40 on wide windows and 20 otherwise, so pin it to the smaller one
vi.mock('rooks', async (importOriginal) => ({
	...(await importOriginal<typeof import('rooks')>()),
	useMediaMatch: () => false,
}))

function wrapper(url = '/') {
	return function Wrapper({ children }: PropsWithChildren) {
		return <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
	}
}

describe('useFilterScene page size', () => {
	it('should use the dynamic default without a saved or URL page size', () => {
		const { result } = renderHook(() => useFilterScene(), { wrapper: wrapper() })
		expect(result.current.pagination.pageSize).toBe(20)
	})

	it('should use the saved page size over the dynamic default', () => {
		const { result } = renderHook(() => useFilterScene({ persistedPageSize: 60 }), {
			wrapper: wrapper(),
		})
		expect(result.current.pagination.pageSize).toBe(60)
	})

	it('should prefer the page size in the URL over the saved one', () => {
		const { result } = renderHook(() => useFilterScene({ persistedPageSize: 60 }), {
			wrapper: wrapper('/?pageSize=10'),
		})
		expect(result.current.pagination.pageSize).toBe(10)
	})

	it('should save and apply a page size the user picks', () => {
		const setPersistedPageSize = vi.fn()
		const { result } = renderHook(() => useFilterScene({ setPersistedPageSize }), {
			wrapper: wrapper(),
		})

		act(() => result.current.setPageSize(50))

		expect(setPersistedPageSize).toHaveBeenCalledWith(50)
		expect(result.current.pagination.pageSize).toBe(50)
	})
})
