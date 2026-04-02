import { View } from 'react-native'

import { useTranslate } from '~/lib/hooks'

import Owl, { useOwlHeaderOffset } from '../Owl'
import { Heading, Text } from '../ui'
import { DownloadSourceFilter } from './store'

type Props = {
	source: DownloadSourceFilter
}

export default function NoDownloadsOnDevice({ source }: Props) {
	const emptyContainerStyle = useOwlHeaderOffset()

	const { t } = useTranslate()

	return (
		<View
			className="gap-6 p-4 h-full flex-1 items-center justify-center"
			style={emptyContainerStyle}
		>
			<Owl owl="empty" />

			<View className="gap-2 px-4 tablet:max-w-lg">
				<Heading size="lg" className="font-semibold leading-tight text-center">
					{t(getSourceKey(source, 'title'))}
				</Heading>
				<Text className="text-lg text-center">{t(getSourceKey(source, 'description'))}</Text>
			</View>
		</View>
	)
}

const LOCALE_BASE = 'localLibrary.emptyState'
const getSourceKey = (source: DownloadSourceFilter, key: 'title' | 'description') =>
	`${LOCALE_BASE}.${source}.${key}`
