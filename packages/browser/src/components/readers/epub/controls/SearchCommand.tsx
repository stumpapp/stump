import { cn, Command, Text } from '@stump/components'
import type { EpubSearchResult } from '@stump/sdk'
import { Loader2, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Spinner from '@/components/Spinner'

import { SpineSearchResult, useEpubReaderContext } from '../context'
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
export function groupByChapter(results: EpubSearchResult[]): ResultGroup[] {
	const order: string[] = []
	const groups = new Map<string, EpubSearchResult[]>()

	for (const result of results) {
		const heading =
			result.locator.chapterTitle?.trim() ||
			result.locator.title?.trim() ||
			`Section ${result.spineIndex + 1}`

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

/**
 * Highlights occurrences of `query` within `excerpt` using case-insensitive substring
 * matching — deliberately not a `RegExp`, since the query is arbitrary user input that may
 * contain characters with special meaning to `RegExp` (e.g. `(`, `*`, `\`).
 */
export function highlightExcerpt(excerpt: string, query: string): React.ReactNode[] {
	if (!query) return [excerpt]

	const needle = query.toLowerCase()
	const haystack = excerpt.toLowerCase()
	const parts: React.ReactNode[] = []

	let cursor = 0
	let matchIndex = haystack.indexOf(needle, cursor)
	let key = 0

	while (matchIndex !== -1) {
		if (matchIndex > cursor) {
			parts.push(excerpt.slice(cursor, matchIndex))
		}
		parts.push(
			<span key={key++} className="bg-yellow-400 text-gray-900">
				{excerpt.slice(matchIndex, matchIndex + needle.length)}
			</span>,
		)
		cursor = matchIndex + needle.length
		matchIndex = haystack.indexOf(needle, cursor)
	}

	if (cursor < excerpt.length) {
		parts.push(excerpt.slice(cursor))
	}

	return parts
}

export default function SearchCommand() {
	const {
		readerMeta,
		controls: { searchBook, searchEntireBook, onGoToLocator, onGoToCfi },
	} = useEpubReaderContext()
	const { toc } = readerMeta.bookMeta || {}

	// The server path is strictly preferred; the legacy epub.js path is only used as a
	// fallback until Milestone 5 removes it.
	const usingServerSearch = !!searchBook

	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)

	const [isSearching, setIsSearching] = useState(false)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [hasSearched, setHasSearched] = useState(false)

	const [serverResults, setServerResults] = useState<EpubSearchResult[]>([])
	const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)

	const [legacyResults, setLegacyResults] = useState<SpineSearchResult[]>()

	// Guards against a slow, superseded request overwriting the results of a newer one.
	const requestIdRef = useRef(0)
	const abortControllerRef = useRef<AbortController | null>(null)

	const abortInFlightRequest = useCallback(() => {
		abortControllerRef.current?.abort()
		abortControllerRef.current = null
	}, [])

	const resetResults = useCallback(() => {
		setServerResults([])
		setLegacyResults(undefined)
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
				setError('Search failed. Please try again.')
			} finally {
				if (requestId === requestIdRef.current) {
					setIsSearching(false)
					setIsLoadingMore(false)
				}
			}
		},
		[searchBook, abortInFlightRequest],
	)

	const runLegacySearch = useCallback(
		async (searchQuery: string) => {
			if (!searchEntireBook) return

			setIsSearching(true)
			setError(null)
			try {
				const results = await searchEntireBook(searchQuery)
				setLegacyResults(results)
				setHasSearched(true)
			} catch (err) {
				console.error('[SearchCommand] legacy search failed', err)
				setError('Search failed. Please try again.')
			} finally {
				setIsSearching(false)
			}
		},
		[searchEntireBook],
	)

	const doSearch = useCallback(() => {
		const trimmed = query.trim()
		if (!trimmed) return

		if (usingServerSearch) {
			void runServerSearch(trimmed)
		} else {
			void runLegacySearch(trimmed)
		}
	}, [query, usingServerSearch, runServerSearch, runLegacySearch])

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

	const handleGoToCfi = useCallback(
		(cfi: string) => {
			onGoToCfi?.(cfi)
			setOpen(false)
		},
		[onGoToCfi],
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

	const getSpineTitle = useCallback(
		(idx: number) => {
			const adjustedIdx = idx - 1
			let item = toc?.at(adjustedIdx)
			if (item?.play_order !== adjustedIdx) {
				item = toc?.find((i) => i.play_order === adjustedIdx)
			}

			return item?.label || `Spine item ${idx}`
		},
		[toc],
	)

	const serverGroups = useMemo(() => groupByChapter(serverResults), [serverResults])

	const renderServerResults = () => {
		if (error) return <Command.Empty>{error}</Command.Empty>
		if (!serverResults.length) return <Command.Empty>No results found.</Command.Empty>

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
								Loading more…
							</span>
						) : (
							'Load more results'
						)}
					</Command.Item>
				)}
			</>
		)
	}

	const renderLegacyResults = () => {
		if (error) return <Command.Empty>{error}</Command.Empty>
		if (!legacyResults?.length) return <Command.Empty>No results found.</Command.Empty>

		return legacyResults.map(({ spineIndex, results }, idx) => (
			<Command.Group key={`group-${idx}`} heading={getSpineTitle(spineIndex)}>
				{results.map((result) => (
					<Command.Item
						key={result.cfi}
						value={result.cfi}
						onSelect={() => handleGoToCfi(result.cfi)}
						className="space-y-1 flex flex-col"
					>
						<p className="w-full">{highlightExcerpt(result.excerpt, query)}</p>
						<Text size="xs" variant="muted" className="w-full" title={result.cfi}>
							{result.cfi.slice(0, 12)}...{result.cfi.slice(-12)}
						</Text>
					</Command.Item>
				))}
			</Command.Group>
		))
	}

	const renderContent = () => {
		if (isSearching) {
			return (
				<div className="h-32 flex w-full items-center justify-center">
					<Spinner />
				</div>
			)
		} else if (!hasSearched) {
			return null
		}

		return usingServerSearch ? renderServerResults() : renderLegacyResults()
	}

	if (!searchBook && !searchEntireBook) {
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
						placeholder="Enter a query and press enter to search"
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
