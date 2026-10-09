import { useCallback, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { View } from 'react-native'

import { Button, Card, Text } from '~/components/ui'
import { SystemAlert } from '~/components/ui/system-alert'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { createHeaderSchema, CreateOrUpdateServerData } from './schemas'

const LOCALE_BASE = 'shared.addOrEditServer'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

export function CustomHeaders() {
	const { translate } = useTranslate()
	const form = useFormContext<CreateOrUpdateServerData>()

	const customHeaders = useWatch({ control: form.control, name: 'customHeaders' })

	const [isAddingHeader, setIsAddingHeader] = useState(false)

	const [newHeaderKey, setNewHeaderKey] = useState('')
	const [newHeaderValue, setNewHeaderValue] = useState('')

	const headerSchema = createHeaderSchema(translate)

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
			SystemAlert.alert(
				translate('shared.common.error'),
				result.error.errors[0]?.message || translate(getKey(`customHeaders.invalidHeader`)),
			)
		}
	}, [newHeaderKey, newHeaderValue, form, translate, headerSchema])

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
			<Card label={translate(getKey(`customHeaders.label`))}>
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
								<Text>{translate('shared.common.delete')}</Text>
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
							label={translate('shared.common.name')}
							autoCorrect={false}
							autoCapitalize="none"
							placeholder="X-Biz-Baz"
							onChangeText={setNewHeaderKey}
							value={newHeaderKey}
						/>
						<Card.InputRow
							label={translate('shared.common.value')}
							autoCorrect={false}
							autoCapitalize="none"
							placeholder={translate('shared.common.value').toLowerCase()}
							onChangeText={setNewHeaderValue}
							value={newHeaderValue}
						/>
						<Card.Row className="gap-4 flex-row justify-end">
							<Button variant="outline" size="sm" roundness="full" onPress={onCancelAddHeader}>
								<Text>{translate('shared.common.cancel')}</Text>
							</Button>
							<Button variant="brand" size="sm" roundness="full" onPress={addNewHeader}>
								<Text>{translate('shared.common.save')}</Text>
							</Button>
						</Card.Row>
					</>
				) : (
					<Button className="w-full" roundness="full" onPress={() => setIsAddingHeader(true)}>
						<Text>{translate(getKey(`customHeaders.addHeader`))}</Text>
					</Button>
				)}
			</Card>
		</View>
	)
}
