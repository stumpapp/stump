import { Text } from '@stump/components'
import { formatElapsedDuration } from '@stump/i18n'
import { differenceInSeconds } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'

import { PersistedJob } from './JobTable'

type Props = {
	job: PersistedJob
}

export default function RunningJobElapsedTime({ job }: Props) {
	const [elapsedTime, setElapsedTime] = useState(
		differenceInSeconds(new Date(), new Date(job.createdAt)),
	)

	useEffect(() => {
		if (job.completedAt) return

		const interval = setInterval(() => {
			setElapsedTime(differenceInSeconds(new Date(), new Date(job.createdAt)))
		}, 1000)

		return () => {
			clearInterval(interval)
		}
	}, [job])

	const formattedDuration = useMemo(() => formatElapsedDuration(elapsedTime + 1), [elapsedTime])

	return (
		<Text size="sm" variant="muted" className="line-clamp-1">
			{formattedDuration}
		</Text>
	)
}
