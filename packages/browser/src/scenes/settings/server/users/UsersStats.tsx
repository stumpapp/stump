import { Statistic } from '@stump/components'
import { ActiveReadingSession, FinishedReadingSession, User } from '@stump/types'
import groupBy from 'lodash.groupby'
import sortBy from 'lodash.sortby'
import uniqBy from 'lodash.uniqby'
import pluralize from 'pluralize'
import { useMemo } from 'react'

import { useUserManagementContext } from './context'

type PowerReader = {
	finishedBookCount: number
	user: User | null
}

type BookReadStats = {
	finishedBookCount: number
	inProgressCount: number
}

type TopBook = {
	bookId: string
	readers: string[]
}

export default function UsersStats() {
	const { users } = useUserManagementContext()

	/**
	 * A map of users to their finished reading sessions, memoized mostly to only run
	 * the uniqBy fewer times
	 */
	const finishedSessionMap = useMemo(
		() =>
			users.reduce(
				(acc, user) => ({
					...acc,
					[user.id]: uniqBy(user.finished_reading_sessions || [], ({ media_id }) => media_id),
				}),
				{} as Record<string, FinishedReadingSession[]>,
			),
		[users],
	)

	/**
	 * A map of users to their active reading sessions
	 */
	const activeSessionMap = useMemo(
		() =>
			users.reduce(
				(acc, user) => ({
					...acc,
					[user.id]: user.active_reading_sessions || [],
				}),
				{} as Record<string, ActiveReadingSession[]>,
			),
		[users],
	)

	/**
	 * The user who has completed the most books
	 */
	const powerReader = useMemo(
		() =>
			users.reduce<PowerReader>(
				(acc, user) => {
					const finishedBooks = finishedSessionMap[user.id]?.length || 0
					if (acc.finishedBookCount < finishedBooks) {
						return {
							finishedBookCount: finishedBooks,
							user,
						}
					}

					return acc
				},
				{ finishedBookCount: 0, user: null },
			),
		[finishedSessionMap, users],
	)

	/**
	 * The total number of finsihed books throughout all users on the server
	 */
	const booksRead = users.reduce<BookReadStats>(
		(acc, user) => {
			const booksUserFinished = finishedSessionMap[user.id]?.length || 0
			const booksWithProgress = activeSessionMap[user.id]?.length || 0

			return {
				finishedBookCount: acc.finishedBookCount + booksUserFinished,
				inProgressCount: acc.inProgressCount + booksWithProgress,
			}
		},
		{
			finishedBookCount: 0,
			inProgressCount: 0,
		},
	)

	/**
	 * The IDs of the top-3 books read on the server
	 */
	const topBooks = useMemo<TopBook[]>(() => {
		const usersAndBooks = users.reduce(
			(acc, user) => {
				const finishedUserBooks = (finishedSessionMap[user.id] || []).map(
					({ media_id, user_id }) => ({ media_id, user_id }),
				)
				const activeUserBooks = (activeSessionMap[user.id] || []).map(({ media_id, user_id }) => ({
					media_id,
					user_id,
				}))
				const allForUser = finishedUserBooks.concat(activeUserBooks)
				const dedupedAll = uniqBy(allForUser, ({ media_id }) => media_id)
				return acc.concat(dedupedAll)
			},
			[] as {
				media_id: string
				user_id: string
			}[],
		)
		const groupedByBook = groupBy(usersAndBooks, ({ media_id }) => media_id)

		return sortBy(
			Object.entries(groupedByBook).map(([bookId, values]) => ({
				bookId,
				readers: values.map(({ user_id }) => user_id),
			})),
			({ readers }) => readers.length,
		).slice(0, 3)
	}, [users, activeSessionMap, finishedSessionMap])
	console.debug(topBooks)

	return (
		<div className="flex items-center gap-4 divide-x divide-edge-subtle overflow-x-scroll pb-8 scrollbar-hide">
			<Statistic className="shrink-0 pr-5 md:pr-10">
				<Statistic.Label>Users</Statistic.Label>
				<Statistic.CountUpNumber value={users.length} />
			</Statistic>

			<Statistic className="shrink-0 px-5 md:px-10">
				<Statistic.Label>Books completed</Statistic.Label>
				<Statistic.CountUpNumber value={booksRead.finishedBookCount} />
			</Statistic>

			<Statistic className="shrink-0 px-5 md:px-10">
				<Statistic.Label>Books in progress</Statistic.Label>
				<Statistic.CountUpNumber value={booksRead.inProgressCount} />
			</Statistic>

			{!!powerReader.user && (
				<Statistic className="shrink-0 pl-5 md:pl-10">
					<Statistic.Label>Power Reader</Statistic.Label>
					<Statistic.StringValue>
						{powerReader.user.username}{' '}
						<span className="text-sm font-normal">
							({powerReader.finishedBookCount} {pluralize('book', powerReader.finishedBookCount)})
						</span>
					</Statistic.StringValue>
				</Statistic>
			)}
		</div>
	)
}
