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
			'squircle aspect-[6/5] w-24 items-center justify-center rounded-3xl shadow',
			'border border-black/10 dark:border-white/10',
			className,
		)}
		style={[{ backgroundColor: theme.colors?.background }, style]}
		{...props}
	>
		<Text
			style={{ color: theme.colors?.foreground }}
			className="items-center justify-center text-2xl"
		>
			Aa
		</Text>
		<Text className="text-center text-base" style={{ color: theme.colors?.foreground }}>
			{name}
		</Text>
	</View>
)
