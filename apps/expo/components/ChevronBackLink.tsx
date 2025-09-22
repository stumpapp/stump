import React from 'react'
import { Icon } from './ui/icon'
import { ChevronLeft } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { TouchableOpacity } from 'react-native'

export default function ChevronBackLink() {
	const router = useRouter()
	return (
		<TouchableOpacity onPress={() => router.back()}>
			<Icon as={ChevronLeft} className="text-foreground" size={24} />
		</TouchableOpacity>
	)
}
