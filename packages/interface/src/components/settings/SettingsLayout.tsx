import { Box, useColorModeValue, VStack } from '@chakra-ui/react'
import { useUserStore } from '@stump/client'
import { Outlet } from 'react-router-dom'

import SettingsNavigation from './SettingsNavigation'

export default function SettingsLayout() {
	const user = useUserStore((store) => store.user)

	const bgColor = useColorModeValue('gray.75', 'gray.900')

	if (!user) {
		return null
	}

	return (
		<VStack h="full" w="full">
			<SettingsNavigation user={user} />
			<Box w="full" h="full" bg={bgColor} p="4">
				<Outlet />
			</Box>
		</VStack>
	)
}
