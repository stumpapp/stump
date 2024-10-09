import React from 'react'

import { ContentContainer, SceneContainer } from '@/components/container'

import CompletedBooksSection from './completedBooks'
import { BookFormatSection } from './topFormats'

export default function ServerStatsScene() {
	return (
		<SceneContainer>
			<ContentContainer>
				<div className="flex flex-col space-y-8">
					<CompletedBooksSection />
					<BookFormatSection />
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
