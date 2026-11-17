import { parseGraphQLPercentageDecimal } from '@stump/client'
import { Badge, Heading, Link } from '@stump/components'
import { FragmentType, graphql, Tag, useFragment } from '@stump/graphql'
import { ExternalLink } from 'lucide-react'
import { Fragment } from 'react'

import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

import BookStatRow from './BookStatRow'
import { getBookPresentation } from './presentation'

const fragment = graphql(`
	fragment BookOverviewDetails on Media {
		resolvedName
		seriesPosition
		series {
			id
			resolvedName
		}
		library {
			id
			name
			config {
				libraryType
			}
		}
		metadata {
			summary
			links
			genres
			writers
			pencillers
			number
			volume
		}
		tags {
			id
			name
		}
		readProgress {
			percentageCompleted
		}
		readHistory {
			__typename
		}
		...BookStatRow
	}
`)

type Props = {
	fragment: FragmentType<typeof fragment>
}

export function BookOverviewDetails({ fragment: fragmentRef }: Props) {
	const { translate } = useTranslate()

	const media = useFragment(fragment, fragmentRef)
	const paths = usePaths()
	const metadata = media.metadata

	const writers = metadata?.writers ?? []
	const artists = metadata?.pencillers ?? []
	const genres = metadata?.genres ?? []
	const links = (metadata?.links ?? []).filter(Boolean)
	const tags = (media.tags ?? []) as Tag[]

	const position = metadata?.number ?? metadata?.volume ?? media.seriesPosition

	const isReading = !!media.readProgress
	const isPreviouslyCompleted = !!media.readHistory?.length
	const percentage = parseGraphQLPercentageDecimal(media.readProgress?.percentageCompleted)

	const presentation = getBookPresentation(media.library.config.libraryType)

	const creatorLink = (name: string, field: 'writers' | 'pencillers') => (
		<Link
			key={name}
			to={paths.bookSearchWithFilter({ metadata: { [field]: { likeAnyOf: [name] } } })}
			underline={false}
			className="font-medium text-foreground hover:underline"
		>
			{name}
		</Link>
	)

	const joined = (names: string[], field: 'writers' | 'pencillers') =>
		names.map((name, idx) => (
			<Fragment key={name}>
				{idx > 0 && ', '}
				{creatorLink(name, field)}
			</Fragment>
		))

	return (
		<div className="gap-4 min-w-0 flex w-full flex-col">
			<div className="gap-1.5 flex flex-col">
				<Heading size="lg" className="font-semibold wrap-break-word">
					{media.resolvedName}
				</Heading>

				<div className="gap-x-2 gap-y-1 text-sm flex flex-wrap items-center text-muted-foreground">
					{presentation.credits === 'byline' && writers.length > 0 && (
						<span>by {joined(writers, 'writers')}</span>
					)}
					{presentation.credits === 'credits' && writers.length > 0 && (
						<span>Story {joined(writers, 'writers')}</span>
					)}
					{presentation.credits === 'credits' && artists.length > 0 && (
						<span>Art {joined(artists, 'pencillers')}</span>
					)}

					{media.series ? (
						<Link to={paths.seriesOverview(media.series.id)} underline={false}>
							<Badge size="sm" rounded="full" variant="secondary" className="cursor-pointer">
								{media.series.resolvedName}
								{position != null && ` ${presentation.positionLabel(position)}`}
							</Badge>
						</Link>
					) : (
						<Link to={paths.libraryBooks(media.library.id)} underline={false}>
							<Badge size="sm" rounded="full" variant="secondary" className="cursor-pointer">
								{media.library.name}
							</Badge>
						</Link>
					)}
				</div>

				{(isReading || isPreviouslyCompleted) && (
					<Badge variant="primary">
						{isReading
							? [
									translate('shared.readingStatus.READING'),
									percentage && `${Math.round(percentage)}%`,
								]
									.filter(Boolean)
									.join(' · ')
							: translate('shared.common.completed')}
					</Badge>
				)}
			</div>

			<BookStatRow fragment={media} />

			{(genres.length > 0 || tags.length > 0) && (
				<div className="gap-1.5 flex flex-wrap items-center">
					{genres.map((genre) => (
						<Link
							key={genre}
							to={paths.bookSearchWithFilter({ metadata: { genres: { likeAnyOf: [genre] } } })}
							underline={false}
						>
							<Badge variant="secondary" rounded="full" size="sm" className="cursor-pointer">
								{genre}
							</Badge>
						</Link>
					))}
					{tags.length > 0 && (
						<TagList
							tags={tags}
							buildHref={(tag) => paths.bookSearchWithFilter({ tags: { anyOf: [tag.name] } })}
						/>
					)}
				</div>
			)}

			{links.length > 0 && (
				<div className="gap-1.5 flex flex-wrap items-center">
					{links.map((link) => (
						<Link
							key={link}
							href={link}
							target="_blank"
							rel="noopener noreferrer"
							underline={false}
						>
							<Badge rounded="full" size="sm" className="cursor-pointer">
								<span>{linkLabel(link)}</span>
								<ExternalLink className="ml-1 h-3 w-3 opacity-90" />
							</Badge>
						</Link>
					))}
				</div>
			)}

			{!!metadata?.summary && (
				<div className="max-w-3xl">
					<ReadMore text={metadata.summary} variant="sheet" sheetTitle={media.resolvedName} />
				</div>
			)}
		</div>
	)
}

const linkLabel = (link: string) => {
	try {
		return new URL(link).hostname.replace(/^www\./, '')
	} catch {
		return link.replace(/^(https?:\/\/)?(www\.)?/, '')
	}
}
