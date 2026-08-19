import { ArrowUpDown, RadioTower, Route, Router, Wifi } from 'lucide-react-native'
import { useState } from 'react'
import { TextInput, View } from 'react-native'
import { toast } from 'sonner-native'

import { AppSettingsRow } from '~/components/appSettings'
import { Button, Card, Switch, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useServerSettingsContext } from '~/providers/ServerSettingsProvider'
import { useWifiSsid } from '~/providers/WifiSsidProvider'

export function NetworkSettingsSheetContent() {
	const { activeServer, patchServer } = useServerSettingsContext()
	const { connectedToWifi, ssid, permissionStatus, isLoading, requestPermission } = useWifiSsid()

	console.log('NetworkSettingsSheetContent', { connectedToWifi, ssid, permissionStatus, isLoading })

	const colors = useColors()

	const [localUrl, setLocalUrl] = useState(activeServer.localProfile?.url || '')
	// TODO: i realized editing remote url here does kinda make sense, or at the very least it presents an awkward
	// ui for people who did not onboard their server with network profiles in mind and want to change it. as it stands
	// now, you'd have to:
	// enter server -> settings -> network -> enable local -> configure local -> exit -> edit server -> change url
	// not great. the other awkward point is that while in server changing the url for sdk instance might present
	// problems (hunch, not tested obv).
	const [remoteUrl, setRemoteUrl] = useState(activeServer.url)

	const isDifferentLocalUrl = localUrl != '' && localUrl != activeServer.localProfile?.url

	const onChangeEnableLocalProfile = async (enabled: boolean) => {
		patchServer({ autoSwitchToLocal: enabled })
		if (enabled && permissionStatus !== 'granted') {
			const granted = await requestPermission()
			if (!granted) {
				toast.error('Location permissions denied', {
					description: 'idk man',
				})
				return
			}
		}
	}

	const onChangeLocalUrl = () => {
		const trimmedUrl = localUrl.trim()
		// TODO: feedback
		if (!trimmedUrl) return
		// TODO: more thorough validation?
		patchServer({ localProfile: { ...activeServer.localProfile, url: trimmedUrl } })
	}

	const fakeSsid = 'My Home Network'

	return (
		<View className="gap-8 flex-1">
			<Card label="Current Server">
				<AppSettingsRow icon={RadioTower} title="Remote URL">
					<Text className="text-foreground-muted">{activeServer.url}</Text>
				</AppSettingsRow>

				<AppSettingsRow icon={Router} title="Local URL">
					<Text className="text-foreground-muted">
						{activeServer.localProfile?.url ?? 'Not configured'}
					</Text>
				</AppSettingsRow>

				<AppSettingsRow
					icon={ArrowUpDown}
					title="Swap URLs"
					disabled={!activeServer.localProfile?.url}
				>
					<Button
						size="sm"
						variant="destructive"
						roundness="full"
						onPress={async () => {}}
						className="dark:border-white/5 border-black/5"
					>
						<Text>Swap</Text>
					</Button>
				</AppSettingsRow>
			</Card>

			<View className="gap-4">
				<Card label="Local Profile">
					<AppSettingsRow
						icon={Route}
						title="Auto-switch to local profile"
						description="Switch to the local profile when able"
					>
						<Switch
							checked={Boolean(activeServer.autoSwitchToLocal)}
							onCheckedChange={onChangeEnableLocalProfile}
						/>
					</AppSettingsRow>

					{/*TODO: put remote url edit somewhere around here? looked kinda poopy double stacking inputs in this card*/}

					{/*FIXME: i do not like this layout, better without icon ig*/}
					<Card.Row disabled={!activeServer.autoSwitchToLocal}>
						<View className="gap-x-4 2 flex-row items-center justify-center">
							{/*<View className="gap-4 shrink-0 flex-row items-center justify-center">
							<GradientIcon icon={Router} />
						</View>*/}

							<View className="gap-y-2 shrink">
								<Text className="text-lg shrink">Local URL</Text>

								<View className="squircle dark:border-white/5 dark:bg-white/5 border-black/5 bg-black/5 h-10 flex flex-row items-center rounded-full border">
									<TextInput
										hitSlop={50}
										selectionColor={colors.fill.brand.DEFAULT}
										onChangeText={setLocalUrl}
										value={localUrl}
										style={{
											fontSize: 16,
											color: isDifferentLocalUrl
												? colors.foreground.DEFAULT
												: colors.foreground.muted,
										}}
										className="font-medium pl-3 w-full text-start"
										autoCapitalize="none"
									/>
								</View>
							</View>
						</View>
					</Card.Row>
				</Card>

				{/*TODO: i hate content shifts, leaving for now bc i don't think debounce is quite right
				and an inline save button means less URL space*/}
				{isDifferentLocalUrl && !!activeServer.autoSwitchToLocal && (
					<Button className="rounded-full" onPress={onChangeLocalUrl}>
						<Text>Save URL Changes</Text>
					</Button>
				)}
			</View>

			{activeServer.autoSwitchToLocal && (
				<View className="gap-4">
					<Card label="Wifi Network">
						{!activeServer.localProfile?.ssid && (
							<Card.Row
								label="No Associated Wifi Network"
								description={
									connectedToWifi
										? // TODO: too wordy?
											'If the current network is not listed, you might need to give Stump permission to access your location'
										: 'Once you connect to a network, you will be able to select it below to enable auto-switching'
								}
							/>
						)}

						{activeServer.localProfile?.ssid && (
							<Card.Row label={activeServer.localProfile.ssid}>
								<Button
									size="sm"
									variant="destructive"
									roundness="full"
									onPress={async () => {}}
									className="dark:border-white/5 border-black/5"
								>
									{/*TODO: too long of word? lol maybe just an x?*/}
									<Text>Disconnect</Text>
								</Button>
							</Card.Row>
						)}
					</Card>

					{fakeSsid && !activeServer.localProfile?.ssid && (
						<Button className="rounded-full">
							<Text>Add &quot;{fakeSsid}&quot;</Text>
						</Button>
					)}
				</View>
			)}
		</View>
	)
}
