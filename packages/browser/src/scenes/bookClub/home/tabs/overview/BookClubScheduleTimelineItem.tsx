import { useSDK } from '@stump/client'
import { AspectRatio, Badge, ButtonOrLink, Card, cx, Heading, Link, Text } from '@stump/components'
import { BookClubBook } from '@stump/types'
import dayjs from 'dayjs'
import { Book } from 'lucide-react'
import pluralize from 'pluralize'
import React, { useMemo } from 'react'

import paths from '@/paths'

import { useBookClubContext } from '../../context'

type Props = {
	book: BookClubBook
}
export default function BookClubScheduleTimelineItem({ book }: Props) {
	const { sdk } = useSDK()
	const { bookClub } = useBookClubContext()

	const adjustedEnd = dayjs(book.end_at).add(book.discussion_duration_days, 'day')
	const isCurrent = dayjs().isBefore(adjustedEnd) && dayjs().isAfter(dayjs(book.start_at))
	const isDiscussing = dayjs().isBefore(adjustedEnd) && dayjs().isAfter(dayjs(book.end_at))
	const isFuture = dayjs().isBefore(dayjs(book.start_at))

	const daysInfo = useMemo(() => {
		let message = ''
		const start = dayjs(book.start_at)
		const end = dayjs(book.end_at)

		if (isDiscussing) {
			const diff = dayjs(adjustedEnd).diff(dayjs(), 'days') + 1 // add one to include the current day
			message = `${diff} ${pluralize('day', diff)} left for discussion`
		} else if (isCurrent) {
			const diff = dayjs(book.end_at).diff(dayjs(), 'days') + 1 // add one to include the current day
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

	const chatBoardInfo = useMemo(() => {
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
		const { book_entity, title, author, url } = book

		const image = book_entity ? (
			<img src={sdk.media.thumbnailURL(book_entity.id)} className="rounded-md object-cover" />
		) : (
			<div className="flex h-full w-full items-center justify-center rounded-md border border-gray-75 bg-gray-50/80 dark:border-gray-950 dark:bg-gray-1000/30">
				<Book className="h-10 w-10 text-gray-750 dark:text-gray-400" />
			</div>
		)
		const link = book_entity ? paths.bookOverview(book_entity.id) : url

		const bookName = book_entity?.metadata?.title ?? book_entity?.name
		const heading = bookName ?? title ?? 'Untitled'

		return (
			<div className="flex items-start justify-between">
				<div className="w-[125px]">
					<AspectRatio ratio={2 / 3}>{image}</AspectRatio>
				</div>

				<div className="flex w-full flex-col gap-1.5 text-right">
					<Heading size="sm">{heading}</Heading>
					{author && <Text size="xs">{author}</Text>}
					{link && (
						<Link {...(book_entity ? { to: link } : { href: link })} className="text-xs">
							{book_entity ? 'Access book' : 'External link'}
						</Link>
					)}
				</div>
			</div>
		)
	}

	const renderChatBoardInfo = () => {
		if (isFuture) {
			return (
				<Text size="sm" variant="muted">
					{chatBoardInfo.message}
				</Text>
			)
		} else if (isCurrent || isDiscussing) {
			return (
				<ButtonOrLink
					href={paths.bookClubChatBoard(bookClub.id)}
					variant="secondary"
					disabled={isFuture}
					size="sm"
				>
					{chatBoardInfo.message}
				</ButtonOrLink>
			)
		} else {
			return (
				<Link
					href={paths.bookClubChatBoard(bookClub.id, book.chat_board?.id)}
					className="text-sm text-gray-600 dark:text-gray-450"
				>
					{chatBoardInfo.message}
				</Link>
			)
		}
	}

	return (
		<li className="mb-10 ml-4 last:mb-2">
			<div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-100 dark:border-gray-750 dark:bg-gray-900"></div>

			<div className="flex items-start justify-between">
				<Text variant="muted" className="mb-1" size="sm">
					{daysInfo.start + ' - ' + daysInfo.end}
				</Text>
				{renderBadge()}
			</div>

			<Card className="mt-2 flex flex-col gap-4 p-3">
				{renderBookInfo()}

				<div
					className={cx('flex items-center justify-between rounded-md p-3 ', {
						'bg-brand-100/75 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-600':
							isCurrent || isDiscussing,
						'bg-gray-50 dark:bg-gray-950': !isCurrent && !isDiscussing,
					})}
				>
					<span
						className={cx(
							{ 'text-sm text-gray-500 dark:text-gray-400': !isCurrent && !isDiscussing },
							{ 'text-sm text-yellow-700 dark:text-yellow-600': isCurrent || isDiscussing },
						)}
					>
						{daysInfo.message}
					</span>
					{renderChatBoardInfo()}
				</div>
			</Card>
		</li>
	)
}
