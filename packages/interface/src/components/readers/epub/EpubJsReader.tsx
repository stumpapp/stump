import test from 'node:test'

import { API, updateEpubProgress } from '@stump/api'
import {
	type EpubReaderPreferences,
	queryClient,
	useEpubLazy,
	useEpubReader,
	useTheme,
} from '@stump/client'
import { UpdateEpubProgress } from '@stump/types'
import { Book, Rendition } from 'epubjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'

// import { useSwipeable } from 'react-swipeable'
import EpubReaderContainer from './EpubReaderContainer'
import { stumpDark } from './themes'

/** The props for the EpubJsReader component */
type EpubJsReaderProps = {
	/** The ID of the associated media entitiy for this epub */
	id: string
	/** The initial cfi to start the reader at, i.e. where the read left off */
	initialCfi: string | null
}

/** Location information as it is structured internally in epubjs */
type EpubLocation = {
	/** The epubcfi for the location */
	cfi: string
	/** The chapter display information */
	displayed: {
		/** The current page within the chapter */
		page: number
		/** The total pages in the chapter */
		total: number
	}
	/** The href as it is represented in the epub */
	href: string
	/** The index of this location, relative to the spine */
	index: number
	// TODO: i don't remember lol
	location: number
	// TODO: i don't remember lol
	percentage: number
}

/** The epubjs location state */
type EpubLocationState = {
	atStart?: boolean
	atEnd?: boolean
	start: EpubLocation
	end: EpubLocation
}

/**
 * A component for rendering a reader capable of reading epub files. This component uses
 * epubjs internally for the main rendering logic.
 *
 * Note: At some point in the future, I will be prioritizing some sort of streamable
 * epub reader as an additional option.
 */
export default function EpubJsReader({ id, initialCfi }: EpubJsReaderProps) {
	const { isDark } = useTheme()

	const ref = useRef<HTMLDivElement>(null)

	const [book, setBook] = useState<Book | null>(null)
	const [rendition, setRendition] = useState<Rendition | null>(null)

	const [currentLocation, setCurrentLocation] = useState<EpubLocationState>()

	const { epubPreferences } = useEpubReader((state) => ({
		epubPreferences: state.preferences,
	}))

	//* Note: some books have entries in the spine for each href, some don't. It seems
	//* mostly just a matter of if the epub is good.
	const { chapter, chapterName } = useMemo(() => {
		let name: string | undefined

		const currentHref = currentLocation?.start.href
		const position = book?.navigation?.toc?.findIndex((toc) => toc.href === currentHref)

		if (position !== undefined && position !== -1) {
			name = book?.navigation.toc[position]?.label.trim()
		}

		return { chapter: position, chapterName: name }
	}, [book, currentLocation])

	const { epub, isLoading } = useEpubLazy(id)

	/**
	 * Syncs the current location with local state whenever epubjs internal location
	 * changes. It will also try and determine the current chapter information.
	 *
	 * @param changeState The new location state of the epub
	 */
	function handleLocationChange(changeState: EpubLocationState) {
		const start = changeState.start

		//* NOTE: this shouldn't happen, but the types are so unreliable that I am
		//* adding this extra check as a precaution.
		if (!start) {
			return
		}

		setCurrentLocation(changeState)
	}

	/**
	 * This effect is responsible for initializing the epubjs book, which gets stored in
	 * this component's state. It will only run once when media entity is fetched from the
	 * Stump server.
	 *
	 * Note: epubjs uses the download endpoint from the Stump server to locally load the
	 * epub file. This is why the requestCredentials option is set to true, as it would
	 * otherwise not be able to authenticate with the server.
	 */
	useEffect(() => {
		if (!ref.current) return

		if (!book) {
			setBook(
				new Book(`${API.getUri()}/media/${id}/file`, {
					openAs: 'epub',
					// @ts-expect-error: epubjs has incorrect types
					requestCredentials: true,
				}),
			)
		}
	}, [book, epub, id])

	/**
	 *	A function for applying the epub reader preferences to the epubjs rendition instance
	 *
	 * @param rendition: The epubjs rendition instance
	 * @param preferences The epub reader preferences
	 */
	const applyEpubPreferences = (rendition: Rendition, preferences: EpubReaderPreferences) => {
		if (isDark) {
			rendition.themes.select('stump-dark')
		}

		rendition.themes.fontSize(`${preferences.fontSize}px`)
	}

	/**
	 * This effect is responsible for rendering the epub to the screen. It will only run once
	 * when the book is has been loaded. It will also set the initial location and theme
	 * for the rendition.
	 */
	useEffect(
		() => {
			if (!book) return
			if (!ref.current) return

			book.ready.then(() => {
				if (book.spine) {
					const defaultLoc = book.rendition?.location?.start?.cfi

					const rendition_ = book.renderTo(ref.current!, {
						height: '100%',
						width: '100%',
					})

					//? TODO: I guess here I would need to wait for and load in custom theme blobs...
					//* Color manipulation reference: https://github.com/futurepress/epub.js/issues/1019
					rendition_.themes.register('stump-dark', stumpDark)
					rendition_.on('relocated', handleLocationChange)

					// This callback is used to change the page when a keydown
					// event is recieved.
					const keydown_callback = (event: KeyboardEvent) => {
						// Check arrow keys
						if (event.key == 'ArrowLeft') {
							rendition_.prev()
						}
						if (event.key == 'ArrowRight') {
							rendition_.next()
						}
					}
					// The rendition fires the event when the epub page is in focus
					rendition_.on('keydown', keydown_callback)
					// The window should fire the event when the epub page isn't in focus
					// However turning the page doesn't work, possibly because
					// rendition.start() hasn't been called yet?
					window.addEventListener('keydown', keydown_callback)

					applyEpubPreferences(rendition_, epubPreferences)
					setRendition(rendition_)

					const targetCfi = epub?.media_entity.read_progresses?.at(0)?.epubcfi ?? initialCfi
					if (targetCfi) {
						rendition_.display(targetCfi)
					} else if (defaultLoc) {
						rendition_.display(defaultLoc)
					} else {
						rendition_.display()
					}
				}
			})
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[book],
	)

	/**
	 * This effect is responsible for updating the epub theme options whenever the epub
	 * preferences change. It will only run when the epub preferences change and the
	 * rendition instance is set.
	 */
	useEffect(
		() => {
			if (rendition) {
				applyEpubPreferences(rendition, epubPreferences)
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[rendition, epubPreferences],
	)

	/**
	 * This effect is responsible for invalidating the in progress media query whenever
	 * the epub reader is unmounted. This is so that the in progress media query will
	 * refetch the updated progress information.
	 */
	useEffect(() => {
		return () => {
			queryClient.invalidateQueries(['getInProgressMedia'])
		}
	}, [])

	/**
	 * A callback for when the reader should paginate forward. This will only run if the
	 * rendition instance is set.
	 */
	const onPaginateForward = useCallback(async () => {
		if (rendition) {
			try {
				await rendition.next()
			} catch (err) {
				console.error(err)
				toast.error('')
			}
		}
	}, [rendition])

	/**
	 * A callback for when the reader should paginate backward. This will only run if the
	 * rendition instance is set.
	 */
	const onPaginateBackward = useCallback(async () => {
		if (rendition) {
			try {
				await rendition.prev()
			} catch (err) {
				console.error(err)
				toast.error('Something went wrong!')
			}
		}
	}, [rendition])

	/**
	 * A callback for when the user clicks on a link embedded in the epub. This will only run
	 * if the rendition instance is set.
	 */
	const onLinkClick = useCallback(
		async (href: string) => {
			if (!book || !rendition || !ref.current) {
				return
			}

			const failureMessage = 'Failed to navigate, please check the integrity of the epub file.'
			const adjusted = href.split('#')[0]

			let spineItem = book.spine.get(adjusted)
			if (!spineItem) {
				// @ts-expect-error: epubjs has incorrect types
				const matches = book.spine.items
					.filter((item: Record<string, unknown>) => {
						const withPrefix = `/${adjusted}`
						return (
							item.url === adjusted ||
							item.canonical == adjusted ||
							item.url === withPrefix ||
							item.canonical === withPrefix
						)
					})
					.map((item: Record<string, unknown>) => book.spine.get(item.index as number))
					.filter(Boolean)

				if (matches.length > 0) {
					spineItem = matches[0]
				} else {
					console.error('Could not find spine item for href', href)
					toast.error(failureMessage)
					return
				}
			}

			const epubcfi = spineItem.cfiFromElement(ref.current)
			if (epubcfi) {
				try {
					await rendition.display(epubcfi)
				} catch (err) {
					console.error(err)
				}
			} else {
				console.error('Could not get cfi for href', href)
				toast.error(failureMessage)
			}
		},
		[book, rendition],
	)

	// TODO: suppport icognito mode that doesn't sync progress...
	const spineSize = epub?.spine.length
	/**
	 * This effect is responsible for syncing the current epub progress information to
	 * the Stump server. If not location information is available, this effect will do nothing.
	 *
	 * Note: This effect has some poor assumptions during the calculation of the percentage
	 * completed number. This is largely due to epubjs not providing reliable means of getting
	 * this information, or the pieces of information needed to calculate it. Be sure to
	 * review the comments in this effect carefully before making any changes.
	 */
	useEffect(
		() => {
			//* We can't do anything without the entity, so short circuit. This shouldn't
			//* really happen, though.
			if (!epub) return

			/**
			 *
			 * @param payload The payload to send to the server. Contains all of the information
			 * needed to update the progress of the epub.
			 * @returns A promise which resolves to the updated progress information.
			 */
			const handleUpdateProgress = async (payload: UpdateEpubProgress) => {
				try {
					await updateEpubProgress({ ...payload, id: epub.media_entity.id })
				} catch (err) {
					console.error(err)
				}
			}

			if (!currentLocation) {
				return
			}

			const { start, end, atEnd } = currentLocation

			if (!start && !end) {
				return
			}

			let percentage: number | null = null

			if (spineSize) {
				const currentChapterPage = start.displayed.page
				const pagesInChapter = start.displayed.total

				const chapterCount = spineSize //* not a great assumption
				//* The percentage of the book that has been read based on the chapter index.
				//* E.g. if you are on chapter 15 of 20, this will be 0.75.
				const totalChapterPercentage = start.index / chapterCount
				//* The percentage of the current chapter that has been read based on the page number.
				//* E.g. if you are on page 2 of 20 in the current chapter, this will be 0.1.
				const chapterPercentage = currentChapterPage / pagesInChapter
				//* The percentage of the book that has been read based on the current page, assuming
				//* that each chapter is the same length. This is obviously not ideal, but epubjs is
				//* terrible and doesn't provide a better way to do this.
				const naiveAdjustment = chapterPercentage * (1 / chapterCount)

				const naitveTotal = totalChapterPercentage + naiveAdjustment
				const isAtEnd = Math.abs(naitveTotal - 1) < 0.02
				if (isAtEnd) {
					//* if total is +- 0.02 of 1, then we are at the end of the book.
					percentage = 1.0
				} else {
					percentage = naitveTotal
				}

				handleUpdateProgress({
					epubcfi: start.cfi,
					is_complete: atEnd ?? percentage === 1.0,
					percentage,
				})
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[currentLocation, spineSize],
	)

	if (isLoading || !epub) {
		return null
	}

	return (
		<EpubReaderContainer
			readerMeta={{
				bookEntity: epub.media_entity,
				bookMeta: {
					chapter: {
						currentPage: [
							currentLocation?.start.displayed.page,
							currentLocation?.end.displayed.page,
						],
						name: chapterName,
						position: chapter,
						totalPages: currentLocation?.start.displayed.total,
					},
					toc: epub.toc,
				},
				progress: epub.media_entity.read_progresses?.[0]?.percentage_completed || null,
			}}
			controls={{
				onLinkClick,
				onPaginateBackward,
				onPaginateForward,
			}}
		>
			<div className="h-full w-full" ref={ref} />
		</EpubReaderContainer>
	)
}
