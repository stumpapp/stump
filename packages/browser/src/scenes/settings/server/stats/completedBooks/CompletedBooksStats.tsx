import { Heading, Text } from '@stump/components'
import { ChevronDown } from 'lucide-react'
import React, { Suspense } from 'react'

import CompletedBooksCalendar from './CompletedBooksCalendar'

export default function CompletedBooksStatsContainer() {
	// TODO: suspese query

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">Completed Books</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					A count per day of books that have been completed
				</Text>
			</div>

			<Suspense>
				<CompletedBooksStats />
			</Suspense>
		</div>
	)
}

function CompletedBooksStats() {
	return (
		<div className="flex flex-col space-y-3">
			<CompletedBooksCalendar />

			<Text variant="muted" size="sm" className="inline-flex items-center">
				Show breakdown <ChevronDown className="ml-1.5 inline h-4 w-4" />
			</Text>
		</div>
	)
}
