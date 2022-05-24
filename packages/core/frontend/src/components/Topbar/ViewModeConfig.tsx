import React from 'react';
import { ButtonGroup, useColorModeValue } from '@chakra-ui/react';
import { Rows, SquaresFour } from 'phosphor-react';
import { IconButton } from '~components/ui/Button';

interface ViewModeConfigProps {
	viewAsGrid: boolean;
	onChange: (mode: 'GRID' | 'LIST') => void;
}

export default function ViewModeConfig({ viewAsGrid, onChange }: ViewModeConfigProps) {
	return (
		<ButtonGroup isAttached>
			<IconButton
				onClick={() => onChange('GRID')}
				title="View as grid"
				variant="solid"
				bg={useColorModeValue(
					viewAsGrid ? 'blackAlpha.200' : 'gray.150',
					// viewAsGrid ? 'whiteAlpha.200' : 'gray.800',
					viewAsGrid ? 'whiteAlpha.50' : 'whiteAlpha.200',
				)}
			>
				<SquaresFour className="text-lg" weight="regular" />
			</IconButton>

			<IconButton
				onClick={() => onChange('LIST')}
				title="View as list"
				variant="solid"
				bg={useColorModeValue(
					viewAsGrid ? 'gray.150' : 'blackAlpha.200',
					// viewAsGrid ? 'gray.800' : 'whiteAlpha.200',
					viewAsGrid ? 'whiteAlpha.200' : 'whiteAlpha.50',
				)}
			>
				<Rows className="text-lg" weight="regular" />
			</IconButton>
		</ButtonGroup>
	);
}
