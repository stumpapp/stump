import { Statistic } from '@stump/components'
import { User } from '@stump/types'
import pluralize from 'pluralize'

import { useUserManagementContext } from './context'

type PowerReader = {
	finishedBookCount: number
	user: User | null
}

type BookReadStats = {
	finishedBookCount: number
	inProgressCount: number
}

export default function UsersStats() {
	const { users } = useUserManagementContext()

	const powerReader = users.reduce<PowerReader>(
		(acc, user) => {
			const finishedBooks =
				user.read_progresses?.filter((progress) => progress.is_completed).length || 0

			if (acc.finishedBookCount < finishedBooks) {
				return {
					finishedBookCount: finishedBooks,
					user,
				}
			}

			return acc
		},
		{ finishedBookCount: 0, user: null },
	)

	const booksRead = users.reduce<BookReadStats>(
		(acc, user) => {
			const booksUserRead =
				user.read_progresses?.filter((progress) => progress.is_completed).length || 0
			const booksUserInProgress =
				user.read_progresses?.filter((progress) => !progress.is_completed).length || 0

			return {
				finishedBookCount: acc.finishedBookCount + booksUserRead,
				inProgressCount: acc.inProgressCount + booksUserInProgress,
			}
		},
		{
			finishedBookCount: 0,
			inProgressCount: 0,
		},
	)

	return (
		<div className="flex items-center gap-4 divide-x divide-gray-100/60 overflow-x-scroll pb-8 scrollbar-hide dark:divide-gray-800/80">
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
