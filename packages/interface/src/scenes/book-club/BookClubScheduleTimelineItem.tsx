import { getMediaThumbnail } from '@stump/api'
import {
	AspectRatio,
	Badge,
	ButtonOrLink,
	Card,
	EntityCard,
	Heading,
	Text,
} from '@stump/components'
import { BookClubBook, Media } from '@stump/types'
import dayjs from 'dayjs'
import React, { useMemo } from 'react'

type Props = {
	book: BookClubBook
}
export default function BookClubScheduleTimelineItem({ book }: Props) {
	const title = book.book_entity?.metadata?.title || book.book_entity?.name || 'Untitled'

	const adjustedEnd = dayjs(book.end_at).add(book.discussion_duration_days, 'day')
	const isPast = dayjs().isAfter(dayjs(book.end_at))
	const isCurrent = dayjs().isBefore(adjustedEnd) && dayjs().isAfter(dayjs(book.start_at))
	const isDiscussing = dayjs().isBefore(adjustedEnd) && dayjs().isAfter(dayjs(book.end_at))
	const isFuture = dayjs().isBefore(dayjs(book.start_at))

	const daysInfo = useMemo(() => {
		if (isDiscussing) {
			return dayjs(adjustedEnd).diff(dayjs(), 'days') + 1 // add one to include the current day
		} else if (isCurrent) {
			return dayjs(book.end_at).diff(dayjs(), 'days') + 1 // add one to include the current day
		} else if (isFuture) {
			return dayjs(book.start_at).diff(dayjs(), 'days')
		} else {
			return dayjs(book.end_at).diff(dayjs(book.start_at), 'days')
		}
	}, [book, isCurrent, isFuture, isDiscussing, adjustedEnd])

	const renderBadge = () => {
		if (isDiscussing) {
			return (
				<Badge size="xs" variant="secondary">
					Discussing
				</Badge>
			)
		} else if (isCurrent) {
			return (
				<Badge size="xs" variant="primary">
					Currently reading
				</Badge>
			)
		} else if (isFuture) {
			return (
				<Badge size="xs" variant="warning">
					Upcoming
				</Badge>
			)
		} else {
			return <Badge size="xs">Past book</Badge>
		}
	}

	const renderBookInfo = () => {
		if (book.book_entity) {
			return (
				<div className="w-[125px]">
					<AspectRatio ratio={2 / 3}>
						<img src={getMediaThumbnail(book.book_entity.id)} className="rounded-md object-cover" />
					</AspectRatio>
				</div>
			)
		} else {
			return null
		}
	}

	return (
		<li className="mb-10 ml-4">
			<div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-100 dark:border-gray-750 dark:bg-gray-900"></div>

			<div className="flex items-center gap-2">
				<Text variant="muted" className="mb-1" size="sm">
					{dayjs(book.start_at).format('MMMM DD YYYY') +
						' - ' +
						dayjs(book.end_at).format('MMMM DD YYYY')}
				</Text>
				{renderBadge()}
			</div>
			<Heading size="sm">{title}</Heading>

			<Card className="mt-2 flex flex-col gap-4 p-3">
				<div className="flex items-start justify-between">
					{renderBookInfo()}

					<span className="text-sm text-gray-500 dark:text-gray-400">
						{daysInfo} days {isDiscussing ? 'of discussion' : ''} {isCurrent ? 'left' : 'total'}
					</span>
				</div>

				<div className="self-end">
					<ButtonOrLink href="#" variant="outline" disabled={isFuture}>
						{!isPast ? 'Join' : 'View'} the discussion
					</ButtonOrLink>
				</div>
			</Card>
		</li>
	)
}
