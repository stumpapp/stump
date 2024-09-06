import { NewReaderStore } from '@stump/client'
import { PickSelect } from '@stump/components'
import type { LibraryOptions, Media } from '@stump/types'
import { useMemo } from 'react'

import { useNewReaderStore } from '@/stores'

type Params = {
	book: Media
}

type Return = Omit<NewReaderStore, 'bookPreferences'> & {
	bookPreferences: PickSelect<NewReaderStore, 'bookPreferences'>[string]
}

export function useBookPreferences({ book }: Params): Return {
	const {
		// Note: This is a selection from the store, not a direct state value
		bookPreferences: storedBookPreferences,
		setBookPreferences,
		layout,
		setLayout,
	} = useNewReaderStore((state) => ({
		bookPreferences: state.bookPreferences[book.id],
		layout: state.layout,
		setBookPreferences: state.setBookPreferences,
		setLayout: state.setLayout,
	}))

	/**
	 * The library configuration, used for picking default reader settings. This realistically
	 * should never be null once the query resolves
	 */
	const libraryConfig = useMemo(
		() => book?.series?.library?.library_options || defaultLibraryConfig,
		[book],
	)

	const bookPreferences = useMemo(
		() => storedBookPreferences ?? defaultPreferences(libraryConfig),
		[storedBookPreferences, libraryConfig],
	)

	return {
		bookPreferences,
		layout,
		setBookPreferences,
		setLayout,
	}
}

export const defaultLibraryConfig = {
	default_reading_dir: 'ltr',
} as LibraryOptions

const defaultPreferences = (
	libraryConfig: LibraryOptions,
): PickSelect<Return, 'bookPreferences'> => ({
	readingDirection: libraryConfig.default_reading_dir,
})
