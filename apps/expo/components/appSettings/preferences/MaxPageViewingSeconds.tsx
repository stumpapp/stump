import { Hourglass } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { TextInput, View } from 'react-native'
import { KeyboardController, useKeyboardHandler } from 'react-native-keyboard-controller'
import { scheduleOnRN } from 'react-native-worklets'

import { KeyboardDraftNumberToolbar, useDraftNumber } from '~/components/keyboard'
import { COLORS, SETTINGS_COLORS, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function MaxPageViewingSeconds() {
	const { t } = useTranslate()
	const colors = useColors()
	const { isDarkColorScheme } = useColorScheme()

	const patch = usePreferencesStore((state) => state.patch)
	const maxPageViewingSeconds = usePreferencesStore((state) => state.maxPageViewingSeconds)

	const [showToolbar, setShowToolbar] = useState(false)
	const savedRef = useRef(false)
	const draft = useDraftNumber({
		initialValue: maxPageViewingSeconds,
		getLatestValue: () => usePreferencesStore.getState().maxPageViewingSeconds,
		validate: (number) => number >= 1,
	})

	const handlePress = () => {
		if (draft.isValid && !draft.isInitial && draft.number !== undefined) {
			savedRef.current = true
			patch({ maxPageViewingSeconds: draft.number })
		}
		KeyboardController.dismiss()
	}

	const handleKeyboardHide = () => {
		setShowToolbar(false)
		if (!savedRef.current) {
			draft.reset()
		}
		savedRef.current = false
	}

	useKeyboardHandler(
		{
			onStart: (e) => {
				'worklet'
				if (e.progress === 0) {
					scheduleOnRN(handleKeyboardHide)
				}
			},
		},
		[],
	)

	const defaultTextColor = isDarkColorScheme
		? COLORS.light.foreground.DEFAULT
		: COLORS.light.foreground.muted

	return (
		<>
			<AppSettingsRow
				icon={Hourglass}
				iconBackgroundColor={SETTINGS_COLORS.interactive}
				title={t(getKey('label'))}
			>
				<View className="gap-2 squircle dark:border-white/5 dark:bg-white/5 border-black/5 bg-black/5 h-8 flex flex-row items-center rounded-full border">
					<TextInput
						hitSlop={50}
						keyboardType="number-pad"
						selectionColor={colors.fill.brand.DEFAULT}
						onChangeText={draft.setString}
						value={draft.string}
						onPressIn={() => setShowToolbar(true)}
						style={{
							width: 60,
							// on android the text is cut off without this
							height: 50,
							fontSize: 16,
							color: draft.isValid && draft.isEmpty ? defaultTextColor : colors.fill.danger.DEFAULT,
						}}
						className="font-medium text-center"
					/>
				</View>
			</AppSettingsRow>

			{showToolbar && (
				<KeyboardDraftNumberToolbar
					draft={draft}
					onPress={handlePress}
					messages={{
						button: t('common.save'),
						invalidDefined: t(getKey('errors.minimumValue')),
						undefined: t(getKey('errors.integer')),
					}}
				/>
			)}
		</>
	)
}

const LOCALE_BASE = 'settings.reading.maxPageViewingSeconds'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
