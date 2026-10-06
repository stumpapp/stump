import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useGraphQLMutation } from '@stump/client'
import { graphql } from '@stump/graphql'
import { RefObject, useState } from 'react'
import { View } from 'react-native'

import SheetWithHeader from '~/components/SheetWithHeader'
import { Button, Card, Text } from '~/components/ui'
import { InlineDatePicker } from '~/components/ui/inline-date-picker'

const mutation = graphql(`
	mutation PatchReadingSessionEditSheet($sessionId: Int!, $input: PatchReadingSession!) {
		patchReadingSession(sessionId: $sessionId, input: $input) {
			id
			# createdAt
			# updatedAt
			elapsedSeconds
		}
	}
`)

type SessionRef = {
	id: number
	createdAt: string
	updatedAt?: string | null
	elapsedSeconds?: number | null
}

type Props = {
	ref: RefObject<TrueSheet | null>
	session: SessionRef
}

export function ReadingSessionEditSheet({ ref, session }: Props) {
	const [start, setStart] = useState(() => new Date(session.createdAt))
	const [end, setEnd] = useState(() => new Date(session.updatedAt ?? session.createdAt))
	const [elapsedSeconds, setElapsedSeconds] = useState(String(session.elapsedSeconds ?? 0))

	const { mutate: patchReadingSession, isPending: isPatchingSession } = useGraphQLMutation(mutation)

	// TODO(reading-timeline): figure out how to allow updating the start/end time without
	// giving myself a migraine
	const onSubmit = () => {
		const parsedSecs = parseInt(elapsedSeconds, 10)
		if (isNaN(parsedSecs) || parsedSecs < 0) return

		patchReadingSession({
			sessionId: session.id,
			input: {
				// startedAt: start.toISOString(),
				// finishedAt: end.toISOString(),
				elapsedSeconds: parsedSecs,
			},
		})
	}

	return (
		<SheetWithHeader
			ref={ref}
			detents={[0.65, 1]}
			headerLabel="Date and Time"
			headerLeftButton={{ type: 'dismiss' }}
			headerRightButton={{ type: 'check', onPress: onSubmit, disabled: isPatchingSession }}
		>
			<View className="gap-4">
				<Card label="Session Start and End">
					<Card.Row label="Start">
						<InlineDatePicker
							value={start}
							onChange={setStart}
							displayedComponents={['date', 'hourAndMinute']}
						/>
					</Card.Row>
					<Card.Row label="End">
						<InlineDatePicker
							value={end}
							onChange={setEnd}
							displayedComponents={['date', 'hourAndMinute']}
						/>
					</Card.Row>
				</Card>

				{/* TODO(reading-timeline): entering secs is terrible, find an actual lib for entering
			  durations */}
				<Card
					label="Reading Time"
					description="The total active reading time for this session, in seconds"
				>
					<Card.InputRow
						label="Elapsed Seconds"
						value={elapsedSeconds}
						onChangeText={setElapsedSeconds}
						keyboardType="number-pad"
					/>

					<Card.Row>
						{/*dark:border-white/5 dark:bg-white/5 border-black/5 bg-black/5 ??*/}
						<Button
							roundness="full"
							variant="outline"
							className="w-full"
							onPress={() => {
								const newElapsedSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)
								setElapsedSeconds(String(newElapsedSeconds))
							}}
						>
							<Text>Use Start/End to Calculate</Text>
						</Button>
					</Card.Row>
				</Card>
			</View>
		</SheetWithHeader>
	)
}
