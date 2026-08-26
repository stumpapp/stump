import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { checkOPDSURL, checkUrl, formatApiURL } from '@stump/sdk'
import { ChevronRight } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form'
import { View } from 'react-native'
import { Pressable } from 'react-native'

import { Button, Card, Icon, Loader, Switch, Text } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'

import { AdvancedNetworkSettingsSheet } from './AdvancedNetworkSettingsSheet'
import { AuthModeSection } from './AuthModeSection'
import { CreateOrUpdateServerData } from './schemas'

/**
 * a component that composes the form for create/update operations on servers.
 * this does NOT create the react-hook-form context, it is a consumer, so the parent
 * must instantiate the form and pass it down via FormProvider
 */
export function CreateOrUpdateServerForm() {
	const { t } = useTranslate()

	const form = useFormContext<CreateOrUpdateServerData>()
	const { errors } = useFormState({ control: form.control })

	const [kind, url, isDefault, name] = useWatch({
		control: form.control,
		name: ['kind', 'url', 'defaultServer', 'name'],
	})

	const [isCheckingConnection, setIsCheckingConnection] = useState(false)
	const [didConnect, setDidConnect] = useState(false)

	const checkConnection = useCallback(async () => {
		setIsCheckingConnection(true)

		// artificial delay for ✨aesthetic ✨
		await new Promise((resolve) => setTimeout(resolve, 500)) // should give at least one loop of the loader (ish)

		const isValid =
			kind === 'stump' ? await checkUrl(formatApiURL(url, 'v2')) : await checkOPDSURL(url)

		if (!isValid) {
			form.setError('url', {
				type: 'manual',
				message: t(getKey('failedToConnect')),
			})
		} else {
			form.clearErrors('url')
			setDidConnect(true)
		}
		setIsCheckingConnection(false)
	}, [kind, url, form, setDidConnect, t])

	useEffect(() => {
		if (didConnect) {
			const timer = setTimeout(() => {
				setDidConnect(false)
			}, 1500)
			return () => clearTimeout(timer)
		}
	}, [didConnect])

	return (
		<View className="gap-8">
			<Card label={t(getKey('basicInfo'))}>
				<Card.Row label={t(getKey('kind'))}>
					<Picker
						value={kind}
						options={[
							{ label: 'Stump', value: 'stump' },
							{ label: 'OPDS v2.0', value: 'opds' },
							{ label: 'OPDS v1.2', value: 'opds-legacy' },
						]}
						onValueChange={(v) => form.setValue('kind', v)}
					/>
				</Card.Row>

				<Card.InputRow
					label={t('common.name')}
					placeholder={t(getKey('serverNamePlaceholder'))}
					value={name}
					onChangeText={(text) =>
						form.setValue('name', text, { shouldValidate: !!errors.name?.message })
					}
					errorMessage={errors.name?.message}
				/>
			</Card>

			<Card label={t(getKey('networking'))}>
				<Card.InputRow
					label={t(getKey('primaryUrl'))}
					placeholder={`https://stump.my-domain.cloud${kind !== 'stump' ? `/opds/${kind === 'opds-legacy' ? 'v1.2' : 'v2.0'}/catalog` : ''}`}
					value={url}
					onChangeText={(text) => form.setValue('url', text, { shouldValidate: !!errors.url })}
					autoCapitalize="none"
					actions={
						// not overly fancy but fine for now
						<Button
							size="sm"
							roundness="full"
							variant={didConnect ? 'success' : 'outline'}
							onPress={checkConnection}
							disabled={!url || isCheckingConnection}
						>
							{isCheckingConnection && (
								<View className="h-6 w-6 items-center justify-center">
									<Loader />
								</View>
							)}
							{!isCheckingConnection && didConnect && (
								<Text className="text-base text-fill-success">{t(getKey('didConnect'))}</Text>
							)}
							{!isCheckingConnection && !didConnect && (
								<Text className="text-base text-foreground-subtle">{t('common.test')}</Text>
							)}
						</Button>
					}
					errorMessage={errors.url?.message}
				/>

				<Pressable onPress={() => TrueSheet.present('advancedNetworkSettingsSheet')}>
					{({ pressed }) => (
						<Card.Row label={t(getKey('advancedOptions'))} style={pressed && { opacity: 0.7 }}>
							<Icon as={ChevronRight} size={20} className="text-foreground-muted" />
						</Card.Row>
					)}
				</Pressable>

				<AdvancedNetworkSettingsSheet />
			</Card>

			<Card label={t(getKey('auth.section'))}>
				<Card.Row label={t(getKey('auth.method'))}>
					<Controller
						control={form.control}
						render={({ field: { onChange, value } }) => (
							<Picker
								value={value}
								options={[
									{ label: t(getKey('auth.none.label')), value: 'none' },
									{ label: t(getKey('auth.login.label')), value: 'login' },
									{ label: t(getKey('auth.basic')), value: 'basic' },
									{ label: t(getKey('auth.token.label')), value: 'token' },
								]}
								onValueChange={(v) => onChange(v)}
							/>
						)}
						name="authMode"
					/>
				</Card.Row>

				<AuthModeSection />
			</Card>

			<Card label={t(getKey('optionalSettings'))}>
				<Card.Row label={t(getKey('setAsDefaultServer'))}>
					<Switch
						checked={isDefault}
						onCheckedChange={(checked) => form.setValue('defaultServer', checked)}
					/>
				</Card.Row>
			</Card>
		</View>
	)
}

const LOCALE_BASE = 'addOrEditServer'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
