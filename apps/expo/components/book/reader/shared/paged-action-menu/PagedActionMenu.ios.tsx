import { Button, Divider, Host, Image, Menu, Picker, Text, Toggle } from '@expo/ui/swift-ui'
import {
	buttonStyle,
	controlSize,
	cornerRadius,
	disabled,
	frame,
	pickerStyle,
	tag,
} from '@expo/ui/swift-ui/modifiers'
import { ReadingDirection, ReadingMode } from '@stump/graphql'
import { View } from 'react-native'

import { COLORS, IS_IOS_26_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { BookPreferences, useBookPreferences } from '~/stores/reader'

import { PagedActionMenuProps } from './types'

export function PagedActionMenu({
	book,
	serverId,
	onResetTimer,
	onShowSettings,
}: PagedActionMenuProps) {
	const { translate } = useTranslate()

	const {
		preferences: { readingDirection, readingMode, trackElapsedTime },
		overrideGlobalSettings,
		setBookPreferences,
		updateGlobalSettings,
	} = useBookPreferences({ book, serverId })

	const handleUpdateSettings = (updates: Partial<BookPreferences>) => {
		if (overrideGlobalSettings) {
			return setBookPreferences(updates)
		} else {
			return updateGlobalSettings(updates)
		}
	}

	return (
		<View>
			<Host matchContents>
				<Menu
					label={
						<Image
							systemName="ellipsis"
							color={!IS_IOS_26_PLUS ? COLORS.dark.foreground.DEFAULT : 'primary'}
							size={24}
							modifiers={[frame({ height: 35 })]}
						/>
					}
					modifiers={[controlSize('small'), buttonStyle('glass'), cornerRadius(999)]}
				>
					<Menu
						label={translate('shared.readerSettings.readingMode.label')}
						systemImage="book.pages"
					>
						<Picker
							selection={readingMode}
							onSelectionChange={(selection) => handleUpdateSettings({ readingMode: selection })}
							modifiers={[pickerStyle('inline')]}
						>
							<Text modifiers={[tag(ReadingMode.Paged)]}>
								{translate('shared.readerSettings.readingMode.options.PAGED')}
							</Text>
							<Text modifiers={[tag(ReadingMode.ContinuousHorizontal)]}>
								{translate('shared.readerSettings.readingMode.options.CONTINUOUS_HORIZONTAL')}
							</Text>
							<Text modifiers={[tag(ReadingMode.ContinuousVertical)]}>
								{translate('shared.readerSettings.readingMode.options.CONTINUOUS_VERTICAL')}
							</Text>
						</Picker>
					</Menu>

					<Button
						label={translate('shared.readerSettings.readingDirection.label')}
						systemImage={
							readingDirection === ReadingDirection.Ltr
								? 'arrow.right.square'
								: 'arrow.backward.square'
						}
						onPress={() =>
							handleUpdateSettings({
								readingDirection:
									readingDirection === ReadingDirection.Ltr
										? ReadingDirection.Rtl
										: ReadingDirection.Ltr,
							})
						}
					/>

					{onResetTimer && (
						<Menu label={translate('shared.readerSettings.readingTimer.label')} systemImage="timer">
							<Toggle
								label={translate('shared.common.enabled')}
								isOn={!!trackElapsedTime}
								onIsOnChange={(isOn) => setBookPreferences({ trackElapsedTime: isOn })}
							/>
							<Button
								label={translate('shared.readerSettings.readingTimer.resetTimer')}
								role="destructive"
								onPress={onResetTimer}
								modifiers={[disabled(!trackElapsedTime)]}
							/>
						</Menu>
					)}

					{onShowSettings && (
						<>
							<Divider />
							<Button
								label={translate('shared.readerSettings.allSettings')}
								systemImage="slider.horizontal.3"
								onPress={onShowSettings}
							/>
						</>
					)}
				</Menu>
			</Host>
		</View>
	)
}
