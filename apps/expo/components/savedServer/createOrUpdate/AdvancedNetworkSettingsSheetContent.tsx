import { Route } from 'lucide-react-native'
import { useFormContext, useWatch } from 'react-hook-form'
import { View } from 'react-native'
import { toast } from 'sonner-native'

import { AppSettingsRow } from '~/components/appSettings'
import { Button, Card, Switch, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useWifiSsid } from '~/providers/WifiSsidProvider'

import { CustomHeaders } from './CustomHeaders'
import { CreateOrUpdateServerData } from './schemas'

export function AdvancedNetworkSettingsSheetContent() {
	const colors = useColors()
	const form = useFormContext<CreateOrUpdateServerData>()

	const [enableLocalProfile, localUrl, localSsid] = useWatch({
		control: form.control,
		name: ['enableLocalProfile', 'localUrl', 'localSsid'],
	})

	const { connectedToWifi, ssid, permissionStatus, isLoading, requestPermission } = useWifiSsid()

	const onChangeEnableLocalProfile = async (enabled: boolean) => {
		form.setValue('enableLocalProfile', enabled)
		if (enabled && permissionStatus !== 'granted') {
			const granted = await requestPermission()
			if (!granted) {
				toast.error('Location permissions denied', {
					description: 'idk man',
				})
				form.setValue('enableLocalProfile', false)
				return
			}
		}
	}

	const fakeSsid = 'My Home Network'

	return (
		<View className="gap-8 flex-1">
			<View className="gap-4">
				<Card label="Local Profile">
					<AppSettingsRow
						icon={Route}
						title="Auto-switch to local profile"
						description="Switch to the local profile when able"
					>
						<Switch checked={enableLocalProfile} onCheckedChange={onChangeEnableLocalProfile} />
					</AppSettingsRow>

					<Card.InputRow
						label="Local URL"
						hitSlop={50}
						selectionColor={colors.fill.brand.DEFAULT}
						onChangeText={(text) => form.setValue('localUrl', text)}
						value={localUrl ?? ''}
						style={{
							fontSize: 16,
							color: colors.foreground.DEFAULT,
						}}
						className="font-medium pl-3 w-full text-start"
						autoCapitalize="none"
					/>
				</Card>
			</View>

			{enableLocalProfile && (
				<View className="gap-4">
					<Card label="Wifi Network">
						{!localSsid && (
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

						{localSsid && (
							<Card.Row label={localSsid}>
								<Button
									size="sm"
									variant="destructive"
									roundness="full"
									onPress={async () => {}}
									className="dark:border-white/5 border-black/5"
								>
									<Text>Disconnect</Text>
								</Button>
							</Card.Row>
						)}
					</Card>

					{ssid && !localSsid && (
						<Button className="rounded-full">
							<Text>Add &quot;{fakeSsid}&quot;</Text>
						</Button>
					)}

					{!ssid && !localSsid && permissionStatus !== 'granted' && (
						<Button className="rounded-full" onPress={requestPermission} disabled={isLoading}>
							<Text>Request Location Permission</Text>
						</Button>
					)}
				</View>
			)}

			<CustomHeaders />
		</View>
	)
}
