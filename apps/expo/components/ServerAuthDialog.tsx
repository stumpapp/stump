import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLoginOrRegister } from '@stump/client'
import { LoginResponse } from '@stump/sdk'
import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import { z } from 'zod'

import { useUserStore } from '~/stores'

import { Button, Input, Text } from './ui'
import { BottomSheet } from './ui/bottom-sheet'

type ServerAuthDialogProps = {
	isOpen: boolean
	onClose: (resp?: LoginResponse) => void
}

export default function ServerAuthDialog({ isOpen, onClose }: ServerAuthDialogProps) {
	const setUser = useUserStore((state) => state.setUser)
	const { isClaimed, isCheckingClaimed, loginUser, isLoggingIn } = useLoginOrRegister({
		onSuccess: setUser,
		onError: console.error,
	})

	const ref = useRef<BottomSheetModal | null>(null)
	const snapPoints = useMemo(() => ['95%'], [])
	const animatedIndex = useSharedValue<number>(0)
	const animatedPosition = useSharedValue<number>(0)

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
			ref.current?.present()
		} else {
			ref.current?.dismiss()
		}
	}, [isOpen])

	const handleChange = useCallback(
		(index: number) => {
			if (index === -1 && isOpen) {
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

	if (!isClaimed && !isCheckingClaimed) {
		throw new Error('Not supported yet')
	}

	return (
		<View>
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
							<Input
								label="Username"
								autoCorrect={false}
								autoCapitalize="none"
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
							<Input
								label="Password"
								secureTextEntry
								autoCorrect={false}
								autoCapitalize="none"
								placeholder="Password"
								onBlur={onBlur}
								onChangeText={onChange}
								value={value}
								errorMessage={errors.password?.message}
							/>
						)}
						name="password"
					/>

					<Button
						onPress={handleSubmit(onSubmit)}
						className="mt-4 w-full"
						disabled={isLoggingIn}
						variant="secondary"
					>
						<Text>Login</Text>
					</Button>
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
