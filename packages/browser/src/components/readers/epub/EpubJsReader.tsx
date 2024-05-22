import { API, epubApi, epubQueryKeys, mediaQueryKeys, updateEpubProgress } from '@stump/api'
import {
	type EpubReaderPreferences,
	queryClient,
	useEpubLazy,
	useEpubReader,
	useQuery,
} from '@stump/client'
import { Bookmark, UpdateEpubProgress } from '@stump/types'
import { Book, Rendition } from 'epubjs'
import uniqby from 'lodash.uniqby'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import AutoSizer from 'react-virtualized-auto-sizer'

import { useTheme } from '@/hooks'

import EpubReaderContainer from './EpubReaderContainer'
import { stumpDark } from './themes'

// NOTE: http://epubjs.org/documentation/0.3/ for epubjs documentation overview

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
	const { theme } = useTheme()

	const ref = useRef<HTMLDivElement>(null)

	const [book, setBook] = useState<Book | null>(null)
	const [rendition, setRendition] = useState<Rendition | null>(null)

	const [currentLocation, setCurrentLocation] = useState<EpubLocationState>()

	const { epubPreferences } = useEpubReader((state) => ({
		epubPreferences: state.preferences,
	}))

	const { data: bookmarks } = useQuery([epubQueryKeys.getBookmarks, id], async () => {
		try {
			const { data } = await epubApi.getBookmarks(id)
			return data
		} catch (error) {
			console.error('Failed to fetch bookmarks', error)
			return []
		}
	})
	const existingBookmarks = useMemo(
		() =>
			(bookmarks ?? []).reduce(
				(acc, bookmark) => {
					if (!bookmark.epubcfi) {
						return acc
					} else {
						acc[bookmark.epubcfi] = bookmark
						return acc
					}
				},
				{} as Record<string, Bookmark>,
			),

		[bookmarks],
	)

	//* Note: some books have entries in the spine for each href, some don't. It seems
	//* mostly just a matter of if the epub is good.
	const { chapter, chapterName } = useMemo(() => {
		let name: string | undefined

		const currentHref = currentLocation?.start.href
		const position = book?.navigation?.toc?.findIndex(
			(toc) => toc.href === currentHref || (!!currentHref && toc.href.startsWith(currentHref)),
		)

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
		if (theme === 'dark') {
			rendition.themes.select('stump-dark')
		} else {
			rendition.themes.select('stump-light')
		}
		rendition.direction(preferences.readingDirection)
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

					// This callback is used to change the page when a keydown event is recieved.
					const keydown_callback = (event: KeyboardEvent) => {
						// Check arrow keys
						if (event.key == 'ArrowLeft') {
							rendition_.prev()
						}
						if (event.key == 'ArrowRight') {
							rendition_.next()
						}
					}
					// The rendition fires keydown events when the epub page is in focus
					rendition_.on('keydown', keydown_callback)
					// When the epub page isn't in focus, the window fires them instead
					window.addEventListener('keydown', keydown_callback)

					applyEpubPreferences(rendition_, epubPreferences)
					setRendition(rendition_)

					const targetCfi = epub?.media_entity.active_reading_session?.epubcfi ?? initialCfi
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

	// TODO: this needs to have fullscreen as an effect dependency
	/**
	 * This effect is responsible for resizing the epubjs rendition instance whenever the
	 * div it attaches to is resized.
	 *
	 * Resizing here typically happens, outside user-initiated
	 * events like window resizing, when the fullscreen state changes.
	 */
	useEffect(() => {
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect

				const { width: currentWidth, height: currentHeight } = ref.current
					? ref.current.getBoundingClientRect()
					: {
							height: 0,
							width: 0,
						}

				if (currentWidth === width && currentHeight === height) {
					continue
				}

				rendition?.resize(width, height)
			}
		})

		if (ref.current) {
			resizeObserver.observe(ref.current)
		}

		return () => {
			resizeObserver.disconnect()
		}
	}, [rendition])

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
		[rendition, epubPreferences, theme],
	)

	/**
	 * This effect is responsible for invalidating the in progress media query whenever
	 * the epub reader is unmounted. This is so that the in progress media query will
	 * refetch the updated progress information.
	 */
	useEffect(() => {
		return () => {
			queryClient.invalidateQueries([mediaQueryKeys.getInProgressMedia], { exact: false })
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
	 * A callback for when the user wants to navigate to a specific cfi. This will only run
	 * if the rendition instance is set.
	 *
	 * @param cfi The cfi to navigate to
	 */
	const onGoToCfi = useCallback(
		async (cfi: string) => {
			if (!rendition) {
				return
			}

			try {
				await rendition.display(cfi)
			} catch (err) {
				console.error(err)
				toast.error('Failed to navigate, please check the integrity of the epub file')
			}
		},
		[rendition],
	)

	/**
	 * A callback for when the user clicks on a link embedded in the epub. This will only run
	 * if the rendition instance is set.
	 */
	const onLinkClick = useCallback(
		async (href: string) => {
			if (!book || !rendition || !ref.current) {
				return
			}

			const failureMessage = 'Failed to navigate, please check the integrity of the epub file'
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

	/**
	 * A callback for attempting to extract preview text from a given cfi. This is used for bookmarks,
	 * to provide a preview of the bookmarked start location
	 */
	const getCfiPreviewText = useCallback(
		async (cfi: string) => {
			if (!book) return null

			const range = await book.getRange(cfi)
			if (!range) return null

			return range.commonAncestorContainer?.textContent ?? null
		},
		[book],
	)

	/**
	 * A callback for searching the entire book for a given query. This will only run if the book
	 * and spine are available.
	 *
	 * Note: This is a relatively expensive operation, since it requires loading each spine item
	 * and then unloading it after the search is complete. This makes sense, since this reader is
	 * completely client-side, but should be noted
	 */
	const searchEntireBook = useCallback(
		async (query: string) => {
			if (!book || !book.spine || !book.spine.each) return []

			const promises: Array<Promise<SpineItemFindResult[]>> = []

			book.spine.each((item?: SpineItem) => {
				if (!item) return []

				promises.push(
					item
						// @ts-expect-error: I literally can't stand epubjs lol
						.load(book.load.bind(book))
						.then(() => item.find(query))
						.then((res) => uniqby(res, 'excerpt'))
						.finally(() => item.unload.bind(item)),
				)
			})

			return await Promise.all(promises).then((results) =>
				results
					.map((res, idx) => ({
						results: res,
						spineIndex: idx,
					}))
					.filter(({ results }) => results.length > 0),
			)
		},
		[book],
	)

	// TODO: figure this out! Basically, I would (ideally) like to be able to determine if a bookmark
	// 'exists' within another. This can happen when you move between viewport sizes..
	// const cfiWithinAnother = useCallback(
	// 	async (cfi: string, otherCfi: string) => {
	// 		if (!book) return false

	// 		const range = await book.getRange(cfi)
	// 		const otherRange = await book.getRange(otherCfi)

	// 		if (!range || !otherRange) return false

	// 		console.log({ otherRange, range })

	// 		const firstStartNode = range.startContainer
	// 		const firstEndNode = range.endContainer

	// 		range.commonAncestorContainer

	// 		// const firstIsInOther = range.isPointInRange(otherRange.startContainer, otherRange.startOffset)
	// 		// const otherIsInFirst = otherRange.isPointInRange(range.startContainer, range.startOffset)

	// 		// return firstIsInOther || otherIsInFirst

	// 		book.locations.generate(10000)

	// 		const first = new EpubCFI(cfi)
	// 		const second = new EpubCFI(otherCfi)

	// 		console.log({ compare: first.compare(cfi, otherCfi) })
	// 		console.log({ first, second })

	// 		const location1 = book.locations.locationFromCfi(cfi)
	// 		const location2 = book.locations.locationFromCfi(otherCfi)

	// 		console.log({ location1, location2 })
	// 	},
	// 	[book, rendition],
	// )

	// cfiWithinAnother(
	// 	'epubcfi(/6/12!/4[3Q280-a9efbf2f573d4345819e3829f80e5dbc]/2[prologue]/2/2/2/4/2[calibre_pb_0]/1:0)',
	// 	'epubcfi(/6/12!/4[3Q280-a9efbf2f573d4345819e3829f80e5dbc]/2[prologue]/4[prologue-text]/8/1:56)',
	// ).then((res) => console.log('cfiWithinAnother', res))

	if (isLoading || !epub) {
		return null
	}

	return (
		<EpubReaderContainer
			readerMeta={{
				bookEntity: epub.media_entity,
				bookMeta: {
					bookmarks: existingBookmarks,
					chapter: {
						cfiRange: [currentLocation?.start.cfi, currentLocation?.end.cfi],
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
				progress: epub.media_entity.active_reading_session?.percentage_completed || null,
			}}
			controls={{
				getCfiPreviewText,
				onGoToCfi,
				onLinkClick,
				onPaginateBackward,
				onPaginateForward,
				searchEntireBook,
			}}
		>
			<div className="h-full w-full">
				<AutoSizer>
					{({ height, width }) => {
						return <div ref={ref} style={{ height, width }} />
					}}
				</AutoSizer>
			</div>
		</EpubReaderContainer>
	)
}

interface SpineItem {
	load: (book: Book) => Promise<object>
	unload: (item: SpineItem) => void
	find: (query: string) => Promise<SpineItemFindResult[]>
}

interface SpineItemFindResult {
	cfi: string
	excerpt: string
}
