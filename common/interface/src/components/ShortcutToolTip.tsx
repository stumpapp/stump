import { HStack, Kbd } from '@chakra-ui/react';
import ToolTip, { ToolTipProps } from '../ui/ToolTip';

interface ShortcutToolTipProps extends ToolTipProps {
	shortcutAction?: string;
	keybind: string[];
}

export default function ShortcutToolTip({
	keybind,
	shortcutAction,
	...props
}: ShortcutToolTipProps) {
	let label = (
		<HStack spacing={1}>
			{keybind.map((key) => (
				<Kbd key={key} h={5} w={5} className="flex items-center justify-center">
					{key}
				</Kbd>
			))}
		</HStack>
	);

	if (shortcutAction) {
		label = (
			<div className="flex items-center space-x-1">
				<span>{shortcutAction}</span> <span>·</span> {label}
			</div>
		);
	}

	return <ToolTip {...props} label={label} />;
}
