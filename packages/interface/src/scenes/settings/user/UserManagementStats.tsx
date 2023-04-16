import { Statistic } from '@stump/components'

import { useUserManagementContext } from './context'

export default function UserManagementStats() {
	const { users } = useUserManagementContext()

	// const mostAmbitiousReader = users.reduce((acc, user) => {
	// 	const finishedBooks = user.read_progresses.filter((progress) => progress.is_completed).length
	// }, 0)

	return (
		<div className="grid grid-cols-2 items-center justify-between gap-14 py-6 md:grid-cols-4 md:px-16 md:py-8">
			<Statistic className="col-span-1 gap-3 text-center">
				<Statistic.Label className="text-base md:text-lg">Managed Accounts</Statistic.Label>
				<Statistic.CountUpNumber className="text-lg md:text-3xl" value={users.length} />
			</Statistic>

			<Statistic className="col-span-1 gap-3 text-center">
				<Statistic.Label className="text-base md:text-lg">Something Else</Statistic.Label>
				<Statistic.CountUpNumber className="text-lg md:text-3xl" value={327} />
			</Statistic>

			<Statistic className="col-span-1 gap-3 text-center">
				<Statistic.Label className="text-base md:text-lg">Other Else</Statistic.Label>
				<Statistic.CountUpNumber className="text-lg md:text-3xl" value={1023} />
			</Statistic>

			<Statistic className="col-span-1 gap-3 text-center">
				<Statistic.Label className="text-base md:text-lg">Different Else</Statistic.Label>
				<Statistic.CountUpNumber className="text-lg md:text-3xl" value={1} />
			</Statistic>
		</div>
	)
}
