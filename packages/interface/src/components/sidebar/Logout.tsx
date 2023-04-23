import { authApi } from '@stump/api'
import { useUserStore } from '@stump/client'
import { ConfirmationModal, IconButton, ToolTip, useBoolean } from '@stump/components'
import { LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function Logout() {
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
					<IconButton variant="ghost" size="sm" onClick={on}>
						<LogOut className="h-4 w-4 -scale-x-[1] transform" />
					</IconButton>
				</ToolTip>
			}
		/>
	)
}
