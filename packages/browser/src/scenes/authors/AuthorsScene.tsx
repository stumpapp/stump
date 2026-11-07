import { useGraphQL } from '@stump/client'
import { Avatar, Breadcrumbs, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { keepPreviousData } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { GroupedVirtuoso } from 'react-virtuoso'

import { SceneContainer } from '@/components/container'
import { LibrarySelect } from '@/components/library'
import { PageHeader } from '@/components/sharedLayout'

const query = graphql(`
	query AuthorsSceneWeb($filters: AuthorFilterInput) {
		authors(pagination: { none: { unpaginated: true } }, filter: $filters) {
			nodes {
				id
				name
				avatar {
					url
				}
			}
		}
	}
`)

// TODO: infinite scroll paginate, don't just load all data into virtualizer
// TODO: ^ regardless of above, should have alphabet query so i can get counts for each
// group instead of manual counts on client

export default function AuthorsScene() {
	const [libraryId, setLibraryId] = useState<string>()
	const { data } = useGraphQL(
		query,
		['authors', libraryId],
		{
			filters: libraryId
				? {
						libraryId: { eq: libraryId },
					}
				: {},
		},
		{ placeholderData: keepPreviousData },
	)
	const listContainerRef = useRef<HTMLDivElement>(null)

	const [containerWidth, setContainerWidth] = useState(0)
	const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null)

	const authors = useMemo(() => data?.authors?.nodes ?? [], [data])

	useEffect(() => {
		const container = listContainerRef.current
		if (!container) return

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0]
			if (entry) setContainerWidth(entry.contentRect.width)
		})
		observer.observe(container)
		return () => observer.disconnect()
	}, [])

	useEffect(() => {
		const main = document.getElementById('main')
		if (!main) return

		const updateScrollParent = () => {
			const nextParent = main.querySelector<HTMLElement>('[data-artificial-scroll="true"]') ?? main
			setScrollParent((current) => (current === nextParent ? current : nextParent))
		}
		updateScrollParent()

		const observer = new MutationObserver(updateScrollParent)
		observer.observe(main, {
			attributes: true,
			attributeFilter: ['data-artificial-scroll'],
			childList: true,
			subtree: true,
		})
		return () => observer.disconnect()
	}, [])

	const sections = useMemo(() => {
		type Author = (typeof authors)[number]
		const authorsByInitial = new Map<string, Author[]>()

		for (const author of authors) {
			const firstCharacter = author.name.trim().charAt(0).toLocaleUpperCase()
			const initial =
				firstCharacter.toLocaleLowerCase() !== firstCharacter.toLocaleUpperCase()
					? firstCharacter
					: '#'
			const sectionAuthors = authorsByInitial.get(initial) ?? []
			sectionAuthors.push(author)
			authorsByInitial.set(initial, sectionAuthors)
		}

		return [...authorsByInitial.entries()]
			.sort(([left], [right]) => {
				if (left === '#') return -1
				if (right === '#') return 1
				return left.localeCompare(right, undefined, { sensitivity: 'base' })
			})
			.map(([initial, sectionAuthors]) => ({
				initial,
				authors: sectionAuthors,
			}))
	}, [authors])
	// ^ this is a little bit scuffed but really just mocked for now, eventually when i fully release
	// the feature it would have its sections driven from server ideally

	const columns = Math.max(1, Math.floor((containerWidth + 16) / 144))
	const groupedRows = useMemo(
		() =>
			sections.map(({ authors: sectionAuthors }) => {
				const rows = []
				for (let index = 0; index < sectionAuthors.length; index += columns) {
					rows.push(sectionAuthors.slice(index, index + columns))
				}
				return rows
			}),
		[columns, sections],
	)
	const rows = groupedRows.flat()
	const groupCounts = groupedRows.map((group) => group.length)

	return (
		<>
			<PageHeader>
				<PageHeader.Start>
					<Breadcrumbs segments={[{ label: 'Authors', noShrink: true }]} />
				</PageHeader.Start>

				<PageHeader.End>
					<div>
						<LibrarySelect
							selectedId={libraryId}
							onChange={(value) => setLibraryId(value || undefined)}
						/>
					</div>
				</PageHeader.End>
			</PageHeader>

			<SceneContainer>
				<div ref={listContainerRef} className="w-full">
					{scrollParent && (
						<GroupedVirtuoso
							customScrollParent={scrollParent}
							groupCounts={groupCounts}
							groupContent={(index) => (
								<div className="gap-3 pb-4 text-sm font-semibold flex items-center">
									<Text size="sm">{sections[index]?.initial}</Text>
									<div className="h-px flex-1 bg-border" />
									<Text size="xs" variant="muted">
										{sections[index]?.authors.length}
									</Text>
								</div>
							)}
							itemContent={(index) => (
								<div
									className="gap-x-4 pb-6 grid"
									style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
								>
									{rows[index]?.map((author) => (
										<Link key={author.id} to={`/authors/${author.id}`}>
											<div className="min-w-0 gap-2 flex flex-col items-center">
												<Avatar
													className="h-30 w-30"
													fallback={author.name}
													fallbackWrapperClassName="text-3xl font-medium"
													src={author.avatar.url}
												/>
												<Text
													size="sm"
													className="font-medium leading-tight line-clamp-2 w-full text-center"
												>
													{author.name}
												</Text>
											</div>
										</Link>
									))}
								</div>
							)}
						/>
					)}
				</div>
			</SceneContainer>
		</>
	)
}
