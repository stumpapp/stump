import { useAppProps, useUpdatePreferences, useUserStore } from '@stump/client'
import { IconButton, Label, RawSwitch, Text, ToolTip } from '@stump/components'
import { RefreshCcw } from 'lucide-react'
import React from 'react'
import toast from 'react-hot-toast'

import { useLocaleContext } from '../../../i18n'

export default function DiscordPresenceSwitch() {
	const { setDiscordPresence } = useAppProps() ?? {}
	const { t } = useLocaleContext()
	const { userPreferences, setUserPreferences } = useUserStore((state) => ({
		setUserPreferences: state.setUserPreferences,
		userPreferences: state.userPreferences,
	}))
	const { update } = useUpdatePreferences()

	/**
	 * Toggle the Discord Rich Presence setting. When toggled on, the default presence will be set
	 * in AppLayout.tsx.
	 */
	const toggleDiscordPresence = async () => {
		if (userPreferences) {
			const newPreferences = {
				...userPreferences,
				enable_discord_presence: !userPreferences?.enable_discord_presence,
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
	const handleReconnect = () => setDiscordPresence?.()

	const isChecked = userPreferences?.enable_discord_presence ?? false

	return (
		<div className="flex max-w-2xl items-center justify-between py-6 ">
			<div className="flex flex-grow flex-col gap-2 text-left">
				<Label htmlFor="discord_presence_switch">
					{t('settingsScene.desktop.discordPresence.label')}
				</Label>
				<Text size="xs" variant="muted">
					{t('settingsScene.desktop.discordPresence.description')}
				</Text>
			</div>

			<div className="w-6" />

			<div className="flex items-center gap-3">
				<RawSwitch
					id="discord_presence_switch"
					className="text-gray-900"
					checked={isChecked}
					onClick={toggleDiscordPresence}
					primaryRing
				/>

				<ToolTip
					content={t('settingsScene.desktop.discordPresence.reconnect')}
					isDisabled={!isChecked || !handleReconnect}
				>
					<IconButton variant="ghost" size="xs" disabled={!isChecked || !handleReconnect}>
						<RefreshCcw className="h-4 w-4" />
					</IconButton>
				</ToolTip>
			</div>
		</div>
	)
}
