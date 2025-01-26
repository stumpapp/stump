import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkUrl, formatApiURL } from '@stump/sdk'
import { useColorScheme } from 'nativewind'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useFormState } from 'react-hook-form'
import { Pressable, View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import { z } from 'zod'

import { cn } from '~/lib/utils'
import { useSavedServers } from '~/stores'

import { Button, icons, Input, Label, Switch, Tabs, Text } from '../ui'
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
		defaultValues,
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
			reset(defaultValues)
		}
	}, [reset, isOpen])

	const kind = form.watch('kind')
	const { setValue } = form
	useEffect(() => {
		if (kind !== 'stump') {
			setValue('defaultServer', false)
			setValue('stumpOPDS', false)
		}
	}, [setValue, kind])

	const [defaultServer, stumpOPDS, authMode] = form.watch([
		'defaultServer',
		'stumpOPDS',
		'authMode',
	])

	const renderAuthMode = () => {
		if (kind === 'stump' && !stumpOPDS) {
			return null
		}

		if (authMode === 'default') {
			return (
				<View className="rounded-lg border border-dashed border-edge p-3">
					<Text className="text-foreground-muted">
						You will be prompted to login when accessing content as needed
					</Text>
				</View>
			)
		} else if (authMode === 'basic') {
			return (
				<Fragment>
					<Controller
						control={control}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label="Username"
								autoCorrect={false}
								autoCapitalize="none"
								placeholder="username"
								onBlur={onBlur}
								onChangeText={onChange}
								value={value}
								errorMessage={errors.basicUser?.message}
							/>
						)}
						name="basicUser"
					/>

					<Controller
						control={control}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label="Password"
								autoCorrect={false}
								autoCapitalize="none"
								placeholder="password"
								secureTextEntry
								onBlur={onBlur}
								onChangeText={onChange}
								value={value}
								errorMessage={errors.basicPassword?.message}
							/>
						)}
						name="basicPassword"
					/>
				</Fragment>
			)
		} else if (authMode === 'token') {
			return (
				<Controller
					control={control}
					render={({ field: { onChange, onBlur, value } }) => (
						<Input
							label="Token"
							autoCorrect={false}
							autoCapitalize="none"
							placeholder="Bearer token"
							onBlur={onBlur}
							onChangeText={onChange}
							value={value}
							errorMessage={errors.token?.message}
						/>
					)}
					name="token"
				/>
			)
		}
	}

	// TODO: custom headers
	// TODO:

	return (
		<View>
			<Pressable onPress={handlePresentModalPress}>
				{({ pressed }) => (
					<View
						className={cn(
							'aspect-square flex-1 items-start justify-center p-1',
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
				<BottomSheet.ScrollView className="flex-1 gap-4 bg-background p-6">
					<View className="w-full gap-4">
						<View>
							<Text className="text-2xl font-bold leading-6">Add server</Text>
							<Text className="text-base text-foreground-muted">
								Configure a new server to access your content
							</Text>
						</View>

						<View className="w-full flex-row items-center justify-between">
							<Text className="flex-1 text-base font-medium text-foreground-muted">Kind</Text>

							<Controller
								control={control}
								render={({ field: { onChange, value } }) => (
									<Tabs value={value} onValueChange={onChange}>
										<Tabs.List className="flex-row">
											<Tabs.Trigger value="stump">
												<Text>Stump</Text>
											</Tabs.Trigger>

											<Tabs.Trigger value="opds">
												<Text>OPDS</Text>
											</Tabs.Trigger>
										</Tabs.List>
									</Tabs>
								)}
								name="kind"
							/>
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
									placeholder={`https://stump.my-domain.cloud${kind !== 'stump' ? '/opds/v2.0' : ''}`}
									onBlur={onBlur}
									onChangeText={onChange}
									value={value}
									errorMessage={errors.name?.message}
								/>
							)}
							name="url"
						/>

						{/* 
					<Pressable
						className={cn('-mt-1 rounded-lg bg-background-surface p-2', {
							'opacity-70': !url,
						})}
						disabled={!url}
						onPress={checkConnection}
					>
						<Text>Check connection</Text>
					</Pressable> */}

						<View className="mt-6 w-full gap-6">
							<View className="w-full flex-row items-center gap-6">
								<Switch
									checked={defaultServer}
									onCheckedChange={(value) => form.setValue('defaultServer', value)}
									nativeID="defaultServer"
									disabled={kind !== 'stump'}
								/>

								<Label
									nativeID="defaultServer"
									onPress={() => {
										form.setValue('defaultServer', !defaultServer)
									}}
									disabled={kind !== 'stump'}
								>
									Set as default server
								</Label>
							</View>

							{kind === 'stump' && (
								<View className="w-full flex-row items-center gap-6">
									<Switch
										checked={stumpOPDS}
										onCheckedChange={(value) => form.setValue('stumpOPDS', value)}
										nativeID="stumpOPDS"
										disabled={kind !== 'stump'}
									/>

									<Label
										nativeID="stumpOPDS"
										onPress={() => {
											form.setValue('stumpOPDS', !stumpOPDS)
										}}
										disabled={kind !== 'stump'}
									>
										Enable OPDS
									</Label>
								</View>
							)}
						</View>

						{(kind !== 'stump' || stumpOPDS) && (
							<View className="w-full flex-row items-center justify-between">
								<Text className="flex-1 text-base font-medium text-foreground-muted">Auth</Text>

								<Controller
									control={control}
									render={({ field: { onChange, value } }) => (
										<Tabs value={value} onValueChange={onChange}>
											<Tabs.List className="flex-row">
												<Tabs.Trigger value="default">
													<Text>Login</Text>
												</Tabs.Trigger>

												<Tabs.Trigger value="basic">
													<Text>Basic</Text>
												</Tabs.Trigger>

												<Tabs.Trigger value="token">
													<Text>Token</Text>
												</Tabs.Trigger>
											</Tabs.List>
										</Tabs>
									)}
									name="authMode"
								/>
							</View>
						)}

						{renderAuthMode()}

						<Button className="mt-4 w-full" onPress={handleSubmit(onSubmit)}>
							<Text>Add server</Text>
						</Button>
					</View>
				</BottomSheet.ScrollView>
			</BottomSheet.Modal>
		</View>
	)
}

const defaultValues = {
	defaultServer: false,
	kind: 'stump',
	stumpOPDS: false,
	name: '',
	url: '',
	authMode: 'default',
	token: '',
	basicUser: '',
	basicPassword: '',
} as AddServerSchema

const createSchema = (names: string[]) =>
	z
		.object({
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
			stumpOPDS: z.boolean().default(false),
			authMode: z
				.union([z.literal('token'), z.literal('basic'), z.literal('default')])
				.default('default'),
			token: z.string().optional(),
			basicUser: z.string().optional(),
			basicPassword: z.string().optional(),
		})
		.transform((data) => ({
			...data,
			stumpOPDS: data.kind === 'stump' ? data.stumpOPDS : false,
			auth: data.token
				? { bearer: data.token }
				: data.basicUser
					? { basic: { username: data.basicUser, password: data.basicPassword } }
					: undefined,
		}))
type AddServerSchema = z.infer<ReturnType<typeof createSchema>>
