import { API, updateEpubProgress } from '@stump/api'
import { queryClient, useEpubLazy, useTheme } from '@stump/client'
import { UpdateEpubProgress } from '@stump/types'
import { Book, Rendition } from 'epubjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useSwipeable } from 'react-swipeable'

import EpubControls from './EpubControls'
import { stumpDark } from './themes'

/** The props for the EpubJsReader component */
type EpubJsReaderProps = {
	id: string
	initialCfi: string | null
}

/** Location information as it is structured internally in epubjs */
type EpubLocation = {
	cfi: string
	displayed: {
		page: number
		total: number
	}
	href: string
	index: number
	location: number
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
	const [chapter, setChapter] = useState<string>('')
	const [fontSize, setFontSize] = useState<number>(13)

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

		const newChapter = controls.getChapter(start.href)
		if (newChapter) {
			setChapter(newChapter)
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

					//* Color manipulation reference: https://github.com/futurepress/epub.js/issues/1019
					rendition_.themes.register('dark', stumpDark)
					rendition_.on('relocated', handleLocationChange)

					if (isDark) {
						rendition_.themes.select('dark')
					}

					rendition_.themes.fontSize('13px')

					setRendition(rendition_)

					if (initialCfi) {
						rendition_.display(initialCfi)
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
	 * This effect is responsible for updating the epub theme when the selected theme changes.
	 * If the rendition is not set, this effect will do nothing.
	 */
	useEffect(() => {
		if (!rendition) {
			return
		}

		if (isDark) {
			rendition.themes.select('dark')
		} else {
			rendition.themes.select('default')
		}
	}, [rendition, isDark])

	useEffect(() => {
		return () => {
			queryClient.invalidateQueries(['getInProgressMedia'])
		}
	}, [])

	const controls = useMemo(
		() => ({
			changeFontSize(size: number) {
				if (rendition) {
					setFontSize(size)
					rendition.themes.fontSize(`${size}px`)
				}
			},

			// Note: some books have entries in the spine for each href, some don't. This means for some
			// books the chapter will be null after the first page of that chapter. This function is
			// used to get the current chapter, which will only work, in some cases, on the first page
			// of the chapter. The chapter state will only get updated when this function returns a non-null
			// value.
			getChapter(href: string): string | null {
				if (book) {
					const filteredToc = book.navigation.toc.filter((toc) => toc.href === href)

					return filteredToc[0]?.label.trim() ?? null
				}

				return null
			},

			getCurrentEpubCfi() {
				const start = rendition?.location?.start.cfi
				const end = rendition?.location?.end.cfi
				return start ?? end
			},

			async goTo(href: string) {
				if (!book || !rendition || !ref.current) {
					return
				}

				const adjusted = href.split('#')[0]

				let match = book.spine.get(adjusted)

				if (!match) {
					// @ts-expect-error: types are wrong >:(
					// Note: epubjs it literally terrible and this should be classified as torture dealing
					// with this terrible library. The fact that I have to do this really blows my mind.
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
						match = matches[0]
					} else {
						console.error(`Could not find ${href}`)
						return
					}
				}

				const epubcfi = match.cfiFromElement(ref.current)
				if (epubcfi) {
					try {
						await rendition.display(epubcfi)
					} catch (err) {
						console.error(err)
					}
				} else {
					toast.error('Could not generate a valid epubcfi.')
				}
			},

			async goToCfi(cfi: string) {
				try {
					await rendition?.display(cfi)
				} catch (err) {
					console.error(err)
				}
			},

			async next() {
				if (rendition) {
					try {
						await rendition.next()
						// rendition.hooks.render.trigger(pageAnimation);
					} catch (err) {
						console.error(err)
						toast.error('Something went wrong!')
					}
				}
			},

			async prev() {
				if (rendition) {
					try {
						await rendition.prev()
						// rendition.hooks.render.trigger(pageAnimation);
					} catch (err) {
						console.error(err)
						toast.error('Something went wrong!')
					}
				}
			},
		}),
		[rendition, book, ref],
	)

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
			/**
			 *
			 * @param payload The payload to send to the server. Contains all of the information
			 * needed to update the progress of the epub.
			 * @returns A promise which resolves to the updated progress information.
			 */
			const handleUpdateProgress = async (payload: UpdateEpubProgress) => {
				if (!epub) return

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

	const swipeHandlers = useSwipeable({
		onSwipedLeft: controls.next,
		onSwipedRight: controls.prev,
		preventScrollOnSwipe: true,
	})

	if (isLoading) {
		return null
	}

	return (
		<EpubControls
			controls={controls}
			fontSize={fontSize}
			swipeHandlers={swipeHandlers}
			location={{ ...location, chapter }}
			epub={epub!}
		>
			<div className="h-full w-full" ref={ref} />
		</EpubControls>
	)
}
