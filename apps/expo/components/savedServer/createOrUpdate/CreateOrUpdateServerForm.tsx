import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { ChevronRight } from 'lucide-react-native'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { View } from 'react-native'
import { Pressable } from 'react-native'

import { Card, Icon, Switch } from '~/components/ui'
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

	const [kind, url, isDefault] = useWatch({
		control: form.control,
		name: ['kind', 'url', 'defaultServer'],
	})

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

				<Card.InputRow label={t('common.name')} />
			</Card>

			<Card label={t(getKey('networking'))}>
				<Card.InputRow
					label={t(getKey('primaryUrl'))}
					placeholder={`https://stump.my-domain.cloud${kind !== 'stump' ? `/opds/${kind === 'opds-legacy' ? 'v1.2' : 'v2.0'}/catalog` : ''}`}
					value={url}
					onChangeText={(text) => form.setValue('url', text)}
				/>

				{/*TODO: re-add test url button*/}

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
