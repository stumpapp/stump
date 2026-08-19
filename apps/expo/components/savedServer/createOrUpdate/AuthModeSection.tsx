import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form'

import { Card, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

import { CreateOrUpdateServerData } from './schemas'

const LOCALE_BASE = 'addOrEditServer'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

export function AuthModeSection() {
	const { t } = useTranslate()
	const { control } = useFormContext<CreateOrUpdateServerData>()

	const authMode = useWatch({
		control,
		name: 'authMode',
	})
	const { errors } = useFormState({ control })

	if (authMode === 'login' || authMode === 'none') {
		return (
			<Card.Row>
				<Text className="text-foreground-muted">{t(getKey(`auth.${authMode}.description`))}</Text>
			</Card.Row>
		)
	} else if (authMode === 'basic') {
		return (
			<>
				<Controller
					control={control}
					render={({ field: { onChange, onBlur, value } }) => (
						<Card.InputRow
							label={t('common.username')}
							autoCorrect={false}
							autoCapitalize="none"
							placeholder="oromei"
							onBlur={onBlur}
							onChangeText={onChange}
							value={value}
							// errorMessage={errors.basicUser?.message}
						/>
					)}
					name="basicUser"
				/>

				<Controller
					control={control}
					render={({ field: { onChange, onBlur, value } }) => (
						<Card.InputRow
							label={t('common.password')}
							autoCorrect={false}
							autoCapitalize="none"
							placeholder="*************"
							secureTextEntry
							onBlur={onBlur}
							onChangeText={onChange}
							value={value}
							// errorMessage={errors.basicPassword?.message}
						/>
					)}
					name="basicPassword"
				/>
			</>
		)
	} else if (authMode === 'token') {
		return (
			<Controller
				control={control}
				render={({ field: { onChange, onBlur, value } }) => (
					<Card.InputRow
						label="Token"
						autoCorrect={false}
						autoCapitalize="none"
						placeholder={t(getKey('auth.token.placeholder'))}
						onBlur={onBlur}
						onChangeText={onChange}
						value={value}
						// errorMessage={errors.token?.message}
						secureTextEntry
						multiline
						numberOfLines={3}
					/>
				)}
				name="token"
			/>
		)
	}

	return null
}
