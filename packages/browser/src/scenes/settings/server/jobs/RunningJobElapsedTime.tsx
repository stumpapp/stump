import { Text } from '@stump/components'
import dayjs from 'dayjs'
import { Duration } from 'dayjs/plugin/duration'
import { useEffect, useMemo, useState } from 'react'

import { PersistedJob } from './JobTable'

type Props = {
	job: PersistedJob
	formatDuration: (duration: Duration) => string
}

export default function RunningJobElapsedTime({ job, formatDuration }: Props) {
	const [elapsedTime, setElapsedTime] = useState(dayjs().diff(dayjs(job.createdAt), 'second'))

	useEffect(() => {
		if (job.completedAt) return

		const interval = setInterval(() => {
			setElapsedTime(dayjs().diff(dayjs(job.createdAt), 'second'))
		}, 1000)

		return () => {
			clearInterval(interval)
		}
	}, [job])

	const formattedDuration = useMemo(
		() =>
			formatDuration(
				// we need to add 1 second to the elapsed time because the duration
				// plugin rounds down to the nearest second.
				dayjs.duration(elapsedTime + 1, 'second'),
			),
		[elapsedTime, formatDuration],
	)

	return (
		<Text size="sm" variant="muted" className="line-clamp-1">
			{formattedDuration}
		</Text>
	)
}
