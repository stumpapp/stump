import { PropsWithChildren } from 'react'
import { View } from 'react-native'
import { Text } from '~/components/ui'

type Props = PropsWithChildren<{
	label: string
}>

export default function InfoSection({ label, children }: Props) {
	return (
		<View className="flex w-full gap-2">
			<Text className="text-lg text-foreground-muted">{label}</Text>
			<View className="flex flex-col gap-2 rounded-lg bg-background-surface p-3">{children}</View>
		</View>
	)
}
