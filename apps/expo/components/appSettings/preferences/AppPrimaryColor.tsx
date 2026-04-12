import { ColorPicker, Host } from '@expo/ui/swift-ui'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { Check, Pipette, X } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import RRColorPicker, { HueSlider, Panel1 } from 'reanimated-color-picker'
import { useShallow } from 'zustand/react/shallow'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { Text } from '~/components/ui'
import { HeaderButton } from '~/components/ui/header-button/header-button'
import { SETTINGS_COLORS, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

// TODO: A picker is probably a bit too much, maybe a set of presets?
export default function AppPrimaryColor() {
	const { t } = useTranslate()
	const store = usePreferencesStore(
		useShallow((state) => ({
			accentColor: state.accentColor,
			patch: state.patch,
		})),
	)

	const onColorChange = (color: string) => {
		store.patch({ accentColor: color })
	}

	const {
		fill: { brand },
	} = useColors()

	return (
		<AppSettingsRow
			icon={Pipette}
			iconBackgroundColor={SETTINGS_COLORS.majorVisuals}
			title={t('settings.preferences.appPrimaryColor')}
		>
			{Platform.select({
				ios: (
					<Host matchContents>
						<ColorPicker
							label=""
							selection={store.accentColor || brand.DEFAULT}
							onSelectionChange={onColorChange}
							supportsOpacity={false}
						/>
					</Host>
				),
				android: (
					<AndroidColorPicker
						selection={store.accentColor || brand.DEFAULT}
						onSelectionChange={onColorChange}
					/>
				),
			})}
		</AppSettingsRow>
	)
}

type Props = {
	selection: string
	onSelectionChange: (color: string) => void
}

function AndroidColorPicker({ selection, onSelectionChange }: Props) {
	const sheetRef = useRef<TrueSheet>(null)
	const colors = useColors()

	const [isOpen, setIsOpen] = useState(false)
	const [localColor, setLocalColor] = useState(selection)

	const openPicker = () => {
		sheetRef.current?.present()
	}

	const handleConfirm = () => {
		onSelectionChange(localColor)
		sheetRef.current?.dismiss()
	}

	const handleCancel = () => {
		setLocalColor(selection)
		sheetRef.current?.dismiss()
	}

	return (
		<>
			<Pressable onPress={openPicker}>
				<View
					className="h-8 w-8 rounded-full border-2 border-edge"
					style={{ backgroundColor: localColor }}
				/>
			</Pressable>

			<TrueSheet
				ref={sheetRef}
				detents={['auto', 1]}
				grabber
				// Note: Complex and conflicting gesture handling if not disabled,
				// I tried a nested gesture handler but a bit yucky. For now Android can
				// just tap the buttons to dismiss
				dismissible={false}
				backgroundColor={colors.background.DEFAULT}
				grabberOptions={{ color: colors.sheet.grabber }}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => setIsOpen(false)}
				header={
					<View className="px-2 pt-4 flex-row justify-between">
						<HeaderButton icon={{ ios: 'xmark', android: X }} onPress={handleCancel} />

						<HeaderButton
							onPress={handleConfirm}
							android={{ variant: 'prominent' }}
							icon={{
								ios: 'checkmark',
								android: Check,
							}}
						/>
					</View>
				}
			>
				<View className="gap-4 p-4 pb-8">
					<RRColorPicker value={localColor} onCompleteJS={(result) => setLocalColor(result.hex)}>
						<View className="pb-4">
							<Panel1 />
						</View>

						<View className="gap-2 px-2">
							<Text className="text-foreground-muted">Hue</Text>
							<HueSlider />
						</View>
					</RRColorPicker>
				</View>
			</TrueSheet>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</>
	)
}
