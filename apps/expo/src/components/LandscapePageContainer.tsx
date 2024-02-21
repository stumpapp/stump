import React from 'react'

import { View } from '@/components'

type Props = {
	children: React.ReactNode
	width: number
	height: number
}
export default function LandscapePage({ children, width, height }: Props) {
	return (
		<View className="flex items-center justify-center" style={{ height, width }}>
			{children}
		</View>
	)
}
