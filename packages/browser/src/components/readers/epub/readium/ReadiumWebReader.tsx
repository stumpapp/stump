import { Link, Locator } from '@readium/shared'
import { queryClient, useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import {
	Bookmark,
	EpubProgressInput,
	graphql,
	ReadingDirection,
	type ReadiumLocator,
} from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebounce } from 'rooks'
import { toast } from 'sonner'

import Spinner from '@/components/Spinner'
import { useTheme } from '@/hooks'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'
import { useBookTimer } from '@/stores/reader'

import { EpubContent, type ReaderLocator } from '../context'
import EpubReaderContainer from '../EpubReaderContainer'
import { hrefsMatch, resolveInitialLocator, toolkitLocatorToInput } from './locator'
import { type OpenedPublication, openStumpPublication } from './openPublication'
import { bookPreferencesToEpubPreferences } from './preferences'
import { useReadiumNavigator } from './useReadiumNavigator'

type Props = {
	id: string
	isIncognito: boolean
}

const query = graphql(`
	query ReadiumWebReader($id: ID!) {
		epubById(id: $id) {
			mediaId
			toc
			bookmarks {
				id
				userId
				epubcfi
				mediaId
				previewContent
				createdAt
				locator {
					chapterTitle
					href
					title
					type
					locations {
						fragments
						progression
						position
						totalProgression
						cssSelector
						partialCfi
					}
					text {
						after
						before
						highlight
					}
				}
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
					locator {
						chapterTitle
						href
						title
						type
						locations {
							fragments
							progression
							position
							totalProgression
							cssSelector
							partialCfi
						}
						text {
							after
							before
							highlight
						}
					}
				}
				libraryConfig {
					defaultReadingImageScaleFit
					defaultReadingMode
					defaultReadingDir
				}
				nextInSeries(pagination: { cursor: { limit: 1 } }) {
					nodes {
						id
						name: resolvedName
						thumbnail {
							url
						}
					}
				}
			}
		}
	}
`)

const mutation = graphql(`
	mutation UpdateReadiumEpubProgress($id: ID!, $input: MediaProgressInput!) {
		updateMediaProgress(id: $id, input: $input) {
			__typename
		}
	}
`)

type LoadState =
	| { status: 'loading' }
	| { status: 'ready'; opened: OpenedPublication; initialLocator?: Locator }
	| { status: 'error'; message: string }

const EMPTY_POSITIONS: Locator[] = []
const EMPTY_DOMAINS: string[] = []

/**
 * Production Readium Web EPUB reader — streams via Stump RWPM.
 */
export default function ReadiumWebReader({ id, isIncognito }: Props) {
	const { sdk } = useSDK()
	const { isDarkVariant } = useTheme()
	const containerRef = useRef<HTMLDivElement>(null)

	const {
		data: { epubById: ebook },
	} = useSuspenseGraphQL(query, ['readiumWebReader', id], {
		id: id || '',
	})

	const {
		bookPreferences: {
			fontSize,
			lineHeight,
			fontFamily,
			readingMode,
			readingDirection,
			trackElapsedTime,
		},
	} = useBookPreferences({ book: ebook.media })

	const timer = useBookTimer(ebook.media?.id || '', {
		initial: ebook.media?.readProgress?.elapsedSeconds,
		enabled: trackElapsedTime,
	})

	const lastSyncedElapsedRef = useRef(ebook.media?.readProgress?.elapsedSeconds ?? 0)
	const lastSyncedLocatorRef = useRef<ReadiumLocator | null>(
		ebook.media?.readProgress?.locator ?? null,
	)
	const latestLocatorRef = useRef<Locator | null>(null)
	const hasReachedEndRef = useRef(false)

	const [openState, setOpenState] = useState<LoadState>({ status: 'loading' })
	const [currentLocator, setCurrentLocator] = useState<Locator | null>(null)
	const [localProgress, setLocalProgress] = useState<number | null>(
		ebook.media?.readProgress?.percentageCompleted != null
			? Number(ebook.media.readProgress.percentageCompleted)
			: null,
	)

	const client = useQueryClient()
	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			lastSyncedElapsedRef.current = timer.getCurrentTime()
			client.invalidateQueries({
				queryKey: ['readiumWebReader', id],
			})
		},
	})

	const preferences = useMemo(
		() =>
			bookPreferencesToEpubPreferences({
				fontSize,
				lineHeight,
				fontFamily,
				readingMode,
				isDarkVariant,
			}),
		[fontSize, lineHeight, fontFamily, readingMode, isDarkVariant],
	)

	// Open the publication once per book id
	useEffect(() => {
		const abort = new AbortController()
		setOpenState({ status: 'loading' })

		void (async () => {
			try {
				const opened = await openStumpPublication(sdk, id, abort.signal)
				if (abort.signal.aborted) return

				const initialLocator = isIncognito
					? undefined
					: resolveInitialLocator({
							positions: opened.positions,
							storedLocator: ebook.media?.readProgress?.locator,
							percentageCompleted: ebook.media?.readProgress?.percentageCompleted
								? Number(ebook.media.readProgress.percentageCompleted)
								: null,
						})

				setOpenState({ status: 'ready', opened, initialLocator })
			} catch (error) {
				if (abort.signal.aborted) return
				console.error('[ReadiumWebReader] open failed', error)
				setOpenState({
					status: 'error',
					message: error instanceof Error ? error.message : 'Failed to open EPUB with Readium.',
				})
			}
		})()

		return () => abort.abort()
		// Only re-open when the book id or auth surface changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, sdk, isIncognito])

	const updateProgress = useCallback(
		(input: EpubProgressInput) => {
			if (isIncognito) return

			const totalSeconds = timer.getCurrentTime()
			const delta = Math.max(0, totalSeconds - lastSyncedElapsedRef.current)

			mutate({
				id: ebook.media?.id || '',
				input: {
					epub: {
						...input,
						elapsedSecondsDelta: delta > 0 ? delta : undefined,
					},
				},
			})
		},
		[mutate, ebook.media?.id, isIncognito, timer],
	)

	const persistLocator = useCallback(
		(locator: Locator, opts?: { isComplete?: boolean }) => {
			const totalProgression = locator.locations.totalProgression
			const percentage =
				opts?.isComplete || (totalProgression != null && totalProgression >= 0.999)
					? 1
					: (totalProgression ?? localProgress ?? 0)

			const chapterTitle = findChapterTitle(locator.href, parseToc(ebook.toc)) ?? locator.title
			const payload = toolkitLocatorToInput(locator, chapterTitle)
			lastSyncedLocatorRef.current = {
				chapterTitle: payload.chapterTitle ?? '',
				href: payload.href,
				title: payload.title,
				type: payload.type ?? 'application/xhtml+xml',
				locations: payload.locations
					? {
							fragments: payload.locations.fragments,
							progression: payload.locations.progression,
							position: payload.locations.position,
							totalProgression: payload.locations.totalProgression,
							cssSelector: payload.locations.cssSelector,
							partialCfi: payload.locations.partialCfi,
						}
					: null,
				text: payload.text ?? null,
			}

			updateProgress({
				locator: { readium: payload },
				percentage,
				isComplete: opts?.isComplete || percentage >= 1,
			})

			setLocalProgress(percentage)
		},
		[ebook.toc, localProgress, updateProgress],
	)

	const debouncedPersist = useDebounce((locator: Locator) => {
		persistLocator(locator)
	}, 500)

	const handlePositionChanged = useCallback(
		(locator: Locator) => {
			latestLocatorRef.current = locator
			setCurrentLocator(locator)

			const total = locator.locations.totalProgression
			if (total != null) {
				setLocalProgress(total)
			}

			const atEnd = total != null && total >= 0.999
			if (atEnd && !hasReachedEndRef.current) {
				hasReachedEndRef.current = true
				persistLocator(locator, { isComplete: true })
				return
			}
			if (!atEnd) {
				hasReachedEndRef.current = false
			}

			debouncedPersist(locator)
		},
		[debouncedPersist, persistLocator],
	)

	// Flush latest progress on unmount so elapsed time is not lost
	useEffect(() => {
		return () => {
			const locator = latestLocatorRef.current
			if (locator && !isIncognito) {
				persistLocator(locator)
			}
			void Promise.all([
				queryClient.invalidateQueries({ queryKey: ['bookOverview', id], exact: false }),
				queryClient.invalidateQueries({ queryKey: ['keepReading'], exact: false }),
			])
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, isIncognito])

	const opened = openState.status === 'ready' ? openState.opened : null
	const initialLocator = openState.status === 'ready' ? openState.initialLocator : undefined

	const { loadState, api } = useReadiumNavigator({
		containerRef,
		publication: opened?.publication ?? null,
		positions: opened?.positions ?? EMPTY_POSITIONS,
		initialLocator,
		allowedDomains: opened?.allowedDomains ?? EMPTY_DOMAINS,
		preferences,
		onPositionChanged: handlePositionChanged,
	})

	const existingBookmarks = useMemo(() => {
		const map: Record<string, Bookmark> = {}
		for (const bookmark of ebook.bookmarks ?? []) {
			const key = bookmark.locator?.href
				? `${packageKey(bookmark.locator.href)}:${bookmark.locator.locations?.position ?? ''}`
				: (bookmark.epubcfi ?? bookmark.id)
			map[key] = bookmark
		}
		return map
	}, [ebook.bookmarks])

	const toc = useMemo(() => {
		const fromManifest = opened?.publication.manifest.toc?.items
		if (fromManifest?.length) {
			return linksToToc(fromManifest)
		}
		return parseToc(ebook.toc)
	}, [opened, ebook.toc])

	const chapterMeta = useMemo(() => {
		const chapterTitle = findChapterTitle(currentLocator?.href ?? '', toc) ?? currentLocator?.title
		const readingOrder = opened?.publication.manifest.readingOrder?.items ?? []
		const sectionSpineIndex = currentLocator
			? readingOrder.findIndex((l) => hrefsMatch(l.href, currentLocator.href))
			: -1
		const locatorPosition = currentLocator?.locations.position
		const totalPositions = opened?.positions.length

		const input = currentLocator
			? toolkitLocatorToInput(currentLocator, chapterTitle ?? undefined)
			: null

		const readerLocator: ReaderLocator | null = input
			? {
					href: input.href,
					type: input.type || 'application/xhtml+xml',
					title: input.title ?? undefined,
					chapterTitle: input.chapterTitle ?? undefined,
					locations: input.locations
						? {
								fragments: input.locations.fragments,
								progression: input.locations.progression,
								position: input.locations.position,
								totalProgression: input.locations.totalProgression,
							}
						: null,
					text: input.text
						? {
								after: input.text.after,
								before: input.text.before,
								highlight: input.text.highlight,
							}
						: null,
				}
			: null

		return {
			name: chapterTitle,
			position: sectionSpineIndex >= 0 ? sectionSpineIndex : undefined,
			sectionSpineIndex: sectionSpineIndex >= 0 ? sectionSpineIndex : undefined,
			totalProgression: currentLocator?.locations.totalProgression,
			locatorPosition: locatorPosition ?? undefined,
			totalPositions,
			currentLocator: readerLocator,
		}
	}, [currentLocator, toc, opened])

	const onPaginateForward = useCallback(() => {
		api?.goForward()
	}, [api])

	const onPaginateBackward = useCallback(() => {
		api?.goBackward()
	}, [api])

	const onGoToLocator = useCallback(
		(locator: ReaderLocator) => {
			if (!opened) return
			try {
				const toolkit = resolveInitialLocator({
					positions: opened.positions,
					storedLocator: {
						chapterTitle: locator.chapterTitle ?? '',
						href: locator.href,
						title: locator.title,
						type: locator.type || 'application/xhtml+xml',
						locations: locator.locations
							? {
									fragments: locator.locations.fragments,
									progression: locator.locations.progression,
									position: locator.locations.position,
									totalProgression: locator.locations.totalProgression,
									cssSelector: null,
									partialCfi: null,
								}
							: null,
						text: locator.text ?? null,
					},
				})
				if (toolkit) {
					api?.go(toolkit)
				}
			} catch (err) {
				console.error(err)
				toast.error('Failed to navigate to location')
			}
		},
		[api, opened],
	)

	const onLinkClick = useCallback(
		(href: string) => {
			if (!opened || !api) return
			const readingOrder = opened.publication.manifest.readingOrder?.items ?? []
			const resources = opened.publication.manifest.resources?.items ?? []
			const tocItems = flattenTocLinks(opened.publication.manifest.toc?.items ?? [])
			const match =
				tocItems.find((l) => hrefsMatch(l.href, href) || l.href.endsWith(href)) ??
				readingOrder.find((l) => hrefsMatch(l.href, href) || l.href.endsWith(href)) ??
				resources.find((l) => hrefsMatch(l.href, href) || l.href.endsWith(href))

			if (match) {
				api.goLink(match)
				return
			}

			// Fall back to first position with matching package path
			const position = opened.positions.find((p) => hrefsMatch(p.href, href))
			if (position) {
				api.go(position)
				return
			}

			toast.error('Could not find that location in the publication')
		},
		[api, opened],
	)

	const jumpToSection = useCallback(
		(section: number) => {
			const item = opened?.publication.manifest.readingOrder?.items?.[section]
			if (item) {
				api?.goLink(item)
			}
		},
		[api, opened],
	)

	const getLocatorPreviewText = useCallback(async (locator: ReaderLocator) => {
		return locator.text?.highlight ?? locator.chapterTitle ?? locator.title ?? null
	}, [])

	/** Keyboard navigation — RTL aware */
	useEffect(() => {
		if (!api) return
		const isLtr = readingDirection !== ReadingDirection.Rtl

		const handleKeyDown = (event: KeyboardEvent) => {
			const nextKey = isLtr ? 'ArrowRight' : 'ArrowLeft'
			const prevKey = isLtr ? 'ArrowLeft' : 'ArrowRight'
			if (event.key === nextKey) {
				event.preventDefault()
				api.goForward()
			} else if (event.key === prevKey) {
				event.preventDefault()
				api.goBackward()
			}
		}

		window.addEventListener('keydown', handleKeyDown, { capture: true })
		return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
	}, [api, readingDirection])

	if (!ebook.media) {
		return null
	}

	const isLoading =
		openState.status === 'loading' ||
		(openState.status === 'ready' && loadState.status === 'loading')
	const errorMessage =
		openState.status === 'error'
			? openState.message
			: loadState.status === 'error'
				? loadState.message
				: null

	return (
		<EpubReaderContainer
			readerMeta={{
				bookEntity: ebook.media,
				bookMeta: {
					bookmarks: existingBookmarks,
					chapter: chapterMeta,
					toc,
					sectionLengths: {},
				},
				progress: localProgress,
			}}
			controls={{
				getLocatorPreviewText,
				onGoToLocator,
				onLinkClick,
				onPaginateBackward,
				onPaginateForward,
				jumpToSection,
			}}
		>
			{/*
			  Readium observes this viewport (container.parentElement) and sets the
			  inner host's width. Keep the viewport CSS-sized and stable — AutoSizer
			  0×0 flashes + React size state fight that ResizeObserver path.
			  md:px-12 matches the fixed side chevron gutters (w-12).
			*/}
			<div className="min-h-0 md:px-12 relative h-full w-full flex-1 self-stretch overflow-hidden">
				<div ref={containerRef} className="relative h-full w-full overflow-hidden" />

				{isLoading && (
					<div className="inset-0 absolute z-10 flex items-center justify-center bg-background/80">
						<Spinner />
					</div>
				)}

				{errorMessage && (
					<div className="inset-0 gap-2 p-6 absolute z-10 flex flex-col items-center justify-center bg-background text-center">
						<p className="text-sm text-foreground">{errorMessage}</p>
					</div>
				)}
			</div>
		</EpubReaderContainer>
	)
}

function packageKey(href: string): string {
	try {
		const url = new URL(href, 'https://stump.invalid')
		const marker = '/resource/'
		const idx = url.pathname.indexOf(marker)
		if (idx >= 0) return decodeURIComponent(url.pathname.slice(idx + marker.length))
		return decodeURIComponent(url.pathname.replace(/^\//, ''))
	} catch {
		return href.split('#')[0] ?? href
	}
}

function parseToc(toc: string[] | null | undefined): EpubContent[] {
	if (!toc) return []
	return toc
		.map((item) => {
			try {
				return JSON.parse(item) as EpubContent
			} catch {
				return null
			}
		})
		.filter((item): item is EpubContent => item !== null)
}

function linksToToc(links: Link[], playOrder = { value: 0 }): EpubContent[] {
	return links.map((link) => {
		const order = playOrder.value++
		return {
			label: link.title || link.href,
			content: link.href,
			play_order: order,
			children: link.children?.items ? linksToToc(link.children.items, playOrder) : [],
		}
	})
}

function flattenTocLinks(links: Link[]): Link[] {
	const out: Link[] = []
	for (const link of links) {
		out.push(link)
		if (link.children?.items?.length) {
			out.push(...flattenTocLinks(link.children.items))
		}
	}
	return out
}

function findChapterTitle(href: string, toc: EpubContent[]): string | undefined {
	if (!href) return undefined
	const stack = [...toc]
	while (stack.length) {
		const item = stack.shift()!
		if (hrefsMatch(item.content, href) || item.content.endsWith(href.split('#')[0] ?? '')) {
			return item.label.trim()
		}
		stack.push(...item.children)
	}
	return undefined
}
