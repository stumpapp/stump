import { useIsFetching } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

// TODO: I'm honestly not sure how much I love this loader. I think a more generic spinner
// might just look better.
export default function BackgroundFetchIndicator() {
	const isFetching = useIsFetching()

	const [isFetchingState, setIsFetchingState] = useState(isFetching)

	// animate between isFetching and !isFetching so the animation has at least one full cycle
	useEffect(() => {
		if (isFetchingState && !isFetching) {
			setTimeout(() => setIsFetchingState(isFetching), 750)
		} else {
			setIsFetchingState(isFetching)
		}
	}, [isFetching, isFetchingState])

	if (!isFetchingState) {
		return null
	}

	return (
		<div className="fixed bottom-4 left-6 z-50 md:left-60">
			<div className="dot-bricks" />
		</div>
	)
}
