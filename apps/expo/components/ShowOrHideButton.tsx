import { Eye, EyeOff } from 'lucide-react-native'

import { Button, Icon } from './ui'

type ShowOrHideButtonProps = {
	show: boolean
	setShow: (show: boolean) => void
	disabled?: boolean
}

export function ShowOrHideButton({ show, setShow, ...buttonProps }: ShowOrHideButtonProps) {
	return (
		<Button
			size="sm"
			roundness="full"
			variant="outline"
			onPress={() => setShow(!show)}
			{...buttonProps}
		>
			{show ? (
				<Icon as={EyeOff} className="w-5 h-5 text-foreground-muted" />
			) : (
				<Icon as={Eye} className="w-5 h-5 text-foreground-muted" />
			)}
		</Button>
	)
}
