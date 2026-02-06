import { View } from 'react-native'

import { usePreferencesStore } from '~/stores'

import { Divider } from '../Divider'

export default function OPDSLegacyEntryDivider() {
	const layout = usePreferencesStore((state) => state.opdsLayout)

	if (layout === 'grid') {
		return <View className="h-4" />
	} else {
		return <Divider />
	}
}
