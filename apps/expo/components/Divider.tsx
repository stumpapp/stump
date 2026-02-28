import { View } from 'react-native'

import { cn } from '~/lib/utils'

export const Divider = ({ hasIcon = false }: { hasIcon?: boolean }) => (
	// ios: left padding (px-4) + icon width (w-6) + gap between icon and text (gap-4) = ml-14
	<View className={cn('ios:mx-4 mx-3 h-px bg-black/10 dark:bg-white/10', hasIcon && 'ios:ml-14')} />
)
