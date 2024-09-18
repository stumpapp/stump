import { Heading, Text } from '@stump/components'
import React from 'react'

import { ContentContainer, SceneContainer } from '@/components/container'

import CompletedBooksSection from './completedBooks'

export default function ServerStatsScene() {
	return (
		<SceneContainer>
			<ContentContainer>
				<div className="flex flex-col gap-4">
					<div>
						<Heading size="sm">Completed Books</Heading>
						<Text size="sm" variant="muted" className="mt-1">
							A count per day of books that have been completed
						</Text>
					</div>

					<CompletedBooksSection />
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
