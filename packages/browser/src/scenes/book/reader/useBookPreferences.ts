import { BookPreferences, ReaderSettings, ReaderStore } from '@stump/client'
import { PickSelect } from '@stump/components'
import {
	BookReaderSceneQuery,
	ReadingDirection,
	ReadingImageScaleFit,
	ReadingMode,
} from '@stump/graphql'
import { useCallback, useMemo } from 'react'

import { ImageReaderBookRef } from '@/components/readers/imageBased/context'
import { useReaderStore } from '@/stores'

type Params = {
	book: ImageReaderBookRef
}

type Return = Omit<ReaderStore, 'bookPreferences' | 'setBookPreferences' | 'clearStore'> & {
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
	const libraryConfig = useMemo(() => book.libraryConfig, [book])

	const bookPreferences = useMemo(
		() => buildPreferences(storedBookPreferences ?? {}, settings, libraryConfig),
		[storedBookPreferences, libraryConfig, settings],
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

const defaultsFromLibraryConfig = (
	libraryConfig?: PickSelect<NonNullable<BookReaderSceneQuery['mediaById']>, 'libraryConfig'>,
): BookPreferences =>
	({
		brightness: 1,
		imageScaling: {
			scaleToFit: libraryConfig?.defaultReadingImageScaleFit || ReadingImageScaleFit.Height,
		},
		readingDirection: libraryConfig?.defaultReadingDir || ReadingDirection.Ltr,
		readingMode: libraryConfig?.defaultReadingMode || ReadingMode.Paged,
	}) as BookPreferences

const buildPreferences = (
	preferences: Partial<BookPreferences>,
	settings: ReaderSettings,
	libraryConfig?: PickSelect<NonNullable<BookReaderSceneQuery['mediaById']>, 'libraryConfig'>,
): BookPreferences => ({
	...settings,
	...defaultsFromLibraryConfig(libraryConfig),
	...preferences,
})
