import { HStack, useColorModeValue } from '@chakra-ui/react';
import { ArrowRight } from 'phosphor-react';
import React from 'react';

interface Props {
	href: string;
}

export default function MoreLink({ href }: Props) {
	return (
		<HStack
			as="a"
			href={href}
			spacing={2}
			alignItems="center"
			_hover={{ color: useColorModeValue('brand.500', 'brand.400') }}
		>
			<span>More</span> <ArrowRight size="1rem" />
		</HStack>
	);
}
