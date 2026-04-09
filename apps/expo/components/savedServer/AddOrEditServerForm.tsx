import { zodResolver } from '@hookform/resolvers/zod'
import { checkOPDSURL, checkUrl, formatApiURL } from '@stump/sdk'
import { GlassView } from 'expo-glass-effect'
import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import { Check, X } from 'lucide-react-native'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form'
import { Alert, FocusEvent, Platform, Pressable, View } from 'react-native'
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { match, P } from 'ts-pattern'
import { z } from 'zod'

import { useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore, useSavedServers } from '~/stores'
import { SavedServerWithConfig } from '~/stores/savedServer'

import { DottedLine } from '../book/overview/DottedLine'
import { Button, Heading, Input, Label, Loader, Switch, Text } from '../ui'
import { HeaderButton } from '../ui/header-button/header-button'
import { SegmentedPicker } from '../ui/segmented-picker/segmented-picker'

type Props = {
	editingServer?: SavedServerWithConfig | null
	onSubmit: (data: AddOrEditServerSchema) => void
	onClose: () => void
	onInputFocused?: (e: FocusEvent) => void
}

export default function AddOrEditServerForm({
	editingServer,
	onSubmit,
	onClose,
	onInputFocused,
}: Props) {
	const colors = useColors()
	const { t } = useTranslate()
	const { savedServers, stumpEnabled } = useSavedServers()

	const { control, handleSubmit, ...form } = useForm<AddOrEditServerSchema>({
		defaultValues: getDefaultValues(stumpEnabled, editingServer),
		resolver: zodResolver(
			createSchema(
				savedServers.map(({ name }) => name).filter((name) => name !== editingServer?.name),
				t,
			),
		),
	})
	const { errors } = useFormState({ control })

	const headerSchema = createHeaderSchema(t)

	const maskURLs = usePreferencesStore((state) => state.maskURLs)

	const [didConnect, setDidConnect] = useState(false)
	const [isCheckingConnection, setIsCheckingConnection] = useState(false)

	const [kind, url] = useWatch({ control, name: ['kind', 'url'] })

	// Note: Internally v1 is referred to as legacy. Stump was also developed with v2 in mind, and so
	// "regressing" to v1 felt like adding "legacy" support. I obviously understand that v1.2 is WILDY used.
	// On the UI, I will only refer to versions explicitly.
	const [opdsVersion, setOpdsVersion] = useState<'v1' | 'v2'>(() =>
		kind === 'opds-legacy' ? 'v1' : 'v2',
	)

	const broadKind = useMemo(() => (kind === 'stump' ? 'stump' : 'opds'), [kind])

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

	const [isAddingHeader, setIsAddingHeader] = useState(false)

	const [newHeaderKey, setNewHeaderKey] = useState('')
	const [newHeaderValue, setNewHeaderValue] = useState('')

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

	const [defaultServer, stumpOPDS, authMode] = useWatch({
		control,
		name: ['defaultServer', 'stumpOPDS', 'authMode'],
	})

	const renderAuthMode = () => {
		if (authMode === 'default') {
			return (
				<View className="squircle rounded-lg p-3 border border-dashed border-edge">
					<Text className="text-foreground-muted">{t(getKey('auth.default.description'))}</Text>
				</View>
			)
		} else if (authMode === 'basic') {
			return (
				<Fragment>
					<Controller
						control={control}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t('common.username')}
								autoCorrect={false}
								autoCapitalize="none"
								placeholder="oromei"
								onBlur={onBlur}
								onChangeText={onChange}
								value={value}
								errorMessage={errors.basicUser?.message}
								onFocus={onInputFocused}
							/>
						)}
						name="basicUser"
					/>

					<Controller
						control={control}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t('common.password')}
								autoCorrect={false}
								autoCapitalize="none"
								placeholder="*************"
								secureTextEntry
								onBlur={onBlur}
								onChangeText={onChange}
								value={value}
								errorMessage={errors.basicPassword?.message}
								onFocus={onInputFocused}
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
							placeholder={t(getKey('auth.token.placeholder'))}
							onBlur={onBlur}
							onChangeText={onChange}
							value={value}
							errorMessage={errors.token?.message}
							secureTextEntry
							onFocus={onInputFocused}
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
		(e: FocusEvent) => {
			// @ts-expect-error: It's fine
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

	const insets = useSafeAreaInsets()

	// TODO: imperative handle for the form so we can put the header buttons in the containing sheet, utilizing
	// `header` properly so it doesn't hide when scrolled
	return (
		<View
			className="gap-5 w-full"
			style={{ paddingBottom: Platform.OS === 'android' ? 32 : insets.bottom }}
		>
			<View className="pb-2 flex-row items-center justify-between">
				<HeaderButton
					ios={{ variant: 'glass' }}
					icon={{ ios: 'xmark', android: X }}
					onPress={onClose}
				/>

				<HeaderButton
					ios={{ variant: 'glassProminent' }}
					android={{ variant: 'prominent' }}
					onPress={handleSubmit(onSubmit)}
					disabled={editingServer ? !isUpdateReady : false}
					icon={{ ios: 'checkmark', android: Check }}
				/>
			</View>

			<View>
				<Heading size="lg" className="font-bold leading-6">
					{editingServer ? t(getKey('editServer.title')) : t(getKey('addServer.title'))}
				</Heading>
				<Text className="text-foreground-muted">
					{t(getKey(editingServer ? 'editServer.subtitle' : 'addServer.subtitle'))}
				</Text>
			</View>

			<View className="w-full flex-row items-center justify-between">
				<Text className="text-base font-medium text-foreground-muted">{t(getKey('kind'))}</Text>

				<SegmentedPicker
					value={broadKind}
					options={[
						{ label: 'Stump', value: 'stump' },
						{ label: 'OPDS', value: 'opds' },
					]}
					onValueChange={(v) => form.setValue('kind', v as 'stump' | 'opds' | 'opds-legacy')}
				/>
			</View>

			{broadKind === 'opds' && (
				<View className="w-full flex-row items-center justify-between">
					<Text className="text-base font-medium text-foreground-muted">
						OPDS {t('common.version')}
					</Text>

					<SegmentedPicker
						value={opdsVersion}
						options={[
							{ label: 'v1.2', value: 'v1' },
							{ label: 'v2.0', value: 'v2' },
						]}
						onValueChange={(v) => {
							setOpdsVersion(v as 'v1' | 'v2')
							form.setValue('kind', v === 'v1' ? 'opds-legacy' : 'opds')
						}}
					/>
				</View>
			)}

			<Controller
				control={control}
				rules={{
					required: true,
				}}
				render={({ field: { onChange, onBlur, value } }) => (
					<Input
						label={t('common.name')}
						autoCorrect={false}
						autoCapitalize="none"
						placeholder={t(getKey('serverNamePlaceholder'))}
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
						label={t(kind === 'stump' ? 'common.url' : getKey('catalogUrl'))}
						autoCorrect={false}
						autoCapitalize="none"
						placeholder={`https://stump.my-domain.cloud${kind !== 'stump' ? `/opds/${opdsVersion === 'v1' ? 'v1.2' : 'v2.0'}/catalog` : ''}`}
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

			<View className="gap-1 my-2 flex-row items-center">
				<DottedLine />
				<Pressable disabled={!url} onPress={checkConnection}>
					<GlassView
						glassEffectStyle="regular"
						style={{ borderRadius: 999, opacity: !url ? 0.65 : 1 }}
						tintColor={didConnect ? colors.fill.success.secondary : undefined}
						isInteractive={!!url}
						// only affects android
						className={cn('border border-edge bg-background-surface', {
							'border-transparent bg-transparent': isCheckingConnection,
							'bg-fill-success-secondary': didConnect,
						})}
					>
						<View className="px-4 py-2">
							{isCheckingConnection ? (
								<View className="h-6 w-6 items-center justify-center">
									<Loader />
								</View>
							) : (
								<Text className="text-base font-semibold">
									{t(getKey(didConnect ? 'didConnect' : 'checkConnection'))}
								</Text>
							)}
						</View>
					</GlassView>
				</Pressable>
				<DottedLine inverted />
			</View>

			<View className="gap-2 w-full">
				<Text className="text-base font-medium text-foreground-muted">
					{t(getKey('customHeaders.label'))}
				</Text>

				{formValues.customHeaders?.length && (
					<View className="squircle rounded-lg w-full overflow-hidden border border-edge">
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
										'gap-2 p-3 tablet:p-4 w-full flex-row items-center justify-between',
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

				{isAddingHeader ? (
					<View className="squircle gap-2 rounded-2xl p-3 border border-edge">
						<Input
							label={t('common.name')}
							autoCorrect={false}
							autoCapitalize="none"
							placeholder="X-Biz-Baz"
							onChangeText={setNewHeaderKey}
						/>
						<Input
							label={t('common.value')}
							autoCorrect={false}
							autoCapitalize="none"
							placeholder={t('common.value').toLowerCase()}
							onChangeText={setNewHeaderValue}
						/>
						<View className="gap-4 flex-row justify-end">
							<Button variant="outline" size="sm" roundness="full" onPress={onCancelAddHeader}>
								<Text>{t('common.cancel')}</Text>
							</Button>
							<Button variant="brand" size="sm" roundness="full" onPress={addNewHeader}>
								<Text>{t('common.save')}</Text>
							</Button>
						</View>
					</View>
				) : (
					<Button roundness="full" variant="outline" onPress={() => setIsAddingHeader(true)}>
						<Text>{t(getKey('customHeaders.addHeader'))}</Text>
					</Button>
				)}
			</View>

			<View className="w-full flex-row items-center justify-between">
				<Text className="text-base font-medium text-foreground-muted">
					{t(getKey('auth.label'))}
				</Text>

				<Controller
					control={control}
					render={({ field: { onChange, value } }) => (
						<SegmentedPicker
							value={value}
							options={[
								{ label: t(getKey('auth.default.label')), value: 'default' },
								{ label: t(getKey('auth.basic')), value: 'basic' },
								{ label: t(getKey('auth.token.label')), value: 'token' },
							]}
							onValueChange={(v) => onChange(v as 'default' | 'basic' | 'token')}
						/>
					)}
					name="authMode"
				/>
			</View>

			{renderAuthMode()}

			<View className="gap-6 w-full">
				<Text className="text-base font-medium text-foreground-muted">{t('common.options')}</Text>
				<View className="gap-6 w-full flex-row items-center justify-between">
					<Label
						nativeID="defaultServer"
						onPress={() => {
							form.setValue('defaultServer', !defaultServer)
						}}
						disabled={kind !== 'stump'}
					>
						{t(getKey('setAsDefaultServer'))}
					</Label>

					<Switch
						checked={defaultServer}
						onCheckedChange={(value) => form.setValue('defaultServer', value)}
						nativeID="defaultServer"
						disabled={kind !== 'stump'}
					/>
				</View>

				{kind === 'stump' && (
					<View className="gap-6 w-full flex-row items-center justify-between">
						<Label
							nativeID="stumpOPDS"
							onPress={() => {
								form.setValue('stumpOPDS', !stumpOPDS)
							}}
							disabled={kind !== 'stump'}
						>
							{t(getKey('enableOPDS'))}
						</Label>

						<Switch
							checked={stumpOPDS}
							onCheckedChange={(value) => form.setValue('stumpOPDS', value)}
							nativeID="stumpOPDS"
							disabled={kind !== 'stump'}
						/>
					</View>
				)}
			</View>
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
				className="w-14 h-full items-center justify-center bg-fill-danger"
				onPress={onDelete}
			>
				{({ pressed }) => (
					<Text className={cn({ 'opacity-80': pressed })}>{t('common.delete')}</Text>
				)}
			</Pressable>
		</Reanimated.View>
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
		defaultServer: editingServer.defaultServer ?? false,
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

const createHeaderSchema = (t: (key: string) => string) =>
	z
		.object({
			key: z.string().nonempty(),
			value: z.string().nonempty(),
		})
		.refine((value) => value.key.toLowerCase() !== 'authorization', {
			message: t(getKey('validations.cannotSetAuthorizationHeader')),
		})

const createSchema = (names: string[], t: (key: string) => string) =>
	z.object({
		name: z
			.string()
			.nonempty()
			.min(1)
			.refine((value) => !names.includes(value), {
				message: t(getKey('validations.nameAlreadyExists')),
			}),
		url: z.string().url(),
		kind: z
			.union([z.literal('stump'), z.literal('opds'), z.literal('opds-legacy')])
			.default('stump'),
		defaultServer: z.boolean().default(false),
		stumpOPDS: z.boolean().default(false),
		authMode: z
			.union([z.literal('token'), z.literal('basic'), z.literal('default')])
			.default('default'),
		token: z.string().optional(),
		basicUser: z.string().optional(),
		basicPassword: z.string().optional(),
		customHeaders: z.array(createHeaderSchema(t)).optional(),
	})
export type AddOrEditServerSchema = z.infer<ReturnType<typeof createSchema>>

export const transformFormData = (data: AddOrEditServerSchema) => {
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

	const config =
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
			: baseConfig

	return {
		...omit(data, ['authMode', 'token', 'basicUser', 'basicPassword', 'customHeaders']),
		stumpOPDS: data.kind === 'stump' ? data.stumpOPDS : false,
		config,
	}
}

const LOCALE_BASE = 'addOrEditServer'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
