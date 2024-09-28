import { BookPreferences, ReaderStore } from '@stump/client'
import type { LibraryConfig, Media } from '@stump/types'
import { useCallback, useMemo } from 'react'

import { useReaderStore } from '@/stores'

type Params = {
	book: Media
}

type Return = Omit<ReaderStore, 'bookPreferences' | 'setBookPreferences'> & {
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
	} = useReaderStore((state) => ({
		bookPreferences: state.bookPreferences[book.id],
		setBookPreferences: state.setBookPreferences,
		setSettings: state.setSettings,
		settings: state.settings,
	}))

	/**
	 * The library configuration, used for picking default reader settings. This realistically
	 * should never be null once the query resolves
	 */
	const libraryConfig = useMemo(() => book?.series?.library?.config, [book])

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

const defaultPreferences = (libraryConfig?: LibraryConfig): BookPreferences =>
	({
		brightness: 1,
		imageScaling: {
			scaleToFit: libraryConfig?.default_reading_image_scale_fit || 'height',
		},
		readingDirection: libraryConfig?.default_reading_dir || 'ltr',
		readingMode: libraryConfig?.default_reading_mode || 'paged',
	}) as BookPreferences
