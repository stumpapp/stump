import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

type Options = {
	onCleanup?: () => void
}

const IGNORED_PARAMS = ['searchParams', 'page']

// FIXME: this is NOT performant and causing extra re-renders!!
/** Syncs the given params with the URL search params. */
export function useSyncParams<Params extends object>(params: Params, options?: Options) {
	const [searchParams, setSearchParams] = useSearchParams()

	useEffect(() => {
		setSearchParams((existingParams) => {
			const newParams = new URLSearchParams(existingParams)

			Object.entries(params).forEach(([key, value]) => {
				if (!value) {
					newParams.delete(key)
				} else if (!IGNORED_PARAMS.includes(key)) {
					newParams.set(key, value)
				}
			})

			return newParams
		})

		return () => {
			options?.onCleanup?.()
		}
	}, [params, setSearchParams, options])

	return searchParams
}
