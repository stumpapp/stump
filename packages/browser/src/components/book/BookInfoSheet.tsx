import { formatBytes } from '@stump/client'
import { Badge, cn, Link, NewCard, SheetPrimitive as Sheet } from '@stump/components'
import { FragmentType, graphql, useFragment, UserPermission } from '@stump/graphql'
import { ComponentProps, ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'

import BadgeList from '@/components/BadgeList'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

const fragment = graphql(`
	fragment BookInfoSheet on Media {
		id
		resolvedName
		pages
		size
		extension
		hash
		koreaderHash
		relativeLibraryPath
		createdAt
		modifiedAt
		library {
			id
			name
		}
		series {
			id
			resolvedName
		}
		metadata {
			publisher
			year
			month
			day
			language
			ageRating
			volume
			number
			storyArc
			storyArcNumber
			writers
			pencillers
			inkers
			colorists
			letterers
			coverArtists
			editors
			characters
			teams
			identifierIsbn
			identifierAmazon
			identifierCalibre
			identifierGoogle
			identifierMobiAsin
			identifierUuid
		}
		readHistory {
			completedAt
			dnf
		}
	}
`)

type Props = {
	fragment: FragmentType<typeof fragment>
	isOpen: boolean
	onClose: () => void
}

type Row = { label: string; value: ReactNode; title?: string; wrap?: boolean }

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	year: 'numeric',
	month: 'long',
	day: 'numeric',
})

const formatDate = (value?: string | Date | null) =>
	value ? dateFormatter.format(new Date(value)) : null

const formatPublished = (year?: number | null, month?: number | null, day?: number | null) => {
	if (!year) return null
	if (!month) return String(year)
	return new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'long',
		...(day ? { day: 'numeric' } : {}),
	}).format(new Date(year, month - 1, day ?? 1))
}

const formatHash = (hash: string) => `${hash.slice(0, 8)}…${hash.slice(-8)}`

const hasValue = ({ value }: Row) => value != null && value !== ''

export function BookInfoSheet({ fragment: fragmentRef, isOpen, onClose }: Props) {
	const { translate } = useTranslate()
	const { checkPermission } = useAppContext()

	const book = useFragment(fragment, fragmentRef)
	const metadata = book.metadata
	const paths = usePaths()

	// TODO(permissions): this is kinda fake, data still comes through. it isn't something
	// requested by folks so im not in a hurry, but will handle in the permissions
	// improvement branch
	const canSeeFile = checkPermission(UserPermission.ManageLibrary)
	const meta = (key: string) => translate(`shared.bookMetadata.${key}`)

	const lastReadthrough = [...(book.readHistory ?? [])].sort(
		(a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
	)[0]

	const publication: Row[] = [
		{
			label: meta('publisher'),
			value: metadata?.publisher ? (
				<Link
					to={paths.bookSearchWithFilter({
						metadata: { publisher: { likeAnyOf: [metadata.publisher] } },
					})}
					underline={false}
					className="hover:underline"
				>
					{metadata.publisher}
				</Link>
			) : undefined,
		},
		{
			label: meta('published'),
			value: formatPublished(metadata?.year, metadata?.month, metadata?.day),
		},
		{ label: meta('language'), value: metadata?.language },
		{
			label: meta('ageRating'),
			value: metadata?.ageRating && metadata.ageRating > 0 ? `${metadata.ageRating}+` : null,
		},
	].filter(hasValue)

	const placement: Row[] = [
		{
			label: meta('series'),
			value: (
				<Link
					to={paths.seriesOverview(book.series.id)}
					underline={false}
					className="hover:underline"
				>
					{book.series.resolvedName}
				</Link>
			),
		},
		{ label: meta('number'), value: metadata?.number },
		{ label: meta('volume'), value: metadata?.volume },
		{
			label: meta('storyArc'),
			value: metadata?.storyArc
				? metadata.storyArcNumber != null
					? `${metadata.storyArc} #${metadata.storyArcNumber}`
					: metadata.storyArc
				: null,
		},
		{
			label: translate('shared.common.libraries', { count: 1 }),
			value: (
				<Link to={paths.library(book.library.id)} underline={false} className="hover:underline">
					{book.library.name}
				</Link>
			),
		},
	].filter(hasValue)

	const credits = (
		[
			['writers', metadata?.writers],
			['pencillers', metadata?.pencillers],
			['inkers', metadata?.inkers],
			['colorists', metadata?.colorists],
			['letterers', metadata?.letterers],
			['coverArtists', metadata?.coverArtists],
			['editors', metadata?.editors],
		] as const
	).filter(([, names]) => !!names?.length)

	const file: Row[] = [
		{ label: meta('format'), value: book.extension?.toUpperCase() },
		{ label: meta('size'), value: book.size > 0 ? formatBytes(book.size) : null },
		{ label: meta('pageCount'), value: book.pages > 0 ? book.pages : null },
		{ label: translate('shared.common.created'), value: formatDate(book.createdAt) },
		{ label: translate('shared.common.modifiedOnDisk'), value: formatDate(book.modifiedAt) },
		...(canSeeFile
			? [
					{
						label: translate('shared.common.path'),
						value: book.relativeLibraryPath,
						title: book.relativeLibraryPath,
						wrap: true,
					},
					{
						label: translate('shared.common.hash'),
						value: book.hash ? formatHash(book.hash) : null,
						title: book.hash ?? undefined,
					},
					{
						label: translate('shared.common.koreaderHash'),
						value: book.koreaderHash ? formatHash(book.koreaderHash) : null,
						title: book.koreaderHash ?? undefined,
					},
				]
			: []),
	].filter(hasValue)

	const identifiers: Row[] = [
		{ label: meta('identifierIsbn'), value: metadata?.identifierIsbn },
		{ label: meta('identifierAmazon'), value: metadata?.identifierAmazon },
		{ label: meta('identifierGoogle'), value: metadata?.identifierGoogle },
		{ label: meta('identifierCalibre'), value: metadata?.identifierCalibre },
		{ label: meta('identifierMobiAsin'), value: metadata?.identifierMobiAsin },
		{ label: meta('identifierUuid'), value: metadata?.identifierUuid },
		{ label: 'Stump', value: book.id },
	].filter(hasValue)

	const reading: Row[] = lastReadthrough
		? [
				{
					label: lastReadthrough.dnf
						? translate('shared.readingStatus.ABANDONED')
						: translate('shared.common.lastFinished'),
					value: formatDate(lastReadthrough.completedAt),
				},
				{
					label: translate('shared.common.readthroughs', { count: 2 }),
					// ^ just need plural verison
					value: book.readHistory.length,
				},
			]
		: []

	const characters = (metadata?.characters ?? []).map((character) => ({
		to: paths.bookSearchWithFilter({ metadata: { characters: { contains: character } } }),
		label: character,
	}))
	const teams = (metadata?.teams ?? []).map((team) => ({
		to: paths.bookSearchWithFilter({ metadata: { teams: { contains: team } } }),
		label: team,
	}))

	return (
		<Sheet open={isOpen} onOpenChange={(nowOpen) => !nowOpen && onClose()}>
			<Sheet.Content className="overflow-y-auto" closeIcon size="lg">
				<Sheet.Header>
					<Sheet.Title className="pr-8">{book.resolvedName}</Sheet.Title>
				</Sheet.Header>

				<div className="gap-6 px-4 pb-6 flex flex-col">
					<RowCard label={translate('shared.common.publication')} rows={publication} />
					<RowCard label={meta('series')} rows={placement} />

					{credits.length > 0 && (
						<NewCard label={translate('shared.common.credits')}>
							{credits.map(([key, names = []]) => (
								<NewCard.Row key={key} label={meta(key)} className={rowClassName}>
									<div className="min-w-0 gap-1.5 flex flex-1 flex-wrap justify-end">
										{names.map((name) => (
											<RouterLink
												key={name}
												to={paths.bookSearchWithFilter({
													metadata: { [key]: { likeAnyOf: [name] } },
												})}
											>
												<Badge variant={key === 'writers' ? 'primary' : 'secondary'}>{name}</Badge>
											</RouterLink>
										))}
									</div>
								</NewCard.Row>
							))}
						</NewCard>
					)}

					<BadgeSection label={meta('characters')} items={characters} />
					<BadgeSection label={meta('teams')} items={teams} />

					<RowCard label={translate('shared.common.details')} rows={file} />
					<RowCard label={translate('shared.common.reading')} rows={reading} />
					<RowCard label={meta('identifiers')} rows={identifiers} />
				</div>
			</Sheet.Content>
		</Sheet>
	)
}

const rowClassName =
	'py-2.5 gap-4 lg:flex-row lg:items-center flex-row items-center [&>div:first-child]:flex-none'

type RowCardProps = { label: string; rows: Row[] }

function RowCard({ label, rows }: RowCardProps) {
	if (!rows.length) return null
	return (
		<NewCard label={label}>
			{rows.map(({ label, value, title, wrap }) => (
				<NewCard.Row key={label} label={label} className={rowClassName}>
					<span
						className={cn(
							'min-w-0 text-sm flex-1 text-right text-muted-foreground',
							wrap ? 'break-all' : 'truncate',
						)}
						title={title}
					>
						{value}
					</span>
				</NewCard.Row>
			))}
		</NewCard>
	)
}

type BadgeItem = {
	label: string
	to?: string
}

type BadgeSectionProps = {
	label: string
	items: BadgeItem[]
	variant?: ComponentProps<typeof Badge>['variant']
}

function BadgeSection({ label, items, variant = 'secondary' }: BadgeSectionProps) {
	if (!items.length) return null

	const renderItem = (badgeItem: BadgeItem) => {
		const label = badgeItem.label
		if (badgeItem.to) {
			return (
				<RouterLink key={label} to={badgeItem.to}>
					<Badge variant={variant}>{label}</Badge>
				</RouterLink>
			)
		}
		return (
			<Badge key={label} variant={variant} rounded="full" size="sm">
				{label}
			</Badge>
		)
	}

	return (
		<div className="gap-2 flex flex-col">
			<NewCard.ListLabel className="px-2">{label}</NewCard.ListLabel>
			<BadgeList>{items.map(renderItem)}</BadgeList>
		</div>
	)
}
