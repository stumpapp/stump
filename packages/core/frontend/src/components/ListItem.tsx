import { Heading, HStack, Text, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import { Link } from 'react-router-dom';

interface Props {
	id: string;
	title: string;
	subtitle?: string;
	href: string;
	even?: boolean;
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
				isTruncated
				size="sm"
				w={{ base: '50%', md: '30%', lg: '25%', xl: '23%' }}
				className="shrink-0"
			>
				{title}
			</Heading>
			<Text
				fontSize="sm"
				className="flex-1"
				isTruncated
				color={useColorModeValue('gray.500', 'gray.450')}
			>
				{subtitle}
				{/* The Amazing Spider-Man series beginning with a new No. 1, replacing long-time writer Dan
				Slott, as part of the Fresh Start relaunch that July.[106] The first five-issue story arc
				was titled 'Back to Basics.' During the Back to Basics story, Kindred, a mysterious villain
				with some relation to Peter's past, was introduced. The first major story under Spencer was
				Hunted which ran through issues 16 through 23, the story also included four ".HU" issues for
				issues 16, 18, 19, and 20. The end of the story saw the death of long-running Spider-Man
				villain Kraven the Hunter, being replaced by his clone son, The Last Son of Kraven. */}
			</Text>
		</HStack>
	);
}
