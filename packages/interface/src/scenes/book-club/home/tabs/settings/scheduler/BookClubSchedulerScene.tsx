import React from 'react'

import { useBookClubContext } from '../../../context'
import CreateOrAddToScheduleForm from './CreateOrAddToScheduleForm'

export default function BookClubSchedulerScene() {
	const {
		bookClub: { schedule },
	} = useBookClubContext()

	if (!schedule) {
		return (
			<div>
				<CreateOrAddToScheduleForm />
			</div>
		)
	}

	return (
		<div>
			TODO: write me! I need to support creating the initial schedule and update existing schedule
			(not allowing updates for already passed books)
		</div>
	)
}
