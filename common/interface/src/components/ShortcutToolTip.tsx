import { Kbd } from '@chakra-ui/react';
import ToolTip, { ToolTipProps } from '../ui/ToolTip';

interface ShortcutToolTipProps extends ToolTipProps {
	shortcutAction?: string;
	keybind: string;
}

export default function ShortcutToolTip({
	keybind,
	shortcutAction,
	...props
}: ShortcutToolTipProps) {
	let label = <Kbd p={0.5}>{keybind}</Kbd>;

	if (shortcutAction) {
		label = (
			<div className="flex items-center space-x-1">
				<span>{shortcutAction}</span> <span>·</span> {label}
			</div>
		);
	}

	return <ToolTip {...props} label={label} />;
}
