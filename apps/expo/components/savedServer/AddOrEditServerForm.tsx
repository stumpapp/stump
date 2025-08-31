import { zodResolver } from '@hookform/resolvers/zod'
import { checkUrl, formatApiURL } from '@stump/sdk'
import isEqual from 'lodash/isEqual'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form'
import {
	NativeSyntheticEvent,
	Platform,
	Pressable,
	TextInputFocusEventData,
	View,
} from 'react-native'
import Dialog from 'react-native-dialog'
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { match, P } from 'ts-pattern'
import { z } from 'zod'

import { cn } from '~/lib/utils'
import { usePreferencesStore, useSavedServers } from '~/stores'
import { SavedServerWithConfig } from '~/stores/savedServer'

import { Button, Heading, Input, Label, Switch, Tabs, Text } from '../ui'

type Props = {
	editingServer?: SavedServerWithConfig | null
	onSubmit: (data: AddOrEditServerSchema) => void
	onClose: () => void
}

export default function AddOrEditServerForm({ editingServer, onSubmit, onClose }: Props) {
	const { savedServers, stumpEnabled } = useSavedServers()

	const { control, handleSubmit, ...form } = useForm<AddOrEditServerSchema>({
		defaultValues: getDefaultValues(stumpEnabled, editingServer),
		resolver: zodResolver(
			createSchema(
				savedServers.map(({ name }) => name).filter((name) => name !== editingServer?.name),
			),
		),
	})
	const { errors } = useFormState({ control })

	const maskURLs = usePreferencesStore((state) => state.maskURLs)

	const [didConnect, setDidConnect] = useState(false)
	const url = form.watch('url')
	const checkConnection = useCallback(async () => {
		const isValid = await checkUrl(formatApiURL(url, 'v2'))
		if (!isValid) {
			form.setError('url', {
				type: 'manual',
				message: 'Failed to connect to server',
			})
		} else {
			setDidConnect(true)
		}
	}, [url, form])

	const [isAddingHeader, setIsAddingHeader] = useState(false)

	const [newHeaderKey, setNewHeaderKey] = useState('')
	const [newHeaderValue, setNewHeaderValue] = useState('')
	const [newHeaderError, setNewHeaderError] = useState('')

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
			setNewHeaderError(result.error.errors[0]?.message || 'Invalid header')
		}
	}, [newHeaderKey, newHeaderValue, form])

	const onCancelAddHeader = () => {
		setNewHeaderKey('')
		setNewHeaderValue('')
		setNewHeaderError('')
		setIsAddingHeader(false)
	}

	const kind = form.watch('kind')
	const { setValue } = form
	useEffect(() => {
		if (kind !== 'stump') {
			setValue('defaultServer', false)
			setValue('stumpOPDS', false)
		}
	}, [setValue, kind])

	useEffect(() => {
		if (didConnect) {
			const timer = setTimeout(() => {
				setDidConnect(false)
			}, 1500)
			return () => clearTimeout(timer)
		}
	}, [didConnect])

	const [defaultServer, stumpOPDS, authMode] = form.watch([
		'defaultServer',
		'stumpOPDS',
		'authMode',
	])

	const renderAuthMode = () => {
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
								placeholder="oromei"
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
								placeholder="*************"
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
							secureTextEntry
						/>
					)}
					name="token"
				/>
			)
		}
	}

	const formValues = useWatch({ control })
	const isUpdateReady = useMemo(
		() => !isEqual(getDefaultValues(stumpEnabled, editingServer), formValues),
		[formValues, stumpEnabled, editingServer],
	)

	const onURLFocused = useCallback(
		(e: NativeSyntheticEvent<TextInputFocusEventData>) => {
			if (e.nativeEvent.text === '') {
				form.setValue('url', 'http://')
			}
		},
		[form],
	)

	const onDeleteHeader = useCallback(
		(index: number) => {
			form.setValue(
				'customHeaders',
				(form.getValues('customHeaders') || []).filter((_, i) => i !== index),
			)
		},
		[form],
	)

	function RenderHeaderAction(
		_: SharedValue<number>,
		drag: SharedValue<number>,
		onDelete: () => void,
	) {
		const styleAnimation = useAnimatedStyle(() => {
			return {
				transform: [{ translateX: drag.value + 50 }],
			}
		})

		return (
			<Reanimated.View style={styleAnimation}>
				<Pressable
					className="h-full w-14 items-center justify-center bg-fill-danger"
					onPress={onDelete}
				>
					{({ pressed }) => <Text className={cn({ 'opacity-80': pressed })}>Delete</Text>}
				</Pressable>
			</Reanimated.View>
		)
	}

	return (
		<View className="w-full gap-4" style={{ paddingBottom: Platform.OS === 'android' ? 32 : 0 }}>
			<View className="flex-row items-center justify-between pb-2">
				<Pressable onPress={onClose}>
					<Text className="text-foreground-muted">Cancel</Text>
				</Pressable>

				<Button
					size="sm"
					variant="brand"
					onPress={handleSubmit(onSubmit)}
					disabled={editingServer ? !isUpdateReady : false}
				>
					<Text className="text-foreground">Save</Text>
				</Button>
			</View>

			<View>
				<Heading size="lg" className="font-bold leading-6">
					{editingServer ? 'Edit Server' : 'Add Server'}
				</Heading>
				<Text className="text-foreground-muted">
					{editingServer
						? 'Make changes to the server configuration'
						: 'Configure a new server to access your content'}
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
						label={kind === 'stump' ? 'URL' : 'Catalog URL'}
						autoCorrect={false}
						autoCapitalize="none"
						placeholder={`https://stump.my-domain.cloud${kind !== 'stump' ? '/opds/v2.0/catalog' : ''}`}
						onBlur={onBlur}
						onChangeText={onChange}
						value={value}
						errorMessage={errors.url?.message}
						secureTextEntry={maskURLs}
						onFocus={onURLFocused}
					/>
				)}
				name="url"
			/>

			<View className="flex-row justify-end">
				<Button
					variant="outline"
					size="sm"
					className={cn('rounded-lg bg-background-surface', {
						'opacity-70': !url,
						'bg-fill-success-secondary': didConnect,
					})}
					disabled={!url}
					onPress={checkConnection}
				>
					<Text>{didConnect ? 'Connected' : 'Check connection'}</Text>
				</Button>
			</View>

			<View className="w-full gap-2">
				<Text className="flex-1 text-base font-medium text-foreground-muted">Custom Headers</Text>

				{formValues.customHeaders?.length && (
					<View className="w-full overflow-hidden rounded-lg border border-edge">
						{formValues.customHeaders.map((header, index) => (
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
										'w-full flex-row items-center justify-between gap-2 p-3 tablet:p-4',
										{
											'border-b border-edge': index !== (formValues.customHeaders?.length || 0) - 1,
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

				<Button variant="outline" onPress={() => setIsAddingHeader(true)}>
					<Text>Add header</Text>
				</Button>
			</View>

			<Dialog.Container visible={isAddingHeader}>
				<Dialog.Title>Add custom header</Dialog.Title>
				{newHeaderError && (
					<Dialog.Description
						style={{
							color: 'red',
						}}
					>
						{newHeaderError}
					</Dialog.Description>
				)}

				<Dialog.Input placeholder="Key" onChangeText={setNewHeaderKey} autoCapitalize="none" />
				<Dialog.Input placeholder="Value" onChangeText={setNewHeaderValue} autoCapitalize="none" />

				<Dialog.Button label="Cancel" onPress={onCancelAddHeader} />
				<Dialog.Button label="Ok" onPress={addNewHeader} />
			</Dialog.Container>

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

			{renderAuthMode()}

			<View className="w-full gap-6">
				<Text className="flex-1 text-base font-medium text-foreground-muted">Options</Text>
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
} as AddOrEditServerSchema

const getDefaultValues = (stumpEnabled: boolean, editingServer?: SavedServerWithConfig | null) => {
	if (!editingServer) {
		return { ...defaultValues, kind: stumpEnabled ? 'stump' : 'opds' } as AddOrEditServerSchema
	}

	const configs = match(editingServer.config?.auth)
		.with({ bearer: P.string }, (config) => ({
			authMode: 'token',
			token: config.bearer,
			basicUser: '',
			basicPassword: '',
		}))
		.with(
			{
				basic: P.shape({
					username: P.string,
					password: P.string,
				}),
			},
			(config) => ({
				authMode: 'basic',
				basicUser: config.basic.username,
				basicPassword: config.basic.password,
				token: '',
			}),
		)
		.otherwise(() => ({
			authMode: 'default',
			basicUser: '',
			basicPassword: '',
			token: '',
		}))

	return {
		kind: editingServer.kind,
		name: editingServer.name,
		url: editingServer.url,
		defaultServer: false,
		stumpOPDS: editingServer.stumpOPDS,
		customHeaders: Object.entries(editingServer.config?.customHeaders || {}).map(
			([key, value]) => ({
				key,
				value,
			}),
		),
		...configs,
	} as AddOrEditServerSchema
}

const headerSchema = z
	.object({
		key: z.string().nonempty(),
		value: z.string().nonempty(),
	})
	.refine((value) => value.key.toLowerCase() !== 'authorization', {
		message: 'Cannot set Authorization header',
	})

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
			customHeaders: z.array(headerSchema).optional(),
		})
		.transform((data) => {
			const baseConfig =
				data.authMode !== 'default'
					? {
							auth: data.token
								? { bearer: data.token as string }
								: data.basicUser
									? {
											basic: {
												username: data.basicUser as string,
												password: data.basicPassword as string,
											},
										}
									: undefined,
						}
					: undefined

			return {
				...data,
				stumpOPDS: data.kind === 'stump' ? data.stumpOPDS : false,
				config:
					!!data.customHeaders && data.customHeaders.length > 0
						? {
								...baseConfig,
								customHeaders: data.customHeaders.reduce(
									(acc, { key, value }) => ({
										...acc,
										[key]: value,
									}),
									{},
								),
							}
						: baseConfig,
			}
		})
type AddOrEditServerSchema = z.infer<ReturnType<typeof createSchema>>
