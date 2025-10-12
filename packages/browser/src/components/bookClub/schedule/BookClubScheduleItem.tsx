import { useSDK } from '@stump/client'
import { AspectRatio, Badge, ButtonOrLink, Card, cx, Heading, Link, Text } from '@stump/components'
import { BookClubLayoutQuery } from '@stump/graphql'
import dayjs from 'dayjs'
import { Book } from 'lucide-react'
import pluralize from 'pluralize'
import { useMemo } from 'react'
import { match } from 'ts-pattern'

import { EntityImage } from '@/components/entity'
import paths from '@/paths'

import { useBookClubContext } from '../context'

type Props = {
	book: NonNullable<NonNullable<BookClubLayoutQuery['bookClubBySlug']>['schedule']>['books'][number]
}
export default function BookClubScheduleTimelineItem({ book }: Props) {
	const { sdk } = useSDK()
	const { bookClub } = useBookClubContext()

	const adjustedEnd = book.discussionDurationDays
		? dayjs(book.endAt).add(book.discussionDurationDays, 'day')
		: null
	const isCurrent = dayjs().isBefore(adjustedEnd) && dayjs().isAfter(dayjs(book.startAt))
	const isDiscussing = dayjs().isBefore(adjustedEnd) && dayjs().isAfter(dayjs(book.endAt))
	const isFuture = dayjs().isBefore(dayjs(book.startAt))

	const daysInfo = useMemo(() => {
		let message = ''
		const start = dayjs(book.startAt)
		const end = dayjs(book.endAt)

		if (isDiscussing) {
			const diff = dayjs(adjustedEnd).diff(dayjs(), 'days') + 1 // add one to include the current day
			message = `${diff} ${pluralize('day', diff)} left for discussion`
		} else if (isCurrent) {
			const diff = dayjs(book.endAt).diff(dayjs(), 'days') + 1 // add one to include the current day
			message = `${diff} ${pluralize('day', diff)} left to read`
		} else if (isFuture) {
			message = 'Not yet available'
		} else {
			const daysAgo = dayjs().diff(end, 'days')
			message = `${daysAgo} ${pluralize('day', daysAgo)} ago`
		}

		return {
			end: end.format('MMMM DD YYYY'),
			message,
			start: start.format('MMMM DD YYYY'),
		}
	}, [book, isCurrent, isFuture, isDiscussing, adjustedEnd])

	const discussionInfo = useMemo(() => {
		const archived = !isCurrent && !isDiscussing
		let message = archived ? 'View archived discussion' : 'Join the discussion'
		if (isFuture) {
			message = 'Not yet available'
		}
		return {
			archived,
			message,
		}
	}, [isCurrent, isDiscussing, isFuture])

	const renderBadge = () => {
		if (isDiscussing) {
			return (
				<Badge size="xs" variant="secondary" className="shrink-0">
					Discussing
				</Badge>
			)
		} else if (isCurrent) {
			return (
				<Badge size="xs" variant="primary" className="shrink-0">
					Currently reading
				</Badge>
			)
		} else if (isFuture) {
			return (
				<Badge size="xs" variant="warning" className="shrink-0">
					Upcoming
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
			.with({ __typename: 'Media' }, ({ id, resolvedName, metadata }) => ({
				author: metadata?.writers?.join(', '),
				imageUrl: sdk.media.thumbnailURL(id),
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

	const renderDiscussionInfo = () => {
		if (isFuture) {
			return (
				<Text size="sm" variant="muted">
					{discussionInfo.message}
				</Text>
			)
		} else if (isCurrent || isDiscussing) {
			return (
				<ButtonOrLink
					href={paths.bookClubDiscussion(bookClub.id)}
					variant="secondary"
					disabled={isFuture}
					size="sm"
				>
					{discussionInfo.message}
				</ButtonOrLink>
			)
		} else {
			return null
			// return (
			// 	<Link
			// 		href={paths.bookClubDiscussion(bookClub.id, book.discussion?.id)}
			// 		className="text-sm text-foreground-muted"
			// 	>
			// 		{discussionInfo.message}
			// 	</Link>
			// )
		}
	}

	return (
		<li className="ml-4">
			<div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-edge bg-background-surface"></div>

			<div className="flex items-start justify-between">
				<Text variant="muted" className="mb-1" size="sm">
					{daysInfo.start + ' - ' + daysInfo.end}
				</Text>
				{renderBadge()}
			</div>

			<Card className="mt-2 flex flex-col gap-4 p-3">
				{renderBookInfo()}

				<div
					className={cx('flex items-center justify-between rounded-md p-3', {
						'bg-background-surface': !isCurrent && !isDiscussing,
						'bg-fill-brand-secondary': isCurrent || isDiscussing,
					})}
				>
					<span
						className={cx(
							{ 'text-sm text-foreground-muted': !isCurrent && !isDiscussing },
							{ 'text-sm text-fill-brand': isCurrent || isDiscussing },
						)}
					>
						{daysInfo.message}
					</span>
					{renderDiscussionInfo()}
				</div>
			</Card>
		</li>
	)
}
