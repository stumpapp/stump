import { View } from 'react-native'
import { Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

export default function UnsupportedReader() {
	const { t } = useTranslate()
	return (
		<View>
			<Text>{t('reader.unsupportedFormat')}</Text>
		</View>
	)
}
