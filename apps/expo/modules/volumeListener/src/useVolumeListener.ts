import { useEffect, useRef } from 'react'

import VolumeListenerModule from './VolumeListenerModule'

type Options = {
	/**
	 * Whether the listener is active
	 *
	 * @default true
	 */
	enabled?: boolean
	onVolumeUp?: () => void
	onVolumeDown?: () => void
}

export function useVolumeListener({ enabled = true, onVolumeUp, onVolumeDown }: Options = {}) {
	// put in refs to avoid having churn in the effect, i could smack an eslint disable to omit them
	// from the dep array but want to try leaning more into compiler opts
	const onVolumeUpRef = useRef(onVolumeUp)
	const onVolumeDownRef = useRef(onVolumeDown)

	useEffect(() => {
		onVolumeUpRef.current = onVolumeUp
	}, [onVolumeUp])

	useEffect(() => {
		onVolumeDownRef.current = onVolumeDown
	}, [onVolumeDown])

	useEffect(() => {
		if (!enabled) return

		VolumeListenerModule.startListening()

		const upListener = VolumeListenerModule.addListener('onVolumeUp', () =>
			onVolumeUpRef.current?.(),
		)
		const downListener = VolumeListenerModule.addListener('onVolumeDown', () =>
			onVolumeDownRef.current?.(),
		)

		return () => {
			VolumeListenerModule.stopListening()
			upListener.remove()
			downListener.remove()
		}
	}, [enabled])
}
