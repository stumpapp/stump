import React from 'react';
import {
	Box,
	Stat,
	StatHelpText,
	StatLabel,
	StatNumber,
	useColorModeValue,
} from '@chakra-ui/react';
import { useCountUp } from 'use-count-up';

export interface AnimatedStatProps {
	value: number;
	label: string;
	helpText?: string;
	unit?: string;
	duration?: number;
	round?: boolean;
	enabled?: boolean;
}

// TODO: prop for animateOnce or something...
export default function AnimatedStat({
	value,
	label,
	helpText,
	unit,
	duration = 1.5,
	round = true,
	enabled = true,
}: AnimatedStatProps) {
	const { value: currentValue } = useCountUp({
		isCounting: enabled,
		end: value,
		duration,
		formatter: (value) => {
			if (round) {
				return Math.round(value).toLocaleString();
			}

			return value.toLocaleString();
		},
	});

	return (
		<Box p={3} rounded="md" _hover={{ bg: useColorModeValue('gray.150', 'gray.800') }}>
			<Stat>
				<StatLabel>{label}</StatLabel>
				<StatNumber>
					{currentValue}
					{unit ? ` ${unit}` : ''}
				</StatNumber>
				{helpText && <StatHelpText>{helpText}</StatHelpText>}
			</Stat>
		</Box>
	);
}
