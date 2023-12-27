import { authApi, serverQueryKeys } from '@stump/api'
import { invalidateQueries, useUserStore } from '@stump/client'
import { ConfirmationModal, Text, useBoolean } from '@stump/components'
import { LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function SignOut() {
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
				<button
					className="flex h-[2.35rem] w-full items-center gap-1.5 px-2 text-contrast-200 outline-none transition-colors duration-150 hover:bg-background-200"
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
