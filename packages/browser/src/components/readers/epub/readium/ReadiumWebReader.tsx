import type { OnDecorationActivatedEvent } from '@readium/navigator'
import type { BasicTextSelection } from '@readium/navigator-html-injectables'
import { Link, Locator } from '@readium/shared'
import { queryClient, useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import {
	Bookmark,
	EpubProgressInput,
	graphql,
	ReadingDirection,
	type ReadiumLocator,
} from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import type { EpubSearchResponse } from '@stump/sdk'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebounce } from 'rooks'
import { toast } from 'sonner'

import Spinner from '@/components/Spinner'
import { useTheme } from '@/hooks'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'
import { useBookTimer } from '@/stores/reader'

import AnnotationDialog from '../annotations/AnnotationDialog'
import { annotationsToDecorations } from '../annotations/decorations'
import { enrichSelectionLocator, extractSelectionContext } from '../annotations/locator'
import SelectionToolbar from '../annotations/SelectionToolbar'
import type { AnnotationSelection, EpubAnnotation } from '../annotations/types'
import { ANNOTATION_DECORATION_GROUP } from '../annotations/types'
import {
	graphqlAnnotationToEpubAnnotation,
	useEpubAnnotations,
} from '../annotations/useEpubAnnotations'
import { EpubContent, type ReaderLocator } from '../context'
import EpubReaderContainer from '../EpubReaderContainer'
import {
	hrefsMatch,
	resolveInitialLocator,
	toolkitLocatorToInput,
	toolkitLocatorToReaderLocator,
} from './locator'
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
			annotations {
				id
				mediaId
				userId
				annotationText
				createdAt
				updatedAt
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
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const { isDarkVariant } = useTheme()
	const containerRef = useRef<HTMLDivElement>(null)
	const viewportRef = useRef<HTMLDivElement>(null)
	const [stageWidth, setStageWidth] = useState<number | undefined>(undefined)

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
			columnCount,
			pageMargins,
		},
	} = useBookPreferences({ book: ebook.media })

	// Measures the viewport parent — i.e. the parent of the element Readium itself treats
	// as its viewport (`containerRef`'s parent, see `useReadiumNavigator`). Keeping the
	// measurement one level up means it is unaffected by the centering max-width we apply to
	// that inner element below, so there is no feedback loop between measured width and layout.
	useEffect(() => {
		const el = viewportRef.current
		if (!el) return undefined

		setStageWidth(el.clientWidth || undefined)

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0]
			if (entry) {
				setStageWidth(entry.contentRect.width)
			}
		})
		observer.observe(el)
		return () => observer.disconnect()
	}, [])

	const timer = useBookTimer(ebook.media?.id || '', {
		initial: ebook.media?.readProgress?.elapsedSeconds,
		enabled: trackElapsedTime,
	})

	const lastSyncedElapsedRef = useRef(ebook.media?.readProgress?.elapsedSeconds ?? 0)
	const lastSyncedLocatorRef = useRef<ReadiumLocator | null>(
		ebook.media?.readProgress?.locator ?? null,
	)
	const hasReachedEndRef = useRef(false)

	const [openState, setOpenState] = useState<LoadState>({ status: 'loading' })
	const [currentLocator, setCurrentLocator] = useState<Locator | null>(null)
	const [localProgress, setLocalProgress] = useState<number | null>(
		ebook.media?.readProgress?.percentageCompleted != null
			? Number(ebook.media.readProgress.percentageCompleted)
			: null,
	)

	// Intentionally does not invalidate `['readiumWebReader', id]` on every success — progress
	// mutations fire on (debounced) every position change, and refetching the reader's own
	// suspense query that often would cause avoidable re-renders / flicker while reading.
	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			lastSyncedElapsedRef.current = timer.getCurrentTime()
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
				columnCount,
				pageMargins,
				stageWidth,
			}),
		[
			fontSize,
			lineHeight,
			fontFamily,
			readingMode,
			isDarkVariant,
			columnCount,
			pageMargins,
			stageWidth,
		],
	)

	// Open the publication once per book id
	useEffect(() => {
		const abort = new AbortController()
		setOpenState({ status: 'loading' })

		void (async () => {
			try {
				const opened = await openStumpPublication(sdk, id, abort.signal)
				if (abort.signal.aborted) return

				const percentageCompleted = ebook.media?.readProgress?.percentageCompleted
					? Number(ebook.media.readProgress.percentageCompleted)
					: null

				let initialLocator = isIncognito
					? undefined
					: resolveInitialLocator({
							positions: opened.positions,
							storedLocator: ebook.media?.readProgress?.locator,
							percentageCompleted,
						})

				setOpenState({ status: 'ready', opened, initialLocator })
			} catch (error) {
				if (abort.signal.aborted) return
				console.error('[ReadiumWebReader] open failed', error)
				setOpenState({
					status: 'error',
					message: error instanceof Error ? error.message : t('epubReader.errors.openFailed'),
				})
			}
		})()

		return () => abort.abort()
		// Only re-open when the book id or auth surface changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, sdk, isIncognito, t])

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
				locator: payload,
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

	// Flush any pending debounced progress write on unmount so recent reading is not lost.
	// `useDebounce` (rooks) returns a lodash `DebouncedFunc`, which synchronously invokes the
	// pending call (if any) rather than waiting out the remaining debounce window.
	useEffect(() => {
		return () => {
			if (!isIncognito) {
				debouncedPersist.flush()
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

	const toc = useMemo(() => {
		const fromManifest = opened?.publication.manifest.toc?.items
		if (fromManifest?.length) {
			return linksToToc(fromManifest)
		}
		return parseToc(ebook.toc)
	}, [opened, ebook.toc])

	const initialAnnotations = useMemo<EpubAnnotation[]>(
		() => (ebook.annotations ?? []).map(graphqlAnnotationToEpubAnnotation),
		[ebook.annotations],
	)

	const {
		annotations,
		createAnnotation,
		updateAnnotation,
		deleteAnnotation,
		isPending: isAnnotationMutationPending,
	} = useEpubAnnotations({ mediaId: id, isIncognito, initialAnnotations })

	const [selection, setSelection] = useState<AnnotationSelection | null>(null)
	const [dialogState, setDialogState] = useState<
		| { mode: 'create'; selection: AnnotationSelection }
		| { mode: 'edit'; annotationId: string }
		| null
	>(null)

	const onTextSelected = useCallback(
		(sel: BasicTextSelection) => {
			if (!sel.text || !containerRef.current) return

			// Capture surrounding text context immediately, before anything else
			// can modify the DOM selection. Readium's web navigator only populates
			// text.highlight — without before/after, matchQuote() always anchors
			// to the first occurrence of repeated text in the chapter.
			const context = extractSelectionContext(containerRef.current, sel.targetFrameSrc)

			const readingOrderHrefs =
				opened?.publication.manifest.readingOrder?.items.map((link) => link.href) ?? []
			const chapterTitleFromToc = findChapterTitle(sel.locator?.href ?? '', toc)
			const locator = enrichSelectionLocator({
				selectionLocator: sel.locator ?? null,
				selectedText: sel.text,
				positions: opened?.positions ?? EMPTY_POSITIONS,
				readingOrderHrefs,
				chapterTitleFromToc,
			})
			if (!locator) return

			if (context) {
				locator.text = {
					...locator.text,
					before: context.before ?? locator.text?.before,
					after: context.after ?? locator.text?.after,
				}
			}

			const containerRect = containerRef.current.getBoundingClientRect()
			setSelection({
				rect: {
					x: containerRect.left + sel.x,
					y: containerRect.top + sel.y,
					width: sel.width,
					height: sel.height,
				},
				locator,
				text: sel.text,
			})
		},
		[opened, toc],
	)

	const onDecorationActivated = useCallback((event: OnDecorationActivatedEvent): boolean => {
		if (event.group !== ANNOTATION_DECORATION_GROUP) return false
		setDialogState({ mode: 'edit', annotationId: event.decoration.id })
		return true
	}, [])

	const dismissToolbar = useCallback(() => {
		setSelection(null)
	}, [])

	const { loadState, api } = useReadiumNavigator({
		containerRef,
		publication: opened?.publication ?? null,
		positions: opened?.positions ?? EMPTY_POSITIONS,
		initialLocator,
		allowedDomains: opened?.allowedDomains ?? EMPTY_DOMAINS,
		preferences,
		onPositionChanged: handlePositionChanged,
		onTextSelected,
		onTextCleared: dismissToolbar,
		onDecorationActivated,
	})

	useEffect(() => {
		api.applyDecorations(annotationsToDecorations(annotations), ANNOTATION_DECORATION_GROUP)
	}, [api, annotations])

	// A navigator position change means the reader moved away from wherever the
	// selection toolbar was anchored, so drop it rather than show a stale rect.
	useEffect(() => {
		setSelection(null)
	}, [currentLocator])

	const clearSelectionState = useCallback(() => {
		setSelection(null)
		api.clearSelection()
	}, [api])

	const handleHighlightSelection = useCallback(() => {
		if (!selection) return
		void createAnnotation(selection.locator)
		clearSelectionState()
	}, [selection, createAnnotation, clearSelectionState])

	const handleAddNoteFromSelection = useCallback(() => {
		if (!selection) return
		setDialogState({ mode: 'create', selection })
	}, [selection])

	const activeAnnotation = useMemo(
		() =>
			dialogState?.mode === 'edit'
				? (annotations.find((annotation) => annotation.id === dialogState.annotationId) ?? null)
				: null,
		[dialogState, annotations],
	)

	const handleCloseDialog = useCallback(() => {
		setDialogState(null)
	}, [])

	const handleSaveAnnotation = useCallback(
		(noteText: string) => {
			if (dialogState?.mode === 'create') {
				void createAnnotation(dialogState.selection.locator, noteText || undefined)
				clearSelectionState()
			} else if (dialogState?.mode === 'edit' && activeAnnotation) {
				void updateAnnotation(activeAnnotation.id, noteText || null)
			}
			setDialogState(null)
		},
		[
			dialogState,
			selection,
			activeAnnotation,
			createAnnotation,
			updateAnnotation,
			clearSelectionState,
		],
	)

	const handleDeleteAnnotation = useCallback(() => {
		if (activeAnnotation) {
			void deleteAnnotation(activeAnnotation.id)
		}
		setDialogState(null)
	}, [activeAnnotation, deleteAnnotation])

	const existingBookmarks = useMemo(() => {
		const map: Record<string, Bookmark> = {}
		for (const bookmark of ebook.bookmarks ?? []) {
			const key = bookmark.locator?.href
				? `${packageKey(bookmark.locator.href)}:${bookmark.locator.locations?.position ?? ''}`
				: bookmark.id
			map[key] = bookmark
		}
		return map
	}, [ebook.bookmarks])

	const chapterMeta = useMemo(() => {
		const chapterTitle = findChapterTitle(currentLocator?.href ?? '', toc) ?? currentLocator?.title
		const readingOrder = opened?.publication.manifest.readingOrder?.items ?? []
		const sectionSpineIndex = currentLocator
			? readingOrder.findIndex((l) => hrefsMatch(l.href, currentLocator.href))
			: -1
		const locatorPosition = currentLocator?.locations.position
		const totalPositions = opened?.positions.length

		const readerLocator = currentLocator
			? toolkitLocatorToReaderLocator(currentLocator, chapterTitle ?? undefined)
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
		api.goForward()
	}, [api])

	const onPaginateBackward = useCallback(() => {
		api.goBackward()
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
									cssSelector: locator.locations.cssSelector ?? null,
									partialCfi: locator.locations.partialCfi ?? null,
								}
							: null,
						text: locator.text ?? null,
					},
				})
				if (toolkit) {
					api.go(toolkit)
				}
			} catch (err) {
				console.error(err)
				toast.error(t('epubReader.errors.navigateFailed'))
			}
		},
		[api, opened, t],
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
				api.goLink(item)
			}
		},
		[api, opened],
	)

	const getLocatorPreviewText = useCallback((locator: ReaderLocator) => {
		return locator.text?.highlight ?? locator.chapterTitle ?? locator.title ?? null
	}, [])

	/**
	 * Server-backed whole-book search — never downloads the EPUB archive, just queries
	 * the manifest-scoped search endpoint for Readium locators.
	 */
	const searchBook = useCallback(
		(
			query: string,
			opts?: { cursor?: string; signal?: AbortSignal },
		): Promise<EpubSearchResponse> =>
			sdk.epub.search({ id, q: query, cursor: opts?.cursor, signal: opts?.signal }),
		[sdk, id],
	)

	/** Keyboard navigation — RTL aware, ignores keystrokes aimed at inputs/dialogs */
	useEffect(() => {
		const isLtr = readingDirection !== ReadingDirection.Rtl

		const handleKeyDown = (event: KeyboardEvent) => {
			if (isEditableTarget(event.target)) return

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
					annotations,
					chapter: chapterMeta,
					toc,
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
				searchBook,
				canGoForward: api.canGoForward,
				canGoBackward: api.canGoBackward,
			}}
		>
			{/*
			  This outer div is the "viewport parent" — measured independently via
			  ResizeObserver above to decide the effective column count, and unaffected by
			  the centering max-width applied to the inner div below. md:px-12 matches the
			  chevron gutters (w-12) rendered by EpubNavigationControls, one level up.
			*/}
			<div
				ref={viewportRef}
				className="min-h-0 md:px-12 relative h-full w-full flex-1 self-stretch overflow-hidden"
			>
				{/*
			  Readium observes *this* element (container.parentElement) and sets the
			  inner host's width. Keep it CSS-sized and stable — AutoSizer 0×0 flashes +
			  React size state fight that ResizeObserver path. Readium handles column
			  width and pagination internally via ReadiumCSS.paginate(), so no
			  max-width constraint is needed here. The epub background color is set on
			  this parent so it fills full width even in paged mode, where Readium
			  narrows the container to the column reading width.
			*/}
				<div
					className="relative mx-auto h-full w-full overflow-hidden"
					style={{ backgroundColor: isDarkVariant ? '#161719' : '#ffffff' }}
				>
					<div ref={containerRef} className="relative mx-auto h-full w-full overflow-hidden" />
				</div>

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

			{selection && !isIncognito && (
				<SelectionToolbar
					rect={selection.rect}
					onHighlight={handleHighlightSelection}
					onAddNote={handleAddNoteFromSelection}
				/>
			)}

			<AnnotationDialog
				open={dialogState !== null}
				mode={dialogState?.mode ?? 'create'}
				quotedText={
					dialogState?.mode === 'edit'
						? activeAnnotation?.locator.text?.highlight
						: dialogState?.selection.text
				}
				initialNote={dialogState?.mode === 'edit' ? activeAnnotation?.annotationText : undefined}
				isPending={isAnnotationMutationPending}
				onOpenChange={(open) => !open && handleCloseDialog()}
				onSave={handleSaveAnnotation}
				onDelete={dialogState?.mode === 'edit' ? handleDeleteAnnotation : undefined}
			/>
		</EpubReaderContainer>
	)
}

/** Whether a keydown target is an editable surface that should swallow reader shortcuts. */
function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false
	const tag = target.tagName
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
	if (target.isContentEditable) return true
	return !!target.closest('[role="dialog"]')
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
