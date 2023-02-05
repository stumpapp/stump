import { Heading, HStack, Text, useColorModeValue } from '@chakra-ui/react'
import { Link } from 'react-router-dom'

interface Props {
	id: string
	title: string
	subtitle?: string | null
	href: string
	even?: boolean
}

// Used to render the items in the series list and media list
export default function ListItem({ id, title, subtitle, href, even }: Props) {
	return (
		<HStack
			tabIndex={0}
			as={Link}
			title={title}
			to={href}
			key={id}
			bg={useColorModeValue(even ? 'transparent' : 'gray.200', even ? 'transparent' : 'gray.750')}
			_focus={{
				boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
				outline: 'none',
			}}
			_hover={{
				bg: useColorModeValue('gray.250', 'gray.700'),
			}}
			p={2}
			h={'40px'}
			rounded="lg"
			className="flex w-full"
		>
			<Heading
				noOfLines={1}
				size="sm"
				w={subtitle ? { base: '50%', lg: '25%', md: '30%', xl: '23%' } : 'full'}
				className="shrink-0"
			>
				{title}
			</Heading>

			<Text
				fontSize="sm"
				className="flex-1"
				noOfLines={1}
				color={useColorModeValue('gray.500', 'gray.450')}
			>
				{subtitle}
			</Text>
		</HStack>
	)
}
