import { Heading, Progress, Stack, Text, useColorModeValue, VStack } from '@chakra-ui/react'
import { cancelJob } from '@stump/api'
import { useJobContext } from '@stump/client'
import type { JobReport } from '@stump/types'
import { useMemo } from 'react'
import toast from 'react-hot-toast'

import Button from '../../ui/Button'
import { readableKind } from './utils'

function EmptyState({ message }: { message: string }) {
	return (
		<Text color={useColorModeValue('gray.600', 'gray.400')} fontSize="sm">
			{message}
		</Text>
	)
}

export function RunningJobs({ jobReports }: { jobReports: JobReport[] }) {
	const context = useJobContext()

	if (!context) {
		throw new Error('JobContextProvider not found')
	}

	const { activeJobs } = context

	const runningJobs = useMemo(() => {
		return jobReports
			.filter((job) => job.status === 'RUNNING' && job.id && activeJobs[job.id])
			.map((job) => ({ ...job, ...activeJobs[job.id!] }))
	}, [activeJobs, jobReports])

	async function handleCancelJob(id: string | null) {
		if (id) {
			toast.promise(cancelJob(id), {
				error: 'Failed to cancel job',
				loading: 'Cancelling job...',
				success: 'Job cancelled',
			})
		} else {
			console.debug('Tried to cancel job with no ID: ', runningJobs)
		}
	}

	const bgColor = useColorModeValue('whiteAlpha.600', 'blackAlpha.300')
	const detailsColor = useColorModeValue('gray.600', 'gray.400')

	return (
		<Stack>
			<Heading alignSelf="start" size="md">
				Active Job
			</Heading>

			{!runningJobs.length && <EmptyState message="No jobs are currently running" />}

			<Stack p={0} m={0}>
				{runningJobs.map((job, i) => {
					return (
						<VStack key={job.id || i} align="start" spacing={2} bg={bgColor} rounded="md" p={3}>
							<div className="flex w-full items-center justify-between">
								<div className="flex items-center space-x-3">
									<Text fontSize="sm" fontWeight="semibold">
										{readableKind(job.kind)}
									</Text>
									<Text color={detailsColor} fontSize="xs" className="italic">
										{job.details}
									</Text>
								</div>
								<Button size="xs" onClick={() => handleCancelJob(job.id)}>
									Cancel Job
								</Button>
							</div>

							<div className="flex w-full flex-col space-y-2 text-xs">
								<Text fontWeight="medium">{job.message}</Text>
								<div className="flex items-center space-x-2">
									<Progress
										isIndeterminate={!job.current_task || !job.task_count}
										value={Number(job.current_task)}
										max={Number(job.task_count)}
										rounded="md"
										w="full"
										size="xs"
										colorScheme="brand"
									/>

									{job.current_task != undefined && !!job.task_count && (
										<Text fontSize="xs" className="min-w-fit">
											<>
												{job.current_task} / {job.task_count}
											</>
										</Text>
									)}
								</div>
							</div>
						</VStack>
					)
				})}
			</Stack>
		</Stack>
	)
}
