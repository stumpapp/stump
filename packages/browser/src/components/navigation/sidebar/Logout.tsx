import { ConfirmationModal, IconButton, ToolTip, useBoolean } from '@stump/components'
import { LogOut } from 'lucide-react'

import { useAppContext } from '@/context'

type Props = {
	trigger?: (setOpen: (state: boolean) => void) => JSX.Element
}

export default function Logout({ trigger }: Props) {
	const { logout } = useAppContext()
	const [isOpen, { on, off }] = useBoolean()

	async function handleLogout() {
		off()
		logout()
	}

	return (
		<ConfirmationModal
			title="Sign out"
			description="Are you sure you want sign out?"
			confirmText="Sign out"
			confirmVariant="danger"
			isOpen={isOpen}
			onClose={off}
			onConfirm={handleLogout}
			trigger={
				<ToolTip content="Sign Out">
					{trigger ? (
						trigger(on)
					) : (
						<IconButton
							className="hover:text-foreground-500 text-foreground-subtle"
							onClick={on}
							aria-label="Sign Out"
						>
							<LogOut />
						</IconButton>
					)}
				</ToolTip>
			}
		/>
	)
}
