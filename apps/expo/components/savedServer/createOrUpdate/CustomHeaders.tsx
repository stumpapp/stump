import { useCallback, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Alert, View } from 'react-native'

import { Button, Card, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { createHeaderSchema, CreateOrUpdateServerData } from './schemas'

const LOCALE_BASE = 'addOrEditServer'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

export function CustomHeaders() {
	const { t } = useTranslate()
	const form = useFormContext<CreateOrUpdateServerData>()

	const customHeaders = useWatch({ control: form.control, name: 'customHeaders' })

	const [isAddingHeader, setIsAddingHeader] = useState(false)

	const [newHeaderKey, setNewHeaderKey] = useState('')
	const [newHeaderValue, setNewHeaderValue] = useState('')

	const headerSchema = createHeaderSchema(t)

	const addNewHeader = useCallback(() => {
		const key = newHeaderKey.trim()
		const value = newHeaderValue.trim()
		if (!key || !value) {
			return
		}
		const result = headerSchema.safeParse({ key, value })
		if (result.success) {
			form.setValue('customHeaders', [...(form.getValues('customHeaders') || []), result.data])
			setIsAddingHeader(false)
		} else {
			console.error(result.error.errors)
			Alert.alert(
				t('common.error'),
				result.error.errors[0]?.message || t(getKey('customHeaders.invalidHeader')),
			)
		}
	}, [newHeaderKey, newHeaderValue, form, t, headerSchema])

	const onCancelAddHeader = () => {
		setNewHeaderKey('')
		setNewHeaderValue('')
		setIsAddingHeader(false)
	}

	const onDeleteHeader = (index: number) => {
		form.setValue(
			'customHeaders',
			(form.getValues('customHeaders') || []).filter((_, i) => i !== index),
		)
	}

	return (
		<View className="gap-4">
			<Card label={t(getKey('customHeaders.label'))}>
				{customHeaders?.map((header, index) => (
					<Card.Row key={index} label={header.key} className="flex-wrap">
						<View className="gap-3 flex-row items-center">
							<Text className="text-lg text-foreground-muted">{header.value}</Text>
							<Button
								size="sm"
								variant="destructive"
								roundness="full"
								onPress={() => onDeleteHeader(index)}
								className="dark:border-white/5 border-black/5"
							>
								<Text>{t('common.delete')}</Text>
							</Button>
						</View>
					</Card.Row>
				))}
			</Card>

			<Card
				// TODO: prolly help text
				// description={t(getKey('customHeaders.description'))}
				className={cn(!customHeaders?.length && '-mt-4')}
			>
				{isAddingHeader ? (
					<>
						<Card.InputRow
							label={t('common.name')}
							autoCorrect={false}
							autoCapitalize="none"
							placeholder="X-Biz-Baz"
							onChangeText={setNewHeaderKey}
							value={newHeaderKey}
						/>
						<Card.InputRow
							label={t('common.value')}
							autoCorrect={false}
							autoCapitalize="none"
							placeholder={t('common.value').toLowerCase()}
							onChangeText={setNewHeaderValue}
							value={newHeaderValue}
						/>
						<Card.Row className="gap-4 flex-row justify-end">
							<Button variant="outline" size="sm" roundness="full" onPress={onCancelAddHeader}>
								<Text>{t('common.cancel')}</Text>
							</Button>
							<Button variant="brand" size="sm" roundness="full" onPress={addNewHeader}>
								<Text>{t('common.save')}</Text>
							</Button>
						</Card.Row>
					</>
				) : (
					<Button className="w-full" roundness="full" onPress={() => setIsAddingHeader(true)}>
						<Text>{t(getKey('customHeaders.addHeader'))}</Text>
					</Button>
				)}
			</Card>
		</View>
	)
}
