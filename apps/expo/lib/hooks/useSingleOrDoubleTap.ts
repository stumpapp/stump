import { useCallback, useRef } from 'react'
import { GestureHandlerGestureEvent } from 'react-native-gesture-handler'

type Params = {
	onSingleTap: (event: GestureHandlerGestureEvent) => void
	onDoubleTap: (event: GestureHandlerGestureEvent) => void
	delay: number
}
export function useSingleOrDoubleTap({ onSingleTap, onDoubleTap, delay = 300 }: Params) {
	const lastTap = useRef(0)
	const timeout = useRef<NodeJS.Timeout | null>(null)

	const handleTap = useCallback(
		(event: GestureHandlerGestureEvent) => {
			console.log('handleTap', event)
			const now = Date.now()
			if (now - lastTap.current <= delay) {
				if (timeout.current) {
					clearTimeout(timeout.current)
					timeout.current = null
					onDoubleTap(event)
					console.log('onDoubleTap', event)
				}
			} else {
				lastTap.current = now
				timeout.current = setTimeout(() => {
					onSingleTap(event)
					console.log('onSingleTap', event)
					timeout.current = null
				}, delay)
			}
		},
		[delay, onSingleTap, onDoubleTap],
	)

	return handleTap
}
