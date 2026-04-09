import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useCallback, useEffect } from 'react'
import { BackHandler } from 'react-native'

// ty <3 -> https://github.com/lodev09/react-native-true-sheet/issues/574#issuecomment-3975188290

type Props = {
	ref: React.RefObject<TrueSheet | null>
	isOpen: boolean
}

/**
 * A component that manages back button presses to dismiss the sheet when it's open, overriding the default navigation
 * behavior. An important note is that I've adjusted the implementation (from the linked source above) to only
 * listen when the sheet is open, since it would otherwise swallow that even if the sheet is mounted but not open
 */
export const SheetBackDetection = ({ ref, isOpen }: Props) => {
	const onBackPress = useCallback(() => {
		ref?.current?.dismiss()
		return true
	}, [ref])

	useEffect(() => {
		if (isOpen) {
			const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress)
			return () => backHandler.remove()
		}
	}, [onBackPress, isOpen])

	return null
}
