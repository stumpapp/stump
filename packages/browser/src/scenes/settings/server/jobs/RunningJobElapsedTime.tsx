import { Text } from '@stump/components'
import { PersistedJob } from '@stump/types'
import dayjs from 'dayjs'
import { Duration } from 'dayjs/plugin/duration'
import React, { useEffect, useMemo, useState } from 'react'

type Props = {
	job: PersistedJob
	formatDuration: (duration: Duration) => string
}

export default function RunningJobElapsedTime({ job, formatDuration }: Props) {
	const [elapsedTime, setElapsedTime] = useState(dayjs().diff(dayjs(job.created_at), 'second'))

	useEffect(() => {
		if (job.completed_at) return

		const interval = setInterval(() => {
			setElapsedTime(dayjs().diff(dayjs(job.created_at), 'second'))
		}, 1000)

		return () => {
			clearInterval(interval)
		}
	}, [job])

	const formatedDuration = useMemo(
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
			{formatedDuration}
		</Text>
	)
}
