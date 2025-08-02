import { BookPreferences, ReaderSettings, ReaderStore } from '@stump/client'
import { PickSelect } from '@stump/components'
import { BookReaderSceneQuery, ReadingImageScaleFit } from '@stump/graphql'
import { useCallback, useMemo } from 'react'

import { ImageReaderBookRef } from '@/components/readers/imageBased/context'
import { useReaderStore } from '@/stores'

type Params = {
	book: ImageReaderBookRef
}

type Return = Omit<
	ReaderStore,
	'bookPreferences' | 'setBookPreferences' | 'clearStore' | 'bookTimers' | 'setBookTimer'
> & {
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
): Partial<BookPreferences> => ({
	brightness: 1,
	// imageScaling: {
	// 	scaleToFit: libraryConfig?.defaultReadingImageScaleFit || ReadingImageScaleFit.Height,
	// },
	imageScaling: libraryConfig?.defaultReadingImageScaleFit
		? {
				scaleToFit: libraryConfig?.defaultReadingImageScaleFit as ReadingImageScaleFit,
			}
		: undefined,
	readingDirection: libraryConfig?.defaultReadingDir,
	readingMode: libraryConfig?.defaultReadingMode,
})

const settingsAsBookPreferences = (settings: ReaderSettings): BookPreferences => ({
	brightness: settings.brightness,
	imageScaling: settings.imageScaling,
	readingDirection: settings.readingDirection,
	readingMode: settings.readingMode,
	tapSidesToNavigate: settings.tapSidesToNavigate,
	fontSize: settings.fontSize,
	lineHeight: settings.lineHeight,
	trackElapsedTime: settings.trackElapsedTime,
})

const buildPreferences = (
	preferences: Partial<BookPreferences>,
	settings: ReaderSettings,
	libraryConfig?: PickSelect<NonNullable<BookReaderSceneQuery['mediaById']>, 'libraryConfig'>,
): BookPreferences => ({
	...settingsAsBookPreferences(settings),
	...defaultsFromLibraryConfig(libraryConfig),
	...preferences,
})
