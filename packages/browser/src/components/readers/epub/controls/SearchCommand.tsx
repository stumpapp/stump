import { cn, Command, Text } from '@stump/components'
import { Search } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

import Spinner from '@/components/Spinner'

import { SpineSearchResult, useEpubReaderContext } from '../context'
import ControlButton from './ControlButton'

export default function SearchCommand() {
	const {
		readerMeta,
		controls: { searchEntireBook, onGoToCfi },
	} = useEpubReaderContext()
	const { toc } = readerMeta.bookMeta || {}

	const [isSearching, setIsSearching] = useState(false)
	const [results, setResults] = useState<SpineSearchResult[]>()

	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)

	/**
	 * A callback to search the entire book for the given query. This will
	 * return an array of arrays, where each array is a group of results
	 * from a single spine item.
	 */
	const doSearch = useCallback(async () => {
		if (!query) return

		setIsSearching(true)
		const results = await searchEntireBook(query)
		setResults(results)
		setIsSearching(false)
	}, [searchEntireBook, query])

	/**
	 * A callback to go to a specific CFI in the book.
	 */
	const handleGoToCfi = useCallback(
		(cfi: string) => {
			onGoToCfi(cfi)
			setOpen(false)
		},
		[onGoToCfi],
	)

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
				doSearch()
			}
		}

		document.addEventListener('keydown', onKeyDown)
		return () => document.removeEventListener('keydown', onKeyDown)
	}, [open, doSearch])

	useEffect(() => {
		if (!query.length) {
			setResults(undefined)
		}
	}, [query])

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

	const renderResults = () => {
		if (!results) {
			return null
		} else if (!results.length) {
			return <Command.Empty>No results found.</Command.Empty>
		} else {
			return results.map(({ spineIndex, results }, idx) => (
				<Command.Group key={`group-${idx}`} heading={getSpineTitle(spineIndex)}>
					{results.map((result) => (
						<Command.Item
							key={result.cfi}
							onDoubleClick={() => handleGoToCfi(result.cfi)}
							className="flex flex-col space-y-1"
						>
							<p className="w-full">
								{result.excerpt.split(new RegExp(`(${query})`, 'gi')).map((part, idx) => {
									if (part.toLowerCase() === query.toLowerCase()) {
										return (
											<span key={idx} className="bg-yellow-400 text-gray-900">
												{part}
											</span>
										)
									} else {
										return part
									}
								})}
							</p>
							<Text size="xs" variant="muted" className="w-full" title={result.cfi}>
								{result.cfi.slice(0, 12)}...{result.cfi.slice(-12)}
							</Text>
						</Command.Item>
					))}
				</Command.Group>
			))
		}
	}

	const renderContent = () => {
		if (isSearching) {
			return (
				<div className="flex h-32 w-full items-center justify-center">
					<Spinner />
				</div>
			)
		} else if (results) {
			return renderResults()
		} else {
			return null
		}
	}

	return (
		<>
			<ControlButton onClick={() => setOpen(true)}>
				<Search className="h-4 w-4" />
			</ControlButton>
			<Command.Dialog open={open} onOpenChange={setOpen}>
				<div className="flex items-center border-b border-b-edge px-4">
					<Search className="mr-2 h-4 w-4 shrink-0 text-foreground-muted opacity-50" />
					<input
						placeholder="Enter a basic query to search for"
						className={cn(
							'flex h-11 w-full rounded-md bg-transparent py-3 text-sm text-foreground-subtle outline-none placeholder:text-foreground-muted disabled:cursor-not-allowed disabled:opacity-50',
						)}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>

				<Command.List>{renderContent()}</Command.List>
			</Command.Dialog>
		</>
	)
}
