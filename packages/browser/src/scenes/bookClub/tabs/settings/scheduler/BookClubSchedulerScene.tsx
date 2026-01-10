import { BookClubSchedule, useBookClubContext } from '@/components/bookClub'

import CreateOrAddToScheduleForm from './CreateOrAddToScheduleForm'

// TODO: Separate query
export default function BookClubSchedulerScene() {
	const {
		bookClub: { schedule },
	} = useBookClubContext()

	if (!schedule) {
		return (
			<div className="pb-4">
				<CreateOrAddToScheduleForm />
			</div>
		)
	}

	return (
		<div>
			<BookClubSchedule />
		</div>
	)
}
