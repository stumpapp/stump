import { useCallback, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Alert, Pressable, View } from 'react-native'
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'

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

	// TODO: it's a lil janky, esp the swipeable part, but a lil jank is okay lol
	return (
		<View className="gap-4">
			<Card
				label={t(getKey('customHeaders.label'))}
				// TODO: prolly help text
				// description={t(getKey('customHeaders.description'))}
			>
				{!!customHeaders?.length && (
					<View className="squircle border-edge w-full overflow-hidden rounded-lg border">
						{customHeaders.map((header, index) => (
							<Swipeable
								key={index}
								friction={2}
								rightThreshold={40}
								renderRightActions={(prog, drag) =>
									RenderHeaderAction(prog, drag, () => onDeleteHeader(index))
								}
							>
								<View
									className={cn(
										'gap-2 p-3 tablet:p-4 w-full flex-row items-center justify-between',
										{
											'border-edge border-b': index !== (customHeaders?.length || 0) - 1,
										},
									)}
								>
									<Text>{header.key}</Text>
									<Text className="text-foreground-muted">{header.value}</Text>
								</View>
							</Swipeable>
						))}
					</View>
				)}

				{isAddingHeader && (
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
				)}
			</Card>

			{!isAddingHeader && (
				<Button className="w-full" roundness="full" onPress={() => setIsAddingHeader(true)}>
					<Text>{t(getKey('customHeaders.addHeader'))}</Text>
				</Button>
			)}
		</View>
	)
}

function RenderHeaderAction(
	_: SharedValue<number>,
	drag: SharedValue<number>,
	onDelete: () => void,
) {
	const { t } = useTranslate()
	const styleAnimation = useAnimatedStyle(() => {
		return {
			transform: [{ translateX: drag.value + 50 }],
		}
	})

	return (
		<Reanimated.View style={styleAnimation}>
			<Pressable
				className="w-14 bg-fill-danger h-full items-center justify-center"
				onPress={onDelete}
			>
				{({ pressed }) => (
					<Text className={cn({ 'opacity-80': pressed })}>{t('common.delete')}</Text>
				)}
			</Pressable>
		</Reanimated.View>
	)
}
