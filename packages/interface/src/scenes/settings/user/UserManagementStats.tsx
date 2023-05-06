import { Statistic } from '@stump/components'
import { User } from '@stump/types'

import { useUserManagementContext } from './context'

type PowerReader = {
	finishedBookCount: number
	user: User | null
}

type BookReadStats = {
	finishedBookCount: number
	inProgressCount: number
}

export default function UserManagementStats() {
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
		<div className="grid grid-cols-2 items-center justify-between gap-14 py-6 md:grid-cols-4 md:px-16 md:py-8">
			<Statistic className="col-span-1 gap-3 text-center">
				<Statistic.Label className="text-base md:text-lg">User Accounts</Statistic.Label>
				<Statistic.CountUpNumber className="text-lg md:text-3xl" value={users.length} />
			</Statistic>

			<Statistic className="col-span-1 gap-3 text-center">
				<Statistic.Label className="text-base md:text-lg">Books Completed</Statistic.Label>
				<Statistic.CountUpNumber
					className="text-lg md:text-3xl"
					value={booksRead.finishedBookCount}
				/>
			</Statistic>

			<Statistic className="col-span-1 gap-3 text-center">
				<Statistic.Label className="text-base md:text-lg">Books In Progress</Statistic.Label>
				<Statistic.CountUpNumber
					className="text-lg md:text-3xl"
					value={booksRead.inProgressCount}
				/>
			</Statistic>

			<Statistic className="col-span-1 gap-3 text-center">
				<Statistic.Label className="text-base md:text-lg">Power Reader</Statistic.Label>
				<Statistic.CountUpNumber
					className="text-lg md:text-3xl"
					value={powerReader.finishedBookCount}
				/>
			</Statistic>
		</div>
	)
}
