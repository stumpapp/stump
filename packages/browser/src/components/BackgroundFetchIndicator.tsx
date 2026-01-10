import { useIsFetching } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export default function BackgroundFetchIndicator() {
	const activeQueries = useIsFetching()

	const [isFetching, setIsFetching] = useState(activeQueries > 0)

	// Delay the hiding of the spinner by 100ms to prevent flickering (queries are pretty quick!)
	useEffect(() => {
		const isActivelyFetching = activeQueries > 0
		if (isFetching && !isActivelyFetching) {
			setTimeout(() => setIsFetching(isActivelyFetching), 100)
		} else {
			setIsFetching(isActivelyFetching)
		}
	}, [isFetching, activeQueries])

	if (!isFetching) {
		return null
	}

	return (
		<div className="fixed bottom-4 right-6 z-50">
			<svg className="stroke-contrast h-6 w-6 animate-spin" viewBox="0 0 256 256">
				<line
					x1="128"
					y1="32"
					x2="128"
					y2="64"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="24"
				/>

				<line
					x1="195.9"
					y1="60.1"
					x2="173.3"
					y2="82.7"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="24"
				/>

				<line
					x1="224"
					y1="128"
					x2="192"
					y2="128"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="24"
				/>

				<line
					x1="195.9"
					y1="195.9"
					x2="173.3"
					y2="173.3"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="24"
				/>

				<line
					x1="128"
					y1="224"
					x2="128"
					y2="192"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="24"
				/>

				<line
					x1="60.1"
					y1="195.9"
					x2="82.7"
					y2="173.3"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="24"
				/>

				<line
					x1="32"
					y1="128"
					x2="64"
					y2="128"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="24"
				/>

				<line
					x1="60.1"
					y1="60.1"
					x2="82.7"
					y2="82.7"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="24"
				/>
			</svg>
		</div>
	)
}
