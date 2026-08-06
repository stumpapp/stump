import { ConfirmationModal, IconButton, ToolTip, useBoolean } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { LogOut } from 'lucide-react'

import { useAppContext } from '@/context'

type Props = {
	trigger?: (setOpen: (state: boolean) => void) => React.ReactElement
}

export default function Logout({ trigger }: Props) {
	const { t } = useLocaleContext()
	const { logout } = useAppContext()
	const [isOpen, { on, off }] = useBoolean()

	async function handleLogout() {
		off()
		logout()
	}

	return (
		<ConfirmationModal
			title={t('signOutModal.title')}
			description={t('signOutModal.message')}
			confirmText={t('signOutModal.buttons.signOut')}
			confirmVariant="destructive"
			isOpen={isOpen}
			onClose={off}
			onConfirm={handleLogout}
			trigger={
				<ToolTip content={t('signOutModal.title')}>
					{trigger ? (
						trigger(on)
					) : (
						<IconButton
							variant="ghost"
							className="text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
							onClick={on}
							aria-label={t('signOutModal.title')}
						>
							<LogOut />
						</IconButton>
					)}
				</ToolTip>
			}
		/>
	)
}
