import { BookPreferences, ReaderSettings, ReaderStore } from '@stump/client'
import type { LibraryConfig, Media } from '@stump/sdk'
import { useCallback, useMemo } from 'react'

import { useReaderStore } from '@/stores'

type Params = {
	book: Media
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
	const libraryConfig = useMemo(() => book?.series?.library?.config, [book])
	const libraryDefaults = useMemo(() => defaultsFromLibraryConfig(libraryConfig), [libraryConfig])

	const bookPreferences = useMemo(
		() => buildPreferences(storedBookPreferences ?? {}, settings, libraryDefaults),
		[storedBookPreferences, libraryDefaults, settings],
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

const defaultsFromLibraryConfig = (libraryConfig?: LibraryConfig): Partial<BookPreferences> =>
	({
		brightness: 1,
		imageScaling: libraryConfig?.default_reading_image_scale_fit
			? {
					scaleToFit: libraryConfig?.default_reading_image_scale_fit,
				}
			: undefined,
		readingDirection: libraryConfig?.default_reading_dir,
		readingMode: libraryConfig?.default_reading_mode,
	}) as Partial<BookPreferences>

const settingsAsBookPreferences = (settings: ReaderSettings): BookPreferences => ({
	brightness: settings.brightness,
	imageScaling: settings.imageScaling,
	readingDirection: settings.readingDirection,
	readingMode: settings.readingMode,
	tapSidesToNavigate: settings.tapSidesToNavigate,
	fontSize: settings.fontSize,
	lineHeight: settings.lineHeight,
	trackElapsedTime: settings.trackElapsedTime,
	doublePageBehavior: settings.doublePageBehavior,
	fontFamily: settings.fontFamily,
	secondPageSeparate: settings.secondPageSeparate,
})

const buildPreferences = (
	preferences: Partial<BookPreferences>,
	settings: ReaderSettings,
	libraryDefaults: Partial<BookPreferences>,
): BookPreferences => ({
	...settingsAsBookPreferences(settings),
	...libraryDefaults,
	...preferences,
})
