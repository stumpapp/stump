import {
	Drawer,
	DrawerBody,
	DrawerCloseButton,
	DrawerContent,
	DrawerOverlay,
	Stack,
	useColorModeValue,
	useDisclosure,
	usePrevious,
} from '@chakra-ui/react'
import { List } from 'phosphor-react'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import Button from '../../ui/Button'
import { SidebarContent } from './Sidebar'

export default function MobileDrawer() {
	const { isOpen, onOpen, onClose } = useDisclosure()

	const location = useLocation()
	const previousLocation = usePrevious(location)
	const btnRef = useRef(null)

	useEffect(() => {
		if (previousLocation?.pathname !== location.pathname && isOpen) {
			onClose()
		}
	}, [location, previousLocation, isOpen, onClose])

	// NOTE: this div supresses a popper.js warning about not being able to calculate margins
	return (
		<div>
			<Button
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
					<DrawerCloseButton zIndex={1000} />

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
		</div>
	)
}
