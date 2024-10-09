import { Heading, Text } from '@stump/components'
import React, { Suspense } from 'react'

import BookFormatPieChart from './BookFormatPieChart'

export default function BookFormatSection() {
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">Top Formats</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					A breakdown of the top formats present across your libraries
				</Text>
			</div>

			<Suspense>
				<BookFormatPieChart />
			</Suspense>
		</div>
	)
}
