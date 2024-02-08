import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * A hook to get and set the current page from the URL. This is useful for pagination.
 */
export function usePageParam() {
	const [search, setSearchParams] = useSearchParams()

	const page = useMemo(() => {
		const searchPage = search.get('page')
		if (searchPage) {
			return parseInt(searchPage, 10)
		}
		return 1
	}, [search])

	const setPage = (page: number) => {
		setSearchParams((prev) => {
			prev.set('page', page.toString())
			return prev
		})
	}

	return { page, setPage }
}
