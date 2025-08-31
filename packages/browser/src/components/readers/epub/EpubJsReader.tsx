import {
	BookPreferences,
	queryClient,
	useGraphQLMutation,
	useSDK,
	useSuspenseGraphQL,
} from '@stump/client'
import {
	Bookmark,
	EpubJsReaderQuery,
	EpubProgressInput,
	graphql,
	ReadingMode,
	SupportedFont,
} from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Book, Contents, Rendition } from 'epubjs'
import uniqby from 'lodash/uniqBy'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { toast } from 'sonner'

import Spinner from '@/components/Spinner'
import { useTheme } from '@/hooks'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import EpubReaderContainer from './EpubReaderContainer'
import { stumpDark, toFamilyName } from './themes'

// TODO: Fix all lifecycle lints
// TODO: Consider a total re-write or at least thorough review of this component, it was written a while
// ago and I feel like it could be improved
// TODO: Support elapsed time tracking!!!!

// NOTE: http://epubjs.org/documentation/0.3/ for epubjs documentation overview

const LOCATIONS_CACHE_KEY = 'stump:epubjs-locations-cache'

const formatCacheKey = (id: string) => `${LOCATIONS_CACHE_KEY}:book-${id}`

const loadCachedLocations = (id: string): string[] | null => {
	const cached = localStorage.getItem(formatCacheKey(id))
	if (!cached) {
		return null
	}

	try {
		const parsed = JSON.parse(cached)
		if (Array.isArray(parsed) && typeof parsed.at(0) === 'string') {
			return parsed
		}
	} catch (error) {
		console.error('Failed to parse cached locations:', error)
	}

	return null
}

const saveCachedLocations = (id: string, locations: string[]) => {
	localStorage.setItem(formatCacheKey(id), JSON.stringify(locations))
}

/** The props for the EpubJsReader component */
type EpubJsReaderProps = {
	/** The ID of the associated media entity for this epub */
	id: string
	/** If true, starts progress at the start of the book, or the default location if set */
	isIncognito: boolean
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

class SectionLengths {
	public lengths: { [key: number]: number } = {}
}

const query = graphql(`
	query EpubJsReader($id: ID!) {
		epubById(id: $id) {
			mediaId
			rootBase
			rootFile
			extraCss
			toc
			resources
			metadata
			spine {
				id
				idref
				properties
				linear
			}
			bookmarks {
				id
				userId
				epubcfi
				mediaId
			}
			media {
				id
				resolvedName
				pages
				extension
				readProgress {
					percentageCompleted
					epubcfi
					page
					elapsedSeconds
				}
				libraryConfig {
					defaultReadingImageScaleFit
					defaultReadingMode
					defaultReadingDir
				}
			}
		}
	}
`)

const mutation = graphql(`
	mutation UpdateEpubProgress($id: ID!, $input: MediaProgressInput!) {
		updateMediaProgress(id: $id, input: $input) {
			__typename
			... on ActiveReadingSession {
				percentageCompleted
				epubcfi
				page
				elapsedSeconds
			}
		}
	}
`)

const injectFontStylesheet = (rendition: Rendition) => {
	const doc = Object.values(rendition.getContents())[0]?.document
	if (!doc) return

	const head = doc.head
	if (!head) return

	const link = doc.createElement('link')
	link.rel = 'stylesheet'
	link.id = 'stump-fonts-stylesheet'
	link.href = '/assets/fonts/fonts.css'
	head.appendChild(link)
}

/**
 * A component for rendering a reader capable of reading epub files. This component uses
 * epubjs internally for the main rendering logic.
 *
 * Note: At some point in the future, I will be prioritizing some sort of streamable
 * epub reader as an additional option.
 */
export default function EpubJsReader({ id, isIncognito }: EpubJsReaderProps) {
	const { sdk } = useSDK()
	const { theme } = useTheme()

	const {
		data: { epubById: ebook },
	} = useSuspenseGraphQL(query, ['epubJsReader', id], {
		id: id || '',
	})

	const ref = useRef<HTMLDivElement>(null)

	const [book, setBook] = useState<Book | null>(null)
	const [rendition, setRendition] = useState<Rendition | null>(null)
	const [sectionsLengths, setSectionLengths] = useState<SectionLengths | null>(null)

	const [currentLocation, setCurrentLocation] = useState<EpubLocationState>()
	const [isInitialLoading, setIsInitialLoading] = useState(true)

	const { bookPreferences } = useBookPreferences({
		book: ebook.media,
	})

	const client = useQueryClient()
	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateMediaProgress: data }) => {
			client.setQueryData(['epubJsReader', id], (prevData: EpubJsReaderQuery) => {
				if (!prevData) return prevData

				return {
					...prevData,
					epubById: {
						...prevData.epubById,
						media: {
							...prevData.epubById.media,
							readProgress: data.__typename === 'ActiveReadingSession' ? data : null,
						},
					},
				}
			})
		},
	})

	const updateProgress = useCallback(
		(input: EpubProgressInput) => {
			if (isIncognito) return

			mutate({
				id: ebook.media?.id || '',
				input: {
					epub: input,
				},
			})
		},
		[mutate, ebook, isIncognito],
	)

	const existingBookmarks = useMemo(
		() =>
			(ebook?.bookmarks ?? []).reduce(
				(acc: Record<string, Bookmark>, bookmark: Bookmark) => {
					if (!bookmark.epubcfi) {
						return acc
					} else {
						acc[bookmark.epubcfi] = bookmark
						return acc
					}
				},
				{} as Record<string, Bookmark>,
			),

		[ebook],
	)

	//* Note: some books have entries in the spine for each href, some don't. It seems
	//* mostly just a matter of if the epub is good.
	const { chapter, chapterName, sectionIndex } = useMemo(() => {
		let name: string | undefined
		const currentHref = currentLocation?.start.href

		const spineItem = book?.spine.get(currentHref)
		const sectionIndex = spineItem?.index

		const position = book?.navigation?.toc?.findIndex(
			(toc) => toc.href === currentHref || (!!currentHref && toc.href.startsWith(currentHref)),
		)

		if (position !== undefined && position !== -1) {
			name = book?.navigation.toc[position]?.label.trim()
		}

		return { chapter: position, chapterName: name, sectionIndex: sectionIndex }
	}, [book, currentLocation])

	/**
	 * A function for focusing the iframe in the epub reader. This will be used to ensure
	 * the iframe is focused whenever the reader is loaded and/or the location changes.
	 */
	const focusIframe = () => {
		const iframe = ref.current?.querySelector('iframe')
		if (iframe) {
			iframe.focus()
		} else {
			console.warn('Failed to find iframe in epub reader')
		}
	}

	const computeNaiveProgress = useCallback(
		({ start }: EpubLocationState) => {
			let percentage: number | null = null

			const spineSize = ebook.spine.length
			if (spineSize) {
				const currentChapterPage = start.displayed.page
				const pagesInChapter = start.displayed.total

				const chapterCount = spineSize //* not a great assumption
				//* The percentage of the book that has been read based on spine position.
				//* We treat this as: (current_spine_index + page_progress_in_spine) / total_spine_items
				const spineProgress = start.index / chapterCount
				const totalChapterPercentage = spineProgress
				//* The percentage of the current chapter that has been read based on the page number.
				//* E.g. if you are on page 2 of 20 in the current chapter, this will be 0.1.
				const chapterPercentage = currentChapterPage / pagesInChapter
				//* The percentage of the book that has been read based on the current page, assuming
				//* that each chapter is the same length. This is obviously not ideal, but epubjs is
				//* terrible and doesn't provide a better way to do this.
				const naiveAdjustment = chapterPercentage * (1 / chapterCount)

				const naiveTotal = totalChapterPercentage + naiveAdjustment
				percentage = naiveTotal
			}

			return percentage
		},
		[ebook.spine],
	)

	const computeProgress = useCallback(
		async (location: EpubLocationState) => {
			let percentageCompleted = book?.locations?.percentageFromCfi(location.start.cfi) ?? null
			if (percentageCompleted == null) {
				// Attempt to reload the locations
				await book?.locations?.generate(1000)
				percentageCompleted = book?.locations?.percentageFromCfi(location.start.cfi) ?? null
			}

			if (percentageCompleted == null) {
				console.warn('No CFI percentage available, falling back to spine-based calculation')
				percentageCompleted = computeNaiveProgress(location)
			}

			if (percentageCompleted == null) {
				percentageCompleted = computeNaiveProgress(location)
			}

			if (percentageCompleted == null) {
				console.warn('Failed to compute any percentage-based progress')
				return
			}

			updateProgress({
				epubcfi: location.start.cfi,
				percentage: percentageCompleted,
				isComplete: percentageCompleted >= 1.0,
			})
		},
		[book, computeNaiveProgress, updateProgress],
	)

	/**
	 * Syncs the current location with local state whenever epubjs internal location
	 * changes. It will also try and determine the current chapter information.
	 *
	 * @param changeState The new location state of the epub
	 */
	const handleLocationChange = useCallback(
		(changeState: EpubLocationState) => {
			const start = changeState.start
			//* NOTE: this shouldn't happen, but the types are so unreliable that I am
			//* adding this extra check as a precaution.
			if (!start) {
				return
			}
			setCurrentLocation(changeState)
			focusIframe()
			computeProgress(changeState)
		},
		[computeProgress],
	)

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
		if (!book && ebook && ebook.media) {
			setBook(
				new Book(sdk.media.downloadURL(id), {
					openAs: 'epub',
					// @ts-expect-error: epubjs has incorrect types
					requestCredentials: true,
				}),
			)
		}
	}, [book, ebook, id, sdk])

	/**
	 *	A function for applying the initial epub reader preferences to the epubjs rendition instance
	 *
	 * @param rendition: The epubjs rendition instance
	 * @param preferences The epub reader preferences
	 */
	const applyEpubPreferences = useCallback(
		(rendition: Rendition, preferences: BookPreferences) => {
			if (theme === 'dark') {
				rendition.themes.register('stump-dark', stumpDark)
				rendition.themes.select('stump-dark')
			} else {
				rendition.themes.register('stump-light', {})
				rendition.themes.select('stump-light')
			}
			rendition.direction(preferences.readingDirection === 'RTL' ? 'rtl' : 'ltr')
			// Set flow based on reading mode
			if (preferences.readingMode === ReadingMode.ContinuousVertical) {
				rendition.flow('scrolled-doc')
			} else {
				// Default to paginated for 'paged' mode
				rendition.flow('paginated')
			}
		},
		[theme],
	)

	/**	A function for applying updates to the the epub reader preferences to the epubjs rendition instance */
	const updateEpubPreferences = useCallback(
		(rendition: Rendition, fontSize?: number, lineHeight?: number, fontFamily?: string) => {
			const newStylesheetRules = {
				'a, blockquote, body, h1, h2, h3, h4, h5, p, span, ul': {
					'font-size': `${fontSize}px !important`,
					'line-height': `${lineHeight} !important`,
					'font-family': `${toFamilyName(fontFamily as SupportedFont)} !important`,
				},
			}

			const contents = rendition.getContents()
			// Only applies temporarily for the current section
			// @ts-expect-error: epubjs is a silly bean
			contents.forEach((content: Contents) => {
				content.addStylesheetRules(newStylesheetRules, 'font-stylesheet-rules')
			})
			// Only applies once section changes
			rendition.hooks.content.register(function (contents: Contents) {
				contents.addStylesheetRules(newStylesheetRules, 'font-stylesheet-rules')
			})
		},
		[],
	)

	const generateLocations = useCallback(
		async (book: Book) => {
			try {
				const locations = await book.locations.generate(1000)
				saveCachedLocations(ebook.mediaId, locations)
			} catch (error) {
				console.error('Failed to generate locations for epub', { error })
			} finally {
				setIsInitialLoading(false)
			}
		},
		[ebook.mediaId],
	)

	const didRenderToScreen = useRef(false)
	/**
	 * This effect is responsible for rendering the epub to the screen. It will only run once
	 * when the book is has been loaded. It will also set the initial location and theme
	 * for the rendition.
	 */
	useEffect(() => {
		if (!book || !ref.current) return

		book.ready.then(async () => {
			if (book.spine && !didRenderToScreen.current) {
				didRenderToScreen.current = true
				const defaultLoc = book.rendition?.location?.start?.cfi

				const boundingClient = ref.current?.getBoundingClientRect()
				const height = boundingClient?.height ? boundingClient.height - 2 : '100%'
				const width = boundingClient?.width ?? '100%'

				const cachedLocations = loadCachedLocations(ebook.mediaId)
				if (cachedLocations) {
					book.locations.load(JSON.stringify(cachedLocations))
					setIsInitialLoading(false)
					// We still want to re-generate in-case the cache is bad, but we don't
					// need to block the UI
					generateLocations(book)
				} else {
					await generateLocations(book)
				}

				const rendition_ = book.renderTo(ref.current!, { width, height })

				rendition_.hooks.content.register(() => {
					injectFontStylesheet(rendition_)
				})

				//? TODO: I guess here I would need to wait for and load in custom theme blobs...
				//* Color manipulation reference: https://github.com/futurepress/epub.js/issues/1019
				rendition_.themes.register('stump-dark', stumpDark)
				rendition_.themes.register('stump-light', {})

				rendition_.on('relocated', handleLocationChange)

				// This callback is used to change the page when a keydown event is received.
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

				applyEpubPreferences(rendition_, bookPreferences)

				setRendition(rendition_)

				const targetCfi = ebook.media?.readProgress?.epubcfi
				if (targetCfi && !isIncognito) {
					rendition_.display(targetCfi)
				} else if (defaultLoc) {
					rendition_.display(defaultLoc)
				} else {
					rendition_.display()
				}

				createSectionLengths(book, setSectionLengths)
			}
		})
	}, [
		book,
		applyEpubPreferences,
		bookPreferences,
		handleLocationChange,
		isIncognito,
		ebook,
		generateLocations,
	])

	// I'm hopeful this solves: https://github.com/stumpapp/stump/issues/726
	// Honestly though epub.js is such a migraine that I'm OK just waiting until
	// I have the time to migrate off of it
	useEffect(
		() => {
			return () => {
				rendition?.destroy()
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
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

	const { fontSize, lineHeight, fontFamily } = bookPreferences
	/**
	 * This effect is responsible for updating the epub theme options whenever the epub
	 * preferences change. It will only run when the epub preferences change and the
	 * rendition instance is set.
	 */
	useEffect(() => {
		if (!rendition) return
		updateEpubPreferences(rendition, fontSize, lineHeight, fontFamily)
	}, [rendition, fontSize, fontFamily, lineHeight, updateEpubPreferences])

	/**
	 * Invalidate the book query when a reader is unmounted so that the book overview
	 * is updated with the latest read progress
	 */
	useEffect(
		() => {
			return () => {
				Promise.all([
					queryClient.invalidateQueries({ queryKey: ['bookOverview', id], exact: false }),
					queryClient.invalidateQueries({ queryKey: ['keepReading'], exact: false }),
				])
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

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

	// jump to a specific section
	const jumpToSection = useCallback(
		async (section: number) => {
			onJumpToSection(section, book, rendition, ref, onGoToCfi)
		},
		[book, rendition, onGoToCfi],
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

	if (!ebook || !ebook.media) {
		return null
	}

	const toc = parseToc(ebook.toc)

	return (
		<EpubReaderContainer
			readerMeta={{
				bookEntity: ebook.media,
				bookMeta: {
					bookmarks: existingBookmarks,
					chapter: {
						cfiRange: [currentLocation?.start.cfi, currentLocation?.end.cfi],
						currentPage: [
							currentLocation?.start.displayed.page,
							currentLocation?.end.displayed.page,
						],
						name: chapterName,
						sectionSpineIndex: sectionIndex,
						position: chapter,
						totalPages: currentLocation?.start.displayed.total,
					},
					toc: toc,
					sectionLengths: sectionsLengths?.lengths ?? {},
				},
				progress: ebook.media.readProgress?.percentageCompleted || null,
			}}
			controls={{
				getCfiPreviewText,
				onGoToCfi,
				onLinkClick,
				onPaginateBackward,
				onPaginateForward,
				jumpToSection,
				searchEntireBook,
			}}
		>
			<div className="h-full w-full">
				<AutoSizer>
					{({ height, width }) => {
						return <div ref={ref} key={ebook.media.id} style={{ height, width }} />
					}}
				</AutoSizer>

				{isInitialLoading && (
					<div className="flex h-full flex-1 items-center justify-center">
						<Spinner />
					</div>
				)}
			</div>
		</EpubReaderContainer>
	)
}

function parseToc(toc: EpubJsReaderQuery['epubById']['toc']): EpubContent[] {
	if (!toc) return []

	// epub toc is an array of json strings of EpubContent, so we need to parse them
	const parsedToc = toc
		.map((item) => {
			try {
				return JSON.parse(item) as EpubContent
			} catch (e) {
				console.error('Failed to parse toc item', item, e)
				return null
			}
		})
		.filter((item) => item !== null) as EpubContent[]

	return parsedToc
}

async function createSectionLengths(
	book: Book,
	setSectionLengths: (sections: SectionLengths) => void,
) {
	const sections = new SectionLengths()

	function getTextLength(node: Node): number {
		if (!node) return 0

		let length = 0

		if (node.nodeType === Node.TEXT_NODE) {
			// If it's a text node, add its length to the total.
			length += (node as Text).length
		} else if (node.hasChildNodes()) {
			// Otherwise, recursively sum up the lengths of all child nodes.
			for (const childNode of node.childNodes.values()) {
				length += getTextLength(childNode)
			}
		}

		return length
	}

	if (!book || !book.spine || !book.spine.each) return sections

	// TODO: remove this in favor of a more efficient method where we don't have to load the entire book
	const promises: Promise<number[] | void>[] = []
	book.spine.each((item?: SpineItem) => {
		if (!item) return []

		promises.push(
			item
				// @ts-expect-error: I literally can't stand epubjs lol
				.load(book.load.bind(book))
				.then(() => [item.index, getTextLength(item.document?.body)])
				.catch(() => console.error('could not load section'))
				.finally(() => item.unload.bind(item)),
		)
	})

	const results = await Promise.all(promises)
	results.forEach((res) => {
		if (!res || res.length < 2) return
		const sectionIndex = res[0] ?? 0
		const length = res[1] ?? 0
		sections.lengths[sectionIndex] = length
	})

	setSectionLengths(sections)
}

async function onJumpToSection(
	section: number,
	book: Book | null,
	rendition: Rendition | null,
	ref: React.RefObject<HTMLDivElement> | undefined,
	onGoToCfi: (cfi: string) => void,
) {
	if (!book || !rendition || !ref || !ref.current || section < 0) return

	let maxIndex = -1
	book?.spine.each((item?: SpineItem) => {
		if (!item) return []
		maxIndex = Math.max(maxIndex, item.index)
	})

	if (section > maxIndex) {
		return
	}

	const spineItem = book?.spine.get(section)
	const sectionHref = spineItem?.href

	if (!sectionHref) {
		return
	}

	// Load the section
	onGoToCfi(spineItem.href)
}

interface SpineItem {
	load: (book: Book) => Promise<object>
	unload: (item: SpineItem) => void
	find: (query: string) => Promise<SpineItemFindResult[]>
	index: number
	document: Document
}

interface SpineItemFindResult {
	cfi: string
	excerpt: string
}

interface EpubContent {
	label: string
	content: string
	children: EpubContent[]
	play_order: number
}
