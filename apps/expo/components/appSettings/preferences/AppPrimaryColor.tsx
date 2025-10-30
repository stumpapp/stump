import { ColorPicker, Host } from '@expo/ui/swift-ui'
import { Pipette } from 'lucide-react-native'
import { Platform } from 'react-native'

import { useColors } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

// TODO: A picker is probably a bit too much, maybe a set of presets?
export default function AppPrimaryColor() {
	const store = usePreferencesStore((state) => ({
		accentColor: state.accentColor,
		patch: state.patch,
	}))

	const onColorChange = (color: string) => {
		store.patch({ accentColor: color })
	}

	const {
		fill: { brand },
	} = useColors()

	return Platform.select({
		ios: (
			<AppSettingsRow icon={Pipette} title="Accent">
				<Host matchContents>
					<ColorPicker
						label=""
						selection={store.accentColor || brand.DEFAULT}
						onValueChanged={onColorChange}
						supportsOpacity={false}
					/>
				</Host>
			</AppSettingsRow>
		),
		android: null,
	})
}
