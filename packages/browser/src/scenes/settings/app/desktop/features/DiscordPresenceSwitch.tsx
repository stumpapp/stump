import { Button, Label, RawSwitch, Text, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

import { usePreferences } from '@/hooks/usePreferences'
import { useTauriRPC } from '@/hooks/useTauriRPC'
import { useUserStore } from '@/stores'

export default function DiscordPresenceSwitch() {
	const { setDiscordPresence } = useTauriRPC()
	const { t } = useLocaleContext()
	const { userPreferences, setUserPreferences } = useUserStore((state) => ({
		setUserPreferences: state.setUserPreferences,
		userPreferences: state.userPreferences,
	}))
	const { update } = usePreferences()

	/**
	 * Toggle the Discord Rich Presence setting. When toggled on, the default presence will be set
	 * in AppLayout.tsx.
	 */
	const toggleDiscordPresence = async () => {
		if (userPreferences) {
			const newPreferences = {
				...userPreferences,
				enableDiscordPresence: !userPreferences?.enableDiscordPresence,
			}
			setUserPreferences(newPreferences)

			try {
				await update(newPreferences)
			} catch (err) {
				console.error(err)
				toast.error('Failed to update!')
			}
		}
	}

	/**
	 * Attempt to reconnect to Discord Rich Presence by setting the default presence.
	 */
	const handleReconnect = () => setDiscordPresence()

	const isChecked = userPreferences?.enableDiscordPresence ?? false

	return (
		<div className="flex items-center justify-between">
			<div className="flex flex-grow flex-col gap-2 text-left">
				<Label htmlFor="discord_presence_switch">{t(getKey('label'))}</Label>
				<Text size="xs" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>

			<div className="w-6" />

			<div className="flex items-center gap-3">
				<ToolTip
					content={t(getKey('reconnect'))}
					isDisabled={!isChecked || !handleReconnect}
					align="end"
				>
					<Button variant="ghost" size="icon" disabled={!isChecked || !handleReconnect}>
						<RefreshCcw className="h-4 w-4" />
					</Button>
				</ToolTip>

				<RawSwitch
					id="discord_presence_switch"
					checked={isChecked}
					onClick={toggleDiscordPresence}
					variant="primary"
				/>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.optionalFeatures.discordPresence'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
