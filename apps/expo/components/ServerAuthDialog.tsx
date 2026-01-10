import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLoginOrRegister, useOidcConfig } from '@stump/client'
import { LoginResponse } from '@stump/sdk'
import { Eye, EyeOff } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { z } from 'zod'

import { useColors } from '~/lib/constants'
import { startOidcLogin } from '~/lib/sdk/auth'
import { useUserStore } from '~/stores'

import { useActiveServer } from './activeServer'
import { Button, Text } from './ui'
import { BottomSheet } from './ui/bottom-sheet'
import { Icon } from './ui/icon'

type ServerAuthDialogProps = {
	isOpen: boolean
	onClose: (resp?: LoginResponse) => void
}

export default function ServerAuthDialog({ isOpen, onClose }: ServerAuthDialogProps) {
	const setUser = useUserStore((state) => state.setUser)
	const { activeServer } = useActiveServer()
	const oidcConfig = useOidcConfig()
	const { isClaimed, isCheckingClaimed, loginUser, isLoggingIn } = useLoginOrRegister({
		onSuccess: setUser,
		onError: console.error,
	})

	const ref = useRef<BottomSheetModal | null>(null)
	const animatedIndex = useSharedValue<number>(0)
	const animatedPosition = useSharedValue<number>(0)

	const [isPasswordVisible, setIsPasswordVisible] = useState(false)
	const [isOidcLoading, setIsOidcLoading] = useState(false)
	const hasAuthSucceeded = useRef(false)

	const { colorScheme } = useColorScheme()

	const {
		control,
		formState: { errors },
		handleSubmit,
	} = useForm<LoginSchema>({
		resolver: zodResolver(schema),
	})

	useEffect(() => {
		if (isOpen) {
			hasAuthSucceeded.current = false
			ref.current?.present()
		} else {
			ref.current?.dismiss()
		}
	}, [isOpen])

	const handleChange = useCallback(
		(index: number) => {
			if (index === -1 && isOpen && !hasAuthSucceeded.current) {
				onClose()
			}
		},
		[isOpen, onClose],
	)

	const onSubmit = useCallback(
		async ({ username, password }: LoginSchema) => {
			try {
				const result = await loginUser({ password, username })
				if ('forUser' in result) {
					hasAuthSucceeded.current = true
					ref.current?.dismiss()
					onClose(result)
				} else {
					console.warn('Unexpected login response:', result)
				}
			} catch (error) {
				console.error(error)
			}
		},
		[loginUser, onClose],
	)

	const handleOidcLogin = useCallback(async () => {
		setIsOidcLoading(true)
		try {
			const result = await startOidcLogin({
				serverUrl: activeServer.url,
				saveToken: () => Promise.resolve(),
			})

			if (result) {
				setUser(result.forUser)
				hasAuthSucceeded.current = true
				ref.current?.dismiss()
				onClose(result)
			}
		} catch (error) {
			console.error('OIDC login error:', error)
		} finally {
			setIsOidcLoading(false)
		}
	}, [activeServer.url, setUser, onClose])

	if (!isClaimed && !isCheckingClaimed) {
		throw new Error('Not supported yet')
	}

	const insets = useSafeAreaInsets()
	const colors = useColors()

	return (
		<View>
			<BottomSheet.Modal
				ref={ref}
				topInset={insets.top}
				onChange={handleChange}
				backgroundStyle={{
					borderRadius: 24,
					borderCurve: 'continuous',
					overflow: 'hidden',
					borderWidth: 1,
					borderColor: colors.edge.DEFAULT,
					backgroundColor: colors.background.DEFAULT,
				}}
				keyboardBlurBehavior="restore"
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
				<BottomSheet.View className="flex-1 items-start gap-4 p-6">
					<View>
						<Text className="text-2xl font-bold leading-6">Login</Text>
						<Text className="text-base text-foreground-muted">
							You need to login to access this server
						</Text>
					</View>

					<Controller
						control={control}
						rules={{
							required: true,
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<BottomSheet.Input
								label="Username"
								autoCorrect={false}
								autoCapitalize="none"
								autoComplete="username"
								textContentType="username"
								placeholder="Username"
								onBlur={onBlur}
								onChangeText={onChange}
								value={value}
								errorMessage={errors.username?.message}
							/>
						)}
						name="username"
					/>

					<Controller
						control={control}
						rules={{
							required: true,
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<View className="w-full gap-1.5">
								<Text className="text-base font-medium text-foreground-muted">Password</Text>
								<View className="relative flex-row items-center">
									<BottomSheet.Input
										secureTextEntry={!isPasswordVisible}
										autoCorrect={false}
										autoCapitalize="none"
										autoComplete="password"
										textContentType="password"
										placeholder="Password"
										onBlur={onBlur}
										onChangeText={onChange}
										value={value}
										className="flex-1 pr-12"
									/>
									<Pressable
										onPress={() => setIsPasswordVisible(!isPasswordVisible)}
										className="absolute right-3 h-8 w-8 items-center justify-center"
									>
										<Icon
											as={isPasswordVisible ? EyeOff : Eye}
											size={20}
											className="text-foreground-muted"
										/>
									</Pressable>
								</View>
								{errors.password?.message && (
									<Text className="text-sm text-fill-danger">{errors.password.message}</Text>
								)}
							</View>
						)}
						name="password"
					/>

					<Button
						onPress={handleSubmit(onSubmit)}
						className="mt-4 w-full"
						disabled={isLoggingIn}
						variant="brand"
					>
						<Text>Login</Text>
					</Button>

					{oidcConfig?.enabled && (
						<View className="w-full pb-4">
							<View className="my-3 flex-row items-center">
								<View className="flex-1 border-t border-edge" />
								<Text className="mx-2 text-sm text-foreground-muted">Or</Text>
								<View className="flex-1 border-t border-edge" />
							</View>

							<Button
								onPress={handleOidcLogin}
								className="mt-4 w-full"
								disabled={isOidcLoading || isLoggingIn}
								variant="secondary"
							>
								<Text>Login with OIDC</Text>
							</Button>
						</View>
					)}
				</BottomSheet.View>
			</BottomSheet.Modal>
		</View>
	)
}

const schema = z.object({
	password: z.string().min(1, { message: 'Password must be at least 2 characters long' }),
	username: z.string().min(1, { message: 'Username is required' }),
})
type LoginSchema = z.infer<typeof schema>
