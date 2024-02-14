import { Home } from 'lucide-react-native'
import React, { useState } from 'react'
import { Text, TouchableOpacity } from 'react-native'

import { View } from './primitives'
import { cx } from './utils'

export default function CenterTabSelector() {
	const [isOpen, setIsOpen] = useState(false)

	const handleShortPress = () => {
		if (isOpen) {
			setIsOpen(false)
		} else {
			// TODO: navigate to currently selected tab
		}
	}

	return (
		<View className="relative items-center">
			<View
				className={cx('absolute bottom-10 rounded-lg bg-white shadow-lg', {
					hidden: !isOpen,
				})}
			>
				{OPTIONS.map((option) => (
					<TouchableOpacity key={option.label} onPress={handleShortPress}>
						<View className="p-4">
							<View className="flex items-center">
								<View>
									<Home size={24} />
								</View>
								<View className="text-lg">
									<Text>{option.label}</Text>
								</View>
							</View>
						</View>
					</TouchableOpacity>
				))}
			</View>

			<TouchableOpacity onPress={handleShortPress} onLongPress={() => setIsOpen(!isOpen)}>
				<Home size={32} />
			</TouchableOpacity>
		</View>
	)
}

const OPTIONS = [
	{
		label: 'Home',
	},
	{
		label: 'Smart Lists',
	},
	{
		label: 'Book Clubs',
	},
]
