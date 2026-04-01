import { ConfirmationModal, Text, useBoolean } from '@stump/components'
import { LogOut } from 'lucide-react'

import { useAppContext } from '@/context'

export default function SignOut() {
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
				<button
					className="gap-1.5 px-2 flex h-[2.35rem] w-full items-center bg-sidebar-overlay/50 text-foreground-subtle transition-colors duration-150 outline-none hover:bg-sidebar-overlay-hover"
					onClick={on}
				>
					<LogOut className="h-4 w-4" />
					<Text size="sm" className="select-none">
						Sign out
					</Text>
				</button>
			}
		/>
	)
}
