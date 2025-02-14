import { zodResolver } from '@hookform/resolvers/zod'
import { checkUrl, formatApiURL } from '@stump/sdk'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form'
import { View } from 'react-native'
import { z } from 'zod'
import isEqual from 'lodash/isEqual'

import { usePreferencesStore, useSavedServers } from '~/stores'

import { Button, icons, Input, Label, Switch, Tabs, Text } from '../ui'
import { SavedServerWithConfig } from '~/stores/savedServer'
import { match, P } from 'ts-pattern'
import { cn } from '~/lib/utils'

const {} = icons

type Props = {
	editingServer?: SavedServerWithConfig | null
	onSubmit: (data: AddServerSchema) => void
}

export default function AddOrEditServerForm({ editingServer, onSubmit }: Props) {
	const { savedServers, getServerConfig } = useSavedServers()

	const { control, handleSubmit, ...form } = useForm<AddServerSchema>({
		defaultValues: getDefaultValues(editingServer),
		resolver: zodResolver(createSchema(savedServers.map(({ name }) => name))),
	})
	const { errors } = useFormState({ control })

	const maskURLs = usePreferencesStore((state) => state.maskURLs)

	const [didConnect, setDidConnect] = useState(false)
	const url = form.watch('url')
	const checkConnection = useCallback(async () => {
		const isValid = await checkUrl(formatApiURL(url, 'v1'))
		if (!isValid) {
			form.setError('url', {
				type: 'manual',
				message: 'Failed to connect to server',
			})
		} else {
			setDidConnect(true)
		}
	}, [url, form])

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
		() => !isEqual(getDefaultValues(editingServer), formValues),
		[formValues, editingServer],
	)

	return (
		<View className="w-full gap-4">
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
						secureTextEntry={maskURLs}
					/>
				)}
				name="url"
			/>

			<Button
				className={cn('-mt-1 rounded-lg bg-background-surface p-2', {
					'opacity-70': !url,
					'bg-fill-success-secondary': didConnect,
				})}
				disabled={!url}
				onPress={checkConnection}
			>
				<Text>{didConnect ? 'Connected' : 'Check connection'}</Text>
			</Button>

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

			<Button
				variant="brand"
				className="mt-4 w-full"
				onPress={handleSubmit(onSubmit)}
				disabled={!editingServer || !isUpdateReady}
			>
				<Text>{editingServer ? 'Update' : 'Add'} server</Text>
			</Button>
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

const getDefaultValues = (editingServer?: SavedServerWithConfig | null) => {
	if (!editingServer) {
		return defaultValues
	}

	let configs = match(editingServer.config?.auth)
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
		...configs,
	} as AddServerSchema
}

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
			config:
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
					: undefined,
		}))
type AddServerSchema = z.infer<ReturnType<typeof createSchema>>
