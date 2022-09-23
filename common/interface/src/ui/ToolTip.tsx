import {
	Tooltip as ChakraToolTip,
	TooltipProps as ChakraToolTipProps,
	useColorModeValue,
} from '@chakra-ui/react';

export interface ToolTipProps extends ChakraToolTipProps {}

export default function ToolTip(props: ToolTipProps) {
	return (
		<ChakraToolTip
			{...props}
			bg={useColorModeValue('gray.100', 'gray.700')}
			color={useColorModeValue('gray.900', 'gray.100')}
			py={1}
			shadow="md"
			rounded="md"
			fontSize="xs"
			openDelay={300}
		/>
	);
}
