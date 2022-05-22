import { ButtonGroup } from '@chakra-ui/react';
import { Rows, SquaresFour } from 'phosphor-react';
import React, { useState } from 'react';
import { IconButton } from '~components/ui/Button';

export default function ViewModeConfig() {
	const [fakeState, setFakeState] = useState(false);

	function toggle() {
		setFakeState((prev) => !prev);
	}

	return (
		<ButtonGroup isAttached>
			<IconButton onClick={toggle} title="View as grid" variant={fakeState ? 'solid' : 'outline'}>
				<SquaresFour className="text-lg" weight="regular" />
			</IconButton>

			<IconButton onClick={toggle} title="View as list" variant={fakeState ? 'outline' : 'solid'}>
				<Rows className="text-lg" weight="regular" />
			</IconButton>
		</ButtonGroup>
	);
}
