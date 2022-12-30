import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerOverlay,
	Stack,
	useColorModeValue,
	useDisclosure,
} from '@chakra-ui/react'
import { List } from 'phosphor-react'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import Button from '../../ui/Button'
import { SidebarContent } from './Sidebar'

export default function MobileDrawer() {
	const location = useLocation()

	const btnRef = useRef(null)
	const { isOpen, onOpen, onClose } = useDisclosure()

	useEffect(() => {
		if (isOpen) {
			onClose()
		}
	}, [location])

	return (
		<>
			<Button
				// @ts-ignore: FIXME
				ref={btnRef}
				display={{ base: 'flex', md: 'none' }}
				variant="ghost"
				size="sm"
				p={0.5}
				onClick={onOpen}
			>
				<List size="1rem" />
			</Button>

			<Drawer isOpen={isOpen} placement="left" onClose={onClose} finalFocusRef={btnRef}>
				<DrawerOverlay />
				<DrawerContent bg={useColorModeValue('white', 'gray.800')}>
					<Stack
						as={DrawerBody}
						display="flex"
						flexShrink={0}
						py={4}
						h="full"
						w="full"
						px={2}
						zIndex={10}
						spacing={4}
					>
						<SidebarContent />
					</Stack>
				</DrawerContent>
			</Drawer>
		</>
	)
}
