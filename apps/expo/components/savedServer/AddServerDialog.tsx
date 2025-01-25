import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkUrl, formatApiURL } from '@stump/sdk'
import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useFormState } from 'react-hook-form'
import { Pressable, View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import { z } from 'zod'

import { cn } from '~/lib/utils'
import { useSavedServers } from '~/stores'

import { Button, icons, Input, Text } from '../ui'
import { BottomSheet } from '../ui/bottom-sheet'

const { Plus } = icons

export default function AddServerDialog() {
	const [isOpen, setIsOpen] = useState(false)

	const ref = useRef<BottomSheetModal | null>(null)
	const snapPoints = useMemo(() => ['95%'], [])
	const animatedIndex = useSharedValue<number>(0)
	const animatedPosition = useSharedValue<number>(0)

	const { savedServers, createServer } = useSavedServers()

	const { colorScheme } = useColorScheme()

	const { control, handleSubmit, ...form } = useForm<AddServerSchema>({
		defaultValues: {
			defaultServer: false,
			kind: 'stump',
			name: '',
			url: '',
		},
		resolver: zodResolver(createSchema(savedServers.map(({ name }) => name))),
	})
	const { errors } = useFormState({ control })

	const url = form.watch('url')
	const checkConnection = useCallback(async () => {
		const isValid = await checkUrl(formatApiURL(url, 'v1'))
		if (!isValid) {
			form.setError('url', {
				type: 'manual',
				message: 'Failed to connect to server',
			})
		} else {
			// TODO: Some success message/state
		}
	}, [url, form])

	const onSubmit = useCallback(
		(data: AddServerSchema) => {
			createServer(data)
			ref.current?.dismiss()
			setIsOpen(false)
		},
		[createServer],
	)

	const handlePresentModalPress = useCallback(() => {
		if (isOpen) {
			ref.current?.dismiss()
			setIsOpen(false)
		} else {
			ref.current?.present()
			setIsOpen(true)
		}
	}, [isOpen])

	const handleChange = useCallback(
		(index: number) => {
			if (index === -1 && isOpen) {
				setIsOpen(false)
			}
		},
		[isOpen],
	)

	const { reset } = form
	useEffect(() => {
		if (!isOpen) {
			reset()
		}
	}, [reset, isOpen])

	return (
		<View>
			<Pressable onPress={handlePresentModalPress}>
				{({ pressed }) => (
					<View
						className={cn(
							'aspect-square flex-1 items-start justify-center pt-0.5',
							pressed && 'opacity-70',
						)}
					>
						<Plus className="text-foreground-muted" size={24} strokeWidth={1.25} />
					</View>
				)}
			</Pressable>

			<BottomSheet.Modal
				ref={ref}
				index={snapPoints.length - 1}
				snapPoints={snapPoints}
				onChange={handleChange}
				backgroundComponent={(props) => <View {...props} className="rounded-t-xl bg-background" />}
				handleIndicatorStyle={{ backgroundColor: colorScheme === 'dark' ? '#333' : '#ccc' }}
				handleComponent={(props) => (
					<BottomSheet.Handle
						{...props}
						className="mt-2"
						animatedIndex={animatedIndex}
						animatedPosition={animatedPosition}
					/>
				)}
			>
				<BottomSheet.View className="flex-1 items-start gap-4 bg-background p-6">
					<View>
						<Text className="text-2xl font-bold leading-6">Add server</Text>
						<Text className="text-base text-foreground-muted">
							Configure a new server to access your content
						</Text>
					</View>

					<Controller
						control={control}
						rules={{
							required: true,
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label="Name"
								autoCorrect={false}
								autoCapitalize="none"
								placeholder="My Server"
								onBlur={onBlur}
								onChangeText={onChange}
								value={value}
								errorMessage={errors.name?.message}
							/>
						)}
						name="name"
					/>

					<Controller
						control={control}
						rules={{
							required: true,
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label="URL"
								autoCorrect={false}
								autoCapitalize="none"
								placeholder="https://stump.my-domain.cloud"
								onBlur={onBlur}
								onChangeText={onChange}
								value={value}
								errorMessage={errors.name?.message}
							/>
						)}
						name="url"
					/>

					<Pressable
						className={cn('-mt-1 rounded-lg bg-background-surface p-2', {
							'opacity-70': !url,
						})}
						disabled={!url}
						onPress={checkConnection}
					>
						<Text>Check connection</Text>
					</Pressable>

					<Button className="mt-4 w-full" onPress={handleSubmit(onSubmit)}>
						<Text>Add server</Text>
					</Button>
				</BottomSheet.View>
			</BottomSheet.Modal>
		</View>
	)
}

const createSchema = (names: string[]) =>
	z.object({
		name: z
			.string()
			.nonempty()
			.min(1)
			.refine((value) => !names.includes(value), {
				message: 'Name already exists',
			}),
		url: z.string().url(),
		kind: z.union([z.literal('stump'), z.literal('opds')]).default('stump'),
		defaultServer: z.boolean().default(false),
	})
type AddServerSchema = z.infer<ReturnType<typeof createSchema>>
