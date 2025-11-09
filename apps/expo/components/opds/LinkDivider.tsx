import { Platform, View } from 'react-native'

import { cn } from '~/lib/utils'

export const LinkDivider = () => (
	<View
		className={cn('h-px w-full bg-edge')}
		style={{
			// px-4 is 16, so offset by that amount - 2 (idk the slight difference looked better to my eyes)
			marginLeft: Platform.OS === 'android' ? 0 : 14,
		}}
	/>
)
