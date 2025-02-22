import {
	ARCHIVE_EXTENSION,
	EBOOK_EXTENSION,
	PDF_EXTENSION,
	queryClient,
	useMediaByIdQuery,
	useSDK,
	useUpdateMediaProgress,
} from '@stump/client'
import { useKeepAwake } from 'expo-keep-awake'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect } from 'react'

import { EpubJSReader, ImageBasedReader, UnsupportedReader } from '~/components/book/reader'
import { useReaderStore } from '~/stores'
import { useBookPreferences, useBookTimer } from '~/stores/reader'

type Params = {
	id: string
	// restart?: boolean
}

export default function Screen() {
	useKeepAwake()
	const { id: bookID } = useLocalSearchParams<Params>()
	const { sdk } = useSDK()
	const { media: book } = useMediaByIdQuery(bookID, {
		suspense: true,
		params: {
			load_pages: true,
		},
	})
	const { pause, resume, totalSeconds, isRunning } = useBookTimer(book?.id || '', {
		initial: book?.active_reading_session?.elapsed_seconds,
	})
	const {
		preferences: { preferSmallImages },
	} = useBookPreferences(book?.id || '')

	const { updateReadProgressAsync } = useUpdateMediaProgress(book?.id || '', {
		retry: (attempts) => attempts < 3,
		useErrorBoundary: false,
	})
	const onPageChanged = useCallback(
		(page: number) => {
			updateReadProgressAsync({
				page,
				elapsed_seconds: totalSeconds,
			})
		},
		[totalSeconds, updateReadProgressAsync],
	)

	const setIsReading = useReaderStore((state) => state.setIsReading)
	useEffect(() => {
		setIsReading(true)
		return () => {
			setIsReading(false)
		}
	}, [setIsReading])

	const setShowControls = useReaderStore((state) => state.setShowControls)
	useEffect(() => {
		return () => {
			setShowControls(false)
		}
	}, [setShowControls])

	const showControls = useReaderStore((state) => state.showControls)
	useEffect(() => {
		if (showControls && isRunning) {
			pause()
		} else if (!showControls && !isRunning) {
			resume()
		}
	}, [showControls, pause, resume, isRunning])

	/**
	 * Invalidate the book query when a reader is unmounted so that the book overview
	 * is updated with the latest read progress
	 */
	useEffect(
		() => {
			return () => {
				queryClient.refetchQueries({ queryKey: [sdk.media.keys.getByID, bookID], exact: false })
				queryClient.refetchQueries({ queryKey: [sdk.media.keys.inProgress], exact: false })
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	if (!book) return null

	if (book.extension.match(EBOOK_EXTENSION)) {
		const currentProgressCfi = book.current_epubcfi || undefined
		// const initialCfi = restart ? undefined : currentProgressCfi
		return <EpubJSReader book={book} initialCfi={currentProgressCfi} /*incognito={incognito}*/ />
	} else if (book.extension.match(ARCHIVE_EXTENSION) || book.extension.match(PDF_EXTENSION)) {
		const currentProgressPage = book.current_page || 1
		// const initialPage = restart ? 1 : currentProgressPage
		const initialPage = currentProgressPage
		return (
			<ImageBasedReader
				initialPage={initialPage}
				book={{ id: book.id, name: book.metadata?.title || book.name, pages: book.pages }}
				pageURL={(page: number) => sdk.media.bookPageURL(book.id, page)}
				pageThumbnailURL={
					preferSmallImages
						? (page: number) =>
								sdk.media.bookPageURL(book.id, page, {
									height: 600,
								})
						: undefined
				}
				imageSizes={book.metadata?.page_dimensions?.dimensions?.map(({ height, width }) => ({
					height,
					width,
					ratio: width / height,
				}))}
				onPageChanged={onPageChanged}
			/>
		)
	}

	// TODO: support native PDF reader?
	// else if (book.extension.match(PDF_EXTENSION)) {}

	return <UnsupportedReader />
}
