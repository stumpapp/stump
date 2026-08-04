import { cn, Command } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import type { EpubSearchResult } from '@stump/sdk'
import { Loader2, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Spinner from '@/components/Spinner'

import { useEpubReaderContext } from '../context'
import { searchResultToReaderLocator } from '../readium/locator'
import ControlButton from './ControlButton'

type ResultGroup = {
	heading: string
	items: EpubSearchResult[]
}

/**
 * Groups server search results by chapter title (falling back to the locator title, then
 * spine position), preserving the order in which each group first appears.
 */
export function groupByChapter(
	results: EpubSearchResult[],
	sectionLabel = (position: number) => `Section ${position}`,
): ResultGroup[] {
	const order: string[] = []
	const groups = new Map<string, EpubSearchResult[]>()

	for (const result of results) {
		const heading =
			result.locator.chapterTitle?.trim() ||
			result.locator.title?.trim() ||
			sectionLabel(result.spineIndex + 1)

		const existing = groups.get(heading)
		if (existing) {
			existing.push(result)
		} else {
			groups.set(heading, [result])
			order.push(heading)
		}
	}

	return order.map((heading) => ({ heading, items: groups.get(heading) ?? [] }))
}

export default function SearchCommand() {
	const { t } = useLocaleContext()
	const {
		controls: { searchBook, onGoToLocator },
	} = useEpubReaderContext()

	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)

	const [isSearching, setIsSearching] = useState(false)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [hasSearched, setHasSearched] = useState(false)

	const [serverResults, setServerResults] = useState<EpubSearchResult[]>([])
	const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)

	// Guards against a slow, superseded request overwriting the results of a newer one.
	const requestIdRef = useRef(0)
	const abortControllerRef = useRef<AbortController | null>(null)

	const abortInFlightRequest = useCallback(() => {
		abortControllerRef.current?.abort()
		abortControllerRef.current = null
	}, [])

	const resetResults = useCallback(() => {
		setServerResults([])
		setNextCursor(undefined)
		setHasSearched(false)
		setError(null)
	}, [])

	const runServerSearch = useCallback(
		async (searchQuery: string, opts?: { cursor?: string }) => {
			if (!searchBook) return

			abortInFlightRequest()
			const controller = new AbortController()
			abortControllerRef.current = controller
			const requestId = ++requestIdRef.current

			const isLoadMore = !!opts?.cursor
			if (isLoadMore) {
				setIsLoadingMore(true)
			} else {
				setIsSearching(true)
				setError(null)
			}

			try {
				const response = await searchBook(searchQuery, {
					cursor: opts?.cursor,
					signal: controller.signal,
				})
				// A newer request has since started — ignore this now-stale response.
				if (requestId !== requestIdRef.current) return

				setServerResults((prev) => (isLoadMore ? [...prev, ...response.results] : response.results))
				setNextCursor(response.nextCursor ?? undefined)
				setHasSearched(true)
			} catch (err) {
				if (controller.signal.aborted || requestId !== requestIdRef.current) return
				console.error('[SearchCommand] search failed', err)
				setError(t('epubReader.search.failed'))
			} finally {
				if (requestId === requestIdRef.current) {
					setIsSearching(false)
					setIsLoadingMore(false)
				}
			}
		},
		[searchBook, abortInFlightRequest, t],
	)

	const doSearch = useCallback(() => {
		const trimmed = query.trim()
		if (!trimmed) return
		void runServerSearch(trimmed)
	}, [query, runServerSearch])

	const loadMore = useCallback(() => {
		const trimmed = query.trim()
		if (!trimmed || !nextCursor || isLoadingMore) return
		void runServerSearch(trimmed, { cursor: nextCursor })
	}, [query, nextCursor, isLoadingMore, runServerSearch])

	const handleGoToResult = useCallback(
		(result: EpubSearchResult) => {
			onGoToLocator(searchResultToReaderLocator(result))
			setOpen(false)
		},
		[onGoToLocator],
	)

	// Abort any in-flight request and drop stale results once the query is cleared.
	useEffect(() => {
		if (!query.trim()) {
			abortInFlightRequest()
			resetResults()
		}
	}, [query, abortInFlightRequest, resetResults])

	// Abort on close so a response for a closed dialog never lands.
	useEffect(() => {
		if (!open) {
			abortInFlightRequest()
		}
	}, [open, abortInFlightRequest])

	// Abort on unmount.
	useEffect(() => {
		return () => abortInFlightRequest()
	}, [abortInFlightRequest])

	/**
	 * An effect to handle keyboard shortcuts for opening and closing the search dialog.
	 * A few workarounds are added to stop the propagation of the arrow keys.
	 */
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				setOpen((open) => !open)
			} else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
				e.stopPropagation()
			} else if (e.key === 'Escape') {
				setOpen(false)
			} else if (e.key === 'Enter' && open) {
				// The search input handles Enter itself; skip to avoid double submits.
				if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return
				doSearch()
			}
		}

		document.addEventListener('keydown', onKeyDown)
		return () => document.removeEventListener('keydown', onKeyDown)
	}, [open, doSearch])

	const serverGroups = useMemo(
		() => groupByChapter(serverResults, (position) => t('epubReader.search.section', { position })),
		[serverResults, t],
	)

	const renderContent = () => {
		if (isSearching) {
			return (
				<div className="h-32 flex w-full items-center justify-center">
					<Spinner />
				</div>
			)
		}
		if (!hasSearched) return null
		if (error) return <Command.Empty>{error}</Command.Empty>
		if (!serverResults.length)
			return <Command.Empty>{t('epubReader.search.noResults')}</Command.Empty>

		return (
			<>
				{serverGroups.map((group) => (
					<Command.Group key={group.heading} heading={group.heading}>
						{group.items.map((result, idx) => (
							<Command.Item
								key={`${result.locator.href}:${result.locator.locations.position}:${idx}`}
								value={`${result.locator.href}:${result.locator.locations.position}:${idx}`}
								onSelect={() => handleGoToResult(result)}
								className="space-y-1 flex flex-col"
							>
								<p className="w-full">
									{result.locator.text.before}
									<span className="bg-yellow-400 text-gray-900">
										{result.locator.text.highlight}
									</span>
									{result.locator.text.after}
								</p>
							</Command.Item>
						))}
					</Command.Group>
				))}
				{nextCursor && (
					<Command.Item
						value="__load-more__"
						disabled={isLoadingMore}
						onSelect={loadMore}
						className="justify-center text-center text-muted-foreground"
					>
						{isLoadingMore ? (
							<span className="gap-x-2 flex items-center">
								<Loader2 className="h-3 w-3 animate-spin" />
								{t('epubReader.search.loadingMore')}
							</span>
						) : (
							t('epubReader.search.loadMore')
						)}
					</Command.Item>
				)}
			</>
		)
	}

	if (!searchBook) {
		return null
	}

	return (
		<>
			<ControlButton onClick={() => setOpen(true)}>
				<Search className="h-4 w-4" />
			</ControlButton>
			<Command.Dialog open={open} onOpenChange={setOpen}>
				<div className="px-4 flex items-center border-b border-b-border">
					<Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground opacity-50" />
					<input
						placeholder={t('epubReader.search.placeholder')}
						className={cn(
							'h-11 py-3 text-sm flex w-full rounded-md bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
						)}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault()
								e.stopPropagation()
								doSearch()
							}
						}}
					/>
				</div>

				<Command.List>{renderContent()}</Command.List>
			</Command.Dialog>
		</>
	)
}
