import { Route } from 'lucide-react-native'
import { useFormContext, useWatch } from 'react-hook-form'
import { View } from 'react-native'
import { toast } from 'sonner-native'

import { AppSettingsRow } from '~/components/appSettings'
import { Button, Card, Switch, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
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

	const { t } = useTranslate()
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

	return (
		<View className="gap-8 flex-1">
			<View className="gap-4">
				<Card label={t(getKey('localProfile'))}>
					<AppSettingsRow
						icon={Route}
						title={t(getKey('autoSwitchToLocal.label'))}
						description={t(getKey('autoSwitchToLocal.description'))}
					>
						<Switch checked={enableLocalProfile} onCheckedChange={onChangeEnableLocalProfile} />
					</AppSettingsRow>

					<Card.InputRow
						label={t(getKey('localUrl'))}
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
					<Card label={t(getKey('wifiNetwork.label'))}>
						{!localSsid && (
							<Card.Row
								label={t(getKey('wifiNetwork.noAssociatedNetwork'))}
								description={t(
									getKey(
										connectedToWifi ? 'wifiNetwork.connectedTip' : 'wifiNetwork.noConnectedToWifi',
									),
								)}
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
									{/*TODO: sm else*/}
									<Text>Disconnect</Text>
								</Button>
							</Card.Row>
						)}
					</Card>

					{ssid && !localSsid && (
						<Button className="rounded-full">
							<Text>
								{t(getKey('wifiNetwork.associateWithCurrentNetwork'), {
									ssid,
								})}
							</Text>
						</Button>
					)}

					{!ssid && !localSsid && permissionStatus !== 'granted' && (
						<Button className="rounded-full" onPress={requestPermission} disabled={isLoading}>
							<Text>{t(getKey('wifiNetwork.requestPermission'))}</Text>
						</Button>
					)}
				</View>
			)}

			<CustomHeaders />
		</View>
	)
}

const LOCALE_KEY = 'serverNetworkSettings'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
