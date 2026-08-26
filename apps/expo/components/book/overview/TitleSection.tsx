import { View } from 'react-native'

import { Heading, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

export type TitleSectionProps = {
	title: string | undefined | null
	subtitle?: string | undefined | null
	series?: string | undefined | null
	library?: string | undefined | null
}

export function TitleSection({ title, subtitle, series, library }: TitleSectionProps) {
	const { t } = useTranslate()

	return (
		<View className="gap-1.5">
			<Heading size="lg" className="leading-6 text-center">
				{title || t('common.unknownTitle')}
			</Heading>

			{subtitle && <Text className="text-lg text-foreground-muted text-center">{subtitle}</Text>}

			{series && <Text className="text-base text-foreground-muted text-center">{series}</Text>}

			{library && (
				<Text className="text-sm text-foreground-muted text-center" numberOfLines={1}>
					{library}
				</Text>
			)}
		</View>
	)
}
