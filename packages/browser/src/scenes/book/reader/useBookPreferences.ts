import { BookPreferences, NewReaderStore } from '@stump/client'
import type { LibraryOptions, Media } from '@stump/types'
import { useCallback, useMemo } from 'react'

import { useNewReaderStore } from '@/stores'

type Params = {
	book: Media
}

type Return = Omit<NewReaderStore, 'bookPreferences' | 'setBookPreferences'> & {
	bookPreferences: BookPreferences
	setBookPreferences: (preferences: Partial<BookPreferences>) => void
}

export function useBookPreferences({ book }: Params): Return {
	const {
		// Note: This is a selection from the store, not a direct state value
		bookPreferences: storedBookPreferences,
		setBookPreferences: storedSetBookPreferences,
		settings,
		setSettings,
	} = useNewReaderStore((state) => ({
		bookPreferences: state.bookPreferences[book.id],
		setBookPreferences: state.setBookPreferences,
		setSettings: state.setSettings,
		settings: state.settings,
	}))

	/**
	 * The library configuration, used for picking default reader settings. This realistically
	 * should never be null once the query resolves
	 */
	const libraryConfig = useMemo(() => book?.series?.library?.library_options, [book])

	const bookPreferences = useMemo(
		() => storedBookPreferences ?? defaultPreferences(libraryConfig),
		[storedBookPreferences, libraryConfig],
	)

	const setBookPreferences = useCallback(
		(preferences: Partial<typeof bookPreferences>) => {
			storedSetBookPreferences(book.id, {
				...bookPreferences,
				...preferences,
			})
		},
		[book.id, storedSetBookPreferences, bookPreferences],
	)

	return {
		bookPreferences,
		setBookPreferences,
		setSettings,
		settings,
	}
}

const defaultPreferences = (libraryConfig?: LibraryOptions): BookPreferences => ({
	readingDirection: libraryConfig?.default_reading_dir || 'ltr',
	readingMode: libraryConfig?.default_reading_mode || 'paged',
})
