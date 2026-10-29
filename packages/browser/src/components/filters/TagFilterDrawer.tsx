import { useSuspenseGraphQL } from '@stump/client'
import {
	Button,
	CheckBox,
	cn,
	IconButton,
	InputGroup,
	Sheet,
	Text,
	ToolTip,
} from '@stump/components'
import { graphql, MediaFilterInput } from '@stump/graphql'
import { Search, Tags } from 'lucide-react'
import { Suspense, useCallback, useMemo, useState } from 'react'
import { useMediaMatch } from 'rooks'

import { useTranslate } from '@/hooks/useTranslate'

import { useFilterContext } from '.'

const query = graphql(`
	query TagFilterDrawer($libraryId: ID!) {
		libraryTags(libraryId: $libraryId) {
			id
			name
			count
		}
	}
`)

type Props = {
	libraryId: string
}

export default function TagFilterDrawer({ libraryId }: Props) {
	const { t } = useTranslate()
	const { filters, setFilters } = useFilterContext()

	const [isOpen, setIsOpen] = useState(false)
	const [selected, setSelected] = useState<Set<string>>(() => new Set())

	const isMobile = useMediaMatch('(max-width: 768px)')

	const appliedTags = useMemo(() => (filters as MediaFilterInput).tags?.anyOf ?? [], [filters])
	const isTagFilterActive = appliedTags.length > 0

	const handleOpen = useCallback(() => {
		// Sync the local selection with the currently applied tag filters
		setSelected(new Set(appliedTags))
		setIsOpen(true)
	}, [appliedTags])

	const handleClose = useCallback(() => setIsOpen(false), [])

	const handleApplyFilters = useCallback(() => {
		const tags = Array.from(selected)
		setFilters({
			...(filters as MediaFilterInput),
			tags: tags.length ? { anyOf: tags } : undefined,
		})
		setIsOpen(false)
	}, [filters, selected, setFilters])

	const handleClearFilters = useCallback(() => {
		setSelected(new Set())
		setFilters({ ...(filters as MediaFilterInput), tags: undefined })
		setIsOpen(false)
	}, [filters, setFilters])

	const toggleTag = useCallback((name: string) => {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(name)) {
				next.delete(name)
			} else {
				next.add(name)
			}
			return next
		})
	}, [])

	return (
		<Sheet
			open={isOpen}
			onClose={handleClose}
			onOpen={handleOpen}
			title={t('tagFilter.title')}
			trigger={
				<ToolTip content={t('tagFilter.title')} size="sm">
					<IconButton
						variant="ghost"
						size="sm"
						className={cn('hover:bg-accent', { 'text-brand': isTagFilterActive })}
						aria-label={t('tagFilter.title')}
						title={t('tagFilter.title')}
						onClick={handleOpen}
					>
						<Tags className="h-4 w-4" />
					</IconButton>
				</ToolTip>
			}
			size={isMobile ? 'xl' : 'default'}
			footer={
				<div className="-mt-4 gap-x-4 py-2 flex w-full flex-row items-center">
					<Button
						size="sm"
						className="flex-1"
						type="button"
						variant="destructive"
						onClick={handleClearFilters}
					>
						{t('tagFilter.clearFilters')}
					</Button>

					<Button size="sm" className="flex-1" type="button" onClick={handleApplyFilters}>
						{t('tagFilter.applyFilters')}
					</Button>
				</div>
			}
		>
			<Suspense>
				<TagFilterContent libraryId={libraryId} selected={selected} onToggle={toggleTag} />
			</Suspense>
		</Sheet>
	)
}

type ContentProps = {
	libraryId: string
	selected: Set<string>
	onToggle: (name: string) => void
}

function TagFilterContent({ libraryId, selected, onToggle }: ContentProps) {
	const { t } = useTranslate()

	const { data } = useSuspenseGraphQL(query, ['libraryTags', libraryId], { libraryId })
	const tags = data.libraryTags

	const [search, setSearch] = useState('')

	const filteredTags = useMemo(() => {
		const term = search.trim().toLowerCase()
		if (!term) {
			return tags
		}
		return tags.filter((tag) => tag.name.toLowerCase().includes(term))
	}, [tags, search])

	const renderName = useCallback(
		(name: string) => {
			const term = search.trim().toLowerCase()
			const index = term ? name.toLowerCase().indexOf(term) : -1
			if (index === -1) {
				return name
			}

			return (
				<>
					{name.slice(0, index)}
					<span className="rounded-sm bg-muted font-medium text-foreground">
						{name.slice(index, index + term.length)}
					</span>
					{name.slice(index + term.length)}
				</>
			)
		},
		[search],
	)

	return (
		<div className="scrollbar-hide flex max-h-full grow flex-col gap-2 overflow-y-auto px-6 pb-2">
			<InputGroup>
				<InputGroup.Addon align="inline-start">
					<Search className="h-4 w-4 text-muted-foreground" />
				</InputGroup.Addon>

				<InputGroup.Input
					placeholder={t('tagFilter.searchPlaceholder')}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</InputGroup>

			{tags.length === 0 ? (
				<Text variant="muted" size="sm" className="py-4 text-center">
					{t('tagFilter.emptyLibrary')}
				</Text>
			) : filteredTags.length === 0 ? (
				<Text variant="muted" size="sm" className="py-4 text-center">
					{t('tagFilter.noMatchingTags')}
				</Text>
			) : (
				<ul className="divide-y">
					{filteredTags.map((tag) => (
						<li key={tag.id} className="gap-2 py-2 px-1 flex items-center">
							<CheckBox
								aria-label={tag.name}
								checked={selected.has(tag.name)}
								onClick={() => onToggle(tag.name)}
							/>
							<span className="flex-1 truncate text-sm">{renderName(tag.name)}</span>
							<span className="text-muted-foreground text-xs">{tag.count}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
