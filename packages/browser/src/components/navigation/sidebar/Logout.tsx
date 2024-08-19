import { authApi, serverQueryKeys } from '@stump/api'
import { invalidateQueries } from '@stump/client'
import { ConfirmationModal, IconButton, ToolTip, useBoolean } from '@stump/components'
import { LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import { useUserStore } from '@/stores'

type Props = {
	trigger?: (setOpen: (state: boolean) => void) => JSX.Element
}
export default function Logout({ trigger }: Props) {
	const [isOpen, { on, off }] = useBoolean()

	const setUser = useUserStore((store) => store.setUser)
	const navigate = useNavigate()

	async function handleLogout() {
		toast
			.promise(authApi.logout(), {
				error: 'There was an error logging you out. Please try again.',
				loading: null,
				success: 'You have been logged out. Redirecting...',
			})
			.then(() => {
				invalidateQueries({ keys: [serverQueryKeys.checkIsClaimed] })
				setUser(null)
				navigate('/auth')
			})
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
