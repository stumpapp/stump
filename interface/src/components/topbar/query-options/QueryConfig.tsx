// import { useQueryParamStore } from '@stump/client'
import { Button, Popover, Text } from '@stump/components'
// import { mediaOrderByOptions, seriesOrderByOptions } from '@stump/types'
// import { useMemo } from 'react'
// import { useLocation } from 'react-router'

// function QueryConfigSection({ children }: { children: React.ReactNode }) {
// 	return (
// 		<Stack py={2} px={4} w="full">
// 			{children}
// 		</Stack>
// 	)
// }

// FIXME: I removed all of the chakra stuff from this file, effectively making it
// useless lol. I removed this functionality from this feature branch, as I hated the
// implementation using the useQueryParamStore. Once a better pattern is finalized,
// this component will need to be re-implemented.
export default function QueryConfig() {
	// const { order_by, setOrderBy, direction, setDirection } = useQueryParamStore((state) => ({
	// 	direction: state.direction,
	// 	order_by: state.order_by,
	// 	setDirection: state.setDirection,
	// 	setOrderBy: state.setOrderBy,
	// }))

	// const location = useLocation()

	// function intoOptions(keys: string[]) {
	// 	return keys.map((key) => ({
	// 		// capitalize first letter of each word, adding spaces between words. e.g. "library_id" -> "Library Id"
	// 		label: key
	// 			.replace(/_/g, ' ')
	// 			.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1)),
	// 		value: key,
	// 	}))
	// }

	// FIXME: This will BREAK when switching between entities. For example, lets say
	// you're on the series overview page and you change the order by to "checksum".
	// When you navigate to the library overview page, the order by will still be
	// "checksum" even though it's not a valid option for the library overview page.
	// This will throw a 400 error when the API tries to send that request.
	// const orderByOptions = useMemo(() => {
	// 	// TODO: remove this from component, to reduce computation... also it is just ugly.
	// 	if (location.pathname.startsWith('/libraries')) {
	// 		return intoOptions(Object.keys(seriesOrderByOptions))
	// 	} else if (location.pathname.startsWith('/series')) {
	// 		return intoOptions(Object.keys(mediaOrderByOptions))
	// 	}

	// 	return null
	// }, [location.pathname])

	// const activeRadioFontColor = useColorModeValue('gray.800', 'gray.200')
	// const inActiveRadioFontColor = useColorModeValue('gray.600', 'gray.400')

	return (
		<Popover>
			<Popover.Trigger>
				<Button>Trigger</Button>
			</Popover.Trigger>
			<Popover.Content>
				<Text>Content! MAKE ME NOW!</Text>
			</Popover.Content>
		</Popover>
	)

	// return (
	// 	<Popover placement="bottom-start">
	// 		{({ isOpen }) => (
	// 			<React.Fragment>
	// 				<PopoverTrigger>
	// 					<Button
	// 						leftIcon={<Sliders />}
	// 						rightIcon={<CaretDown />}
	// 						py={0.5}
	// 						px={2}
	// 						size="sm"
	// 						shortcutAction={!isOpen ? 'View display options' : undefined}
	// 					>
	// 						Options
	// 					</Button>
	// 				</PopoverTrigger>
	// 				<PopoverContent>
	// 					<PopoverBody p={0} className="flex flex-col divide-y">
	// 						<QueryConfigSection>
	// 							<HStack justify="space-between">
	// 								<Heading className="min-w-[50%]" size="xs" fontWeight="medium">
	// 									Order by
	// 								</Heading>
	// 								<Select
	// 									placeholder="Select option"
	// 									size="sm"
	// 									rounded="md"
	// 									value={order_by}
	// 									onChange={(e) => setOrderBy(e.target.value)}
	// 								>
	// 									{orderByOptions?.map((option) => (
	// 										<option key={option.value} value={option.value}>
	// 											{option.label}
	// 										</option>
	// 									))}
	// 								</Select>
	// 							</HStack>

	// 							<HStack justify="space-between">
	// 								<Heading className="min-w-[50%]" size="xs" fontWeight="medium">
	// 									Order Direction
	// 								</Heading>
	// 								<RadioGroup
	// 									value={direction ?? 'asc'}
	// 									onChange={(val) => setDirection(val as Direction)}
	// 								>
	// 									<Stack spacing={3} direction="row">
	// 										<Radio size="sm" colorScheme="brand" value="asc">
	// 											{/* FIXME: the hover states are bad, hover should be on the radio NOT
	// 												just on the text. I really don't love chakra, can't wait to get rid of it.
	// 											*/}
	// 											<Text
	// 												color={
	// 													direction === 'asc' ? activeRadioFontColor : inActiveRadioFontColor
	// 												}
	// 												_hover={{
	// 													color: activeRadioFontColor,
	// 												}}
	// 												as="span"
	// 												className="text-xs"
	// 											>
	// 												Asc
	// 											</Text>
	// 										</Radio>
	// 										<Radio size="sm" colorScheme="brand" value="desc">
	// 											<Text
	// 												color={
	// 													direction === 'desc' ? activeRadioFontColor : inActiveRadioFontColor
	// 												}
	// 												_hover={{
	// 													color: activeRadioFontColor,
	// 												}}
	// 												as="span"
	// 												className="text-xs"
	// 											>
	// 												Desc
	// 											</Text>
	// 										</Radio>
	// 									</Stack>
	// 								</RadioGroup>
	// 							</HStack>
	// 						</QueryConfigSection>
	// 						<QueryConfigSection>
	// 							<HStack justify="space-between">
	// 								<Heading className="min-w-[50%]" size="xs" fontWeight="medium">
	// 									Show unsupported
	// 								</Heading>

	// 								<Switch size="sm" colorScheme="brand" />
	// 							</HStack>
	// 						</QueryConfigSection>
	// 					</PopoverBody>
	// 				</PopoverContent>
	// 			</React.Fragment>
	// 		)}
	// 	</Popover>
	// )
}
