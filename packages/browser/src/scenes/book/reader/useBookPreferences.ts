import { BookPreferences, ReaderSettings, ReaderStore } from '@stump/client'
import type { LibraryConfig, Media } from '@stump/sdk'
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
		bookPreferences: allPreferences,
		setBookPreferences: storedSetBookPreferences,
		settings,
		setSettings,
	} = useReaderStore((state) => ({
		bookPreferences: state.bookPreferences,
		setBookPreferences: state.setBookPreferences,
		setSettings: state.setSettings,
		settings: state.settings,
	}))

	const storedBookPreferences = useMemo(() => allPreferences[book.id], [allPreferences, book.id])

	/**
	 * The library configuration, used for picking default reader settings. This realistically
	 * should never be null once the query resolves
	 */
	const libraryConfig = useMemo(() => book?.series?.library?.config, [book])

	const bookPreferences = useMemo(
		() => buildPreferences(storedBookPreferences ?? {}, settings, libraryConfig),
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

const defaultsFromLibraryConfig = (libraryConfig?: LibraryConfig): BookPreferences =>
	({
		brightness: 1,
		imageScaling: {
			scaleToFit: libraryConfig?.default_reading_image_scale_fit || 'height',
		},
		readingDirection: libraryConfig?.default_reading_dir || 'ltr',
		readingMode: libraryConfig?.default_reading_mode || 'paged',
	}) as BookPreferences

const buildPreferences = (
	preferences: Partial<BookPreferences>,
	settings: ReaderSettings,
	libraryConfig?: LibraryConfig,
): BookPreferences => ({
	...settings,
	...defaultsFromLibraryConfig(libraryConfig),
	...preferences,
})
