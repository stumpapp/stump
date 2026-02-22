import { AspectRatio, Badge, Card, cx, Heading, Link, Text } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { differenceInDays, formatDistanceToNow } from 'date-fns'
import { Book } from 'lucide-react'
import pluralize from 'pluralize'
import { useMemo } from 'react'
import { match } from 'ts-pattern'

import { EntityImage } from '@/components/entity'
import paths from '@/paths'

import { useBookClubContext } from '../context'

const fragment = graphql(`
	fragment BookClubBookItem on BookClubBook {
		id
		title
		author
		imageUrl
		url
		entity {
			__typename
			id
			resolvedName
			metadata {
				writers
			}
			thumbnail {
				url
			}
		}
		completedAt
		addedAt
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
}
export default function BookClubBookItem({ data }: Props) {
	const book = useFragment(fragment, data)

	const { bookClub } = useBookClubContext()

	const isCurrent = book.id === bookClub.currentBook?.id

	const daysInfo = useMemo(() => {
		const startedAt = new Date(book.addedAt)
		const completedAt = book.completedAt ? new Date(book.completedAt) : null

		let message
		if (isCurrent) {
			message = `Started ${formatDistanceToNow(startedAt, { addSuffix: true })}`
		} else if (completedAt) {
			const daysAgo = differenceInDays(new Date(), completedAt)
			message = `Completed ${daysAgo} ${pluralize('day', daysAgo)} ago`
		} else {
			message = `Added ${formatDistanceToNow(startedAt, { addSuffix: true })}`
		}

		return {
			message,
			start: startedAt,
			end: completedAt,
		}
	}, [book, isCurrent])

	// const discussionInfo = useMemo(() => {
	// 	const archived = !isCurrent && !isDiscussing
	// 	let message = archived ? 'View archived discussion' : 'Join the discussion'
	// 	if (isFuture) {
	// 		message = 'Not yet available'
	// 	}
	// 	return {
	// 		archived,
	// 		message,
	// 	}
	// }, [isCurrent, isDiscussing, isFuture])

	const renderBadge = () => {
		if (isCurrent) {
			return (
				<Badge size="xs" variant="primary" className="shrink-0">
					Currently reading
				</Badge>
			)
		} else {
			return (
				<Badge size="xs" className="shrink-0">
					Past book
				</Badge>
			)
		}
	}

	const renderBookInfo = () => {
		const details = match(book.entity)
			.with({ __typename: 'Media' }, ({ id, thumbnail, resolvedName, metadata }) => ({
				author: metadata?.writers?.join(', '),
				imageUrl: thumbnail.url,
				title: resolvedName,
				url: paths.bookOverview(id),
			}))
			.otherwise(() => ({
				author: book.author,
				imageUrl: book.imageUrl,
				title: book.title,
				url: book.url,
			}))

		const ImageComponent = !book.entity ? 'img' : EntityImage

		const image = details?.imageUrl ? (
			<ImageComponent src={details.imageUrl} className="rounded-md object-cover" />
		) : (
			<div className="flex h-full w-full items-center justify-center rounded-md border border-edge/80 bg-background-surface/50">
				<Book className="h-10 w-10 text-foreground-muted" />
			</div>
		)
		const link = details?.url
		const isExternal = !book.entity
		const heading = details?.title ?? 'Untitled'
		const author = details?.author

		return (
			<div className="flex items-start justify-between">
				<div className="w-[125px]">
					<AspectRatio ratio={2 / 3}>{image}</AspectRatio>
				</div>

				<div className="flex w-full flex-col gap-1.5 text-right">
					<Heading size="sm">{heading}</Heading>
					{author && <Text size="xs">{author}</Text>}
					{link && (
						<Link {...(isExternal ? { href: link } : { to: link })} className="text-xs">
							{isExternal ? 'External link' : 'Access book'}
						</Link>
					)}
				</div>
			</div>
		)
	}

	return (
		<li className="ml-4">
			<div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-edge bg-background-surface"></div>

			<div className="flex items-start justify-between">
				<Text variant="muted" className="mb-1" size="sm">
					{daysInfo.message}
				</Text>
				{renderBadge()}
			</div>

			<Card className="mt-2 flex flex-col gap-4 p-3">
				{renderBookInfo()}

				{!isCurrent && (
					<div
						className={cx('flex items-center justify-between rounded-md p-3', {
							'bg-background-surface': !isCurrent,
							'bg-fill-brand-secondary': isCurrent,
						})}
					>
						<span
							className={cx(
								{ 'text-sm text-foreground-muted': !isCurrent },
								{ 'text-sm text-fill-brand': isCurrent },
							)}
						>
							{daysInfo.end
								? `Read for ${differenceInDays(daysInfo.end, daysInfo.start)} ${pluralize(
										'day',
										differenceInDays(daysInfo.end, daysInfo.start),
									)}`
								: 'Not completed yet'}
						</span>
					</div>
				)}
			</Card>
		</li>
	)
}
