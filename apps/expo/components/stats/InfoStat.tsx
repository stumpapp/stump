import { View } from 'react-native'

import { Heading, Text } from '~/components/ui'

type Props = {
	size?: 'sm' | 'md' | 'lg'
	label: string
	value: string
}

const SIZES = {
	sm: {
		heading: 'default',
		value: 'sm',
	},
	md: {
		heading: 'lg',
		value: 'default',
	},
	lg: {
		heading: 'xl',
		value: 'lg',
	},
} as const

export default function InfoStat({ size = 'sm', label, value }: Props) {
	return (
		<View className="flex items-center justify-center">
			<Heading size={SIZES[size].heading} className="font-medium">
				{value}
			</Heading>
			<Text size={SIZES[size].value} className="shrink-0 text-foreground-muted">
				{label}
			</Text>
		</View>
	)
}
