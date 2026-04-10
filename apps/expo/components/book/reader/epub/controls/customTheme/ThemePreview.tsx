import { View, ViewProps } from 'react-native'

import { Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { EPUBReaderThemeConfig } from '~/modules/readium'

type ThemePreviewProps = ViewProps & {
	name: string
	theme: EPUBReaderThemeConfig
}

export const ThemePreview = ({ name, theme, className, style, ...props }: ThemePreviewProps) => (
	<View
		className={cn(
			'squircle w-24 rounded-3xl shadow aspect-[6/5] items-center justify-center',
			'border-black/10 dark:border-white/10 border',
			className,
		)}
		style={[{ backgroundColor: theme.colors?.background }, style]}
		{...props}
	>
		<Text
			style={{ color: theme.colors?.foreground }}
			className="text-2xl items-center justify-center"
		>
			Aa
		</Text>
		<Text className="text-base text-center" style={{ color: theme.colors?.foreground }}>
			{name}
		</Text>
	</View>
)
