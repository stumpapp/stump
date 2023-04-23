import { useTheme } from '@stump/client'
import { IconButton, ToolTip } from '@stump/components'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
	const { isDark, toggleTheme } = useTheme()

	const iconSize = 'w-4 h-4'

	return (
		<div>
			<AnimatePresence mode="wait" initial={false}>
				<ToolTip content="Toggle theme">
					<IconButton variant="ghost" size="sm" onClick={toggleTheme}>
						<motion.span
							key={isDark ? 'moon' : 'sun'}
							initial={{ opacity: 0, y: -30 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 30 }}
							transition={{ duration: 0.3, ease: 'easeIn' }}
						>
							{isDark ? <Moon className={iconSize} /> : <Sun className={iconSize} />}
						</motion.span>
					</IconButton>
				</ToolTip>
			</AnimatePresence>
		</div>
	)
}
