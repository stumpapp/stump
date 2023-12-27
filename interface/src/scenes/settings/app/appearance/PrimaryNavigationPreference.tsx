import { usePreferences } from '@stump/client'
import { cx, Label, Text } from '@stump/components'
import { Check } from 'lucide-react'

export default function PrimaryNavigationPreference() {
	const {
		preferences: { primary_navigation_mode },
		update,
	} = usePreferences()

	const handleChange = async (mode: 'SIDEBAR' | 'TOPBAR') => {
		try {
			await update({ primary_navigation_mode: mode })
		} catch (error) {
			console.error(error)
		}
	}

	return (
		<div className="flex flex-col gap-y-1.5">
			<Label>Primary navigation</Label>
			<Text size="sm" variant="muted">
				Choose between a minimal sidebar or a topbar navigation
			</Text>
			<div className="flex items-center gap-x-4">
				<AppearanceOption
					label="Sidebar"
					isSelected={primary_navigation_mode === 'SIDEBAR'}
					onSelect={() => handleChange('SIDEBAR')}
				/>
				<AppearanceOption
					label="Topbar"
					isSelected={primary_navigation_mode === 'TOPBAR'}
					onSelect={() => handleChange('TOPBAR')}
				/>
			</div>
			<Text size="xs" variant="muted" className="italic">
				* Settings for the unselcted option will be disabled or hidden
			</Text>
		</div>
	)
}

type AppearanceOptionProps = {
	label: string
	isSelected: boolean
	onSelect: () => void
}
function AppearanceOption({ label, isSelected, onSelect }: AppearanceOptionProps) {
	const isSidebar = label === 'Sidebar'

	return (
		<div className="w-1/2 text-center md:w-1/3 lg:w-1/4">
			<div
				className={cx(
					'relative flex h-32 w-full overflow-hidden rounded-md border border-edge bg-background-300 transition-all duration-200 hover:border-edge-200 hover:bg-background-300',
					isSidebar ? 'flex-row' : 'flex-col gap-y-2',
					{
						'border-edge-200': isSelected,
					},
				)}
				onClick={onSelect}
			>
				<div className={cx('bg-sidebar', isSidebar ? 'h-full w-1/4' : 'h-1/5 w-full')} />

				<div className="flex h-full w-full flex-col gap-y-4 p-2">
					<div className="h-1/5 w-2/3 shrink-0 rounded-md bg-background-400" />
					<div className="h-1/5 w-full shrink-0 rounded-md bg-background-400" />
					<div className="h-1/5 w-full shrink-0 rounded-md bg-background-400" />
				</div>

				{isSelected && (
					<div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand">
						<Check className="h-5 w-5 text-white" />
					</div>
				)}
			</div>

			<Label>{label}</Label>
		</div>
	)
}
