import { cn, IconButton, ToolTip } from '@stump/components'
import { Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

export default function SettingsButton() {
	const navigate = useNavigate()
	const location = useLocation()
	const paths = usePaths()
	const { translate } = useTranslate()

	const isActive = location.pathname.startsWith(paths.settings())

	return (
		<ToolTip content={translate('shared.common.settings')} align="end" portal>
			<IconButton
				variant="ghost"
				className={cn(
					'p-1.5 border border-transparent text-sidebar-foreground transition-colors duration-150',
					isActive
						? 'border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
						: 'hover:border-sidebar-border hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
				)}
				onClick={() => navigate(paths.settings())}
			>
				<Settings className="h-4 w-4 -scale-x-[1] transform" />
			</IconButton>
		</ToolTip>
	)
}
