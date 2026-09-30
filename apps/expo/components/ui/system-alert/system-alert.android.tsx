import {
	AlertDialog,
	Host as AndroidHost,
	Text as AndroidText,
	TextButton,
} from '@expo/ui/jetpack-compose'
import { useEffect, useState } from 'react'
import { Alert, AlertButton, AlertOptions, AlertStatic } from 'react-native'

import { useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'

type PendingAlert = {
	title: string
	message?: string
	buttons: AlertButton[]
	options?: AlertOptions
}

// the singleton that controls the showing of alerts, will be set by
// the host when it mounts
let showAndroidAlert: ((alert: PendingAlert) => void) | null = null

function presentAlert(alert: PendingAlert) {
	if (!showAndroidAlert) {
		console.warn(
			'the SystemAlertHost is not mounted and so the default and ugly Alert from react-native is being used',
		)
		Alert.alert(alert.title, alert.message, alert.buttons, alert.options)
	} else {
		showAndroidAlert(alert)
	}
}

export const SystemAlert: AlertStatic = {
	alert: (title, message, buttons = [], options) => {
		presentAlert({
			title,
			message,
			buttons,
			options,
		})
	},

	prompt: (title, message, callbackOrButtons, type, _defaultValue, _keyboardType, options) => {
		if (type && type !== 'default') {
			console.warn(`android does not support ${type}, stinky head`)
		}

		presentAlert({
			title,
			message,
			buttons: Array.isArray(callbackOrButtons) ? callbackOrButtons : [],
			// ^ i don't want to bother with the callback, it's fine
			options,
		})
	},
}

/**
 * A component that should be mounted at the root of the app in order for the non-ugly ass
 * android alerts to be used. If you try to use SystemAlert.alert() without this component mounted,
 * it will fall back to the default Alert.alert() implementation. I.e., the ugly, ugly ass alerts
 */
export function SystemAlertHost() {
	const colors = useColors()

	const [pendingAlert, setPendingAlert] = useState<PendingAlert | null>(null)

	useEffect(() => {
		showAndroidAlert = setPendingAlert
		return () => {
			if (showAndroidAlert === setPendingAlert) {
				showAndroidAlert = null
			}
		}
	}, [])

	if (!pendingAlert) return <AndroidHost matchContents>{null}</AndroidHost>

	const canDismiss = pendingAlert.options?.cancelable ?? true

	const onDismissRequest = () => {
		setPendingAlert(null)
		pendingAlert.options?.onDismiss?.()
	}

	const onPressButton = (button?: AlertButton) => {
		setPendingAlert(null)
		button?.onPress?.()
	}

	return (
		<AndroidHost matchContents>
			<AlertDialog
				onDismissRequest={onDismissRequest}
				properties={{
					dismissOnBackPress: canDismiss,
					dismissOnClickOutside: canDismiss,
				}}
				colors={{
					containerColor: colors.background.overlay.DEFAULT,
					titleContentColor: colors.foreground.DEFAULT,
					textContentColor: colors.foreground.muted,
					// ^ this aligns with how ios seems to distinguish title v message
					// but open to changing depending on feedback
				}}
			>
				{pendingAlert.title && (
					<AlertDialog.Title>
						<AndroidText>{pendingAlert.title}</AndroidText>
					</AlertDialog.Title>
				)}

				{pendingAlert.message && (
					<AlertDialog.Text>
						<AndroidText>{pendingAlert.message}</AndroidText>
					</AlertDialog.Text>
				)}

				{pendingAlert.buttons.map((button, index) => (
					<SystemAlertButton key={index} button={button!} onPress={() => onPressButton(button)} />
				))}
			</AlertDialog>
		</AndroidHost>
	)
}

type SystemAlertButtonProps = {
	button: AlertButton
	onPress: () => void
}

function SystemAlertButton({ button, onPress }: SystemAlertButtonProps) {
	const { t } = useTranslate()
	const { isDarkColorScheme } = useColorScheme()

	const colors = useColors()
	const ButtonContainer =
		button.style === 'cancel' ? AlertDialog.DismissButton : AlertDialog.ConfirmButton

	// alert dialog will position the buttons based on the style, apparently. or rather which
	// container is used (which here is controlled by the style)
	return (
		<ButtonContainer>
			<TextButton
				onClick={onPress}
				colors={{
					// white/5 or black/5
					containerColor: isDarkColorScheme ? '#ffffff0d' : '0000000d',
					contentColor:
						button.style === 'destructive' ? colors.fill.danger.DEFAULT : colors.foreground.DEFAULT,
				}}
			>
				<AndroidText>{button.text ?? t('common.ok')}</AndroidText>
			</TextButton>
		</ButtonContainer>
	)
}
