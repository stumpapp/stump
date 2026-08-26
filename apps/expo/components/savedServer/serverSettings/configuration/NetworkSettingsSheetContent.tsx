import { ArrowUpDown, RadioTower, Route, Router } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { toast } from 'sonner-native'
import { z } from 'zod'

import { AppSettingsRow } from '~/components/appSettings'
import { Button, Card, Switch, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { useServerSettingsContext } from '~/providers/ServerSettingsProvider'
import { useWifiSsid } from '~/providers/WifiSsidProvider'

export function NetworkSettingsSheetContent() {
	const { t } = useTranslate()
	const { activeServer, patchServer } = useServerSettingsContext()
	const { connectedToWifi, ssid, permissionStatus, isLoading, requestPermission } = useWifiSsid()

	const [localUrl, setLocalUrl] = useState(activeServer.localProfile?.url || '')
	const [localUrlError, setLocalUrlError] = useState<string | null>(null)

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

	const onSaveChangedUrl = () => {
		const trimmedUrl = localUrl.trim()
		const urlSchema = z.string().url({ message: t('common.invalidUrl') })
		const result = urlSchema.safeParse(trimmedUrl)
		if (!result.success) {
			setLocalUrlError(result.error.message)
		} else {
			setLocalUrlError(null)
			patchServer({ localProfile: { ...activeServer.localProfile, url: result.data } })
		}
	}

	const onChangeLocalUrl = (text: string) => {
		setLocalUrl(text)
		if (localUrlError && z.string().url().safeParse(text.trim()).success) {
			setLocalUrlError(null)
		}
	}

	const onSwapUrls = () => {
		const currentLocalUrl = activeServer.localProfile?.url
		if (!currentLocalUrl) {
			toast.error(t('swapUrls.noLocalUrlSet.title'), {
				description: t('swapUrls.noLocalUrlSet.description'),
			})
			return
		}
		patchServer({
			url: currentLocalUrl,
			localProfile: { ...activeServer.localProfile, url: activeServer.url },
		})
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
					title={t(getKey('swapUrls.label'))}
					disabled={!activeServer.localProfile?.url}
				>
					<Button
						size="sm"
						variant="destructive"
						roundness="full"
						onPress={() => {
							Alert.prompt(
								t(getKey('swapUrls.label')),
								t(getKey('swapUrls.confirmationText')),
								[
									{
										text: t('common.cancel'),
										style: 'cancel',
									},
									{
										text: t(getKey('swapUrls.swap')),
										onPress: () => onSwapUrls(),
										style: 'destructive',
									},
								],
								// it is so silly to me that not providing `default` makes it a text input lol
								// so 'default' does not seem to be the default, actually!
								'default',
							)
						}}
						className="dark:border-white/5 border-black/5"
					>
						<Text>{t(getKey('swapUrls.swap'))}</Text>
					</Button>
				</AppSettingsRow>
			</Card>

			<View className="gap-4">
				<Card label={t(getKey('localProfile'))}>
					<AppSettingsRow
						icon={Route}
						title={t(getKey('autoSwitchToLocal.label'))}
						description={t(getKey('autoSwitchToLocal.description'))}
					>
						<Switch
							checked={Boolean(activeServer.autoSwitchToLocal)}
							onCheckedChange={onChangeEnableLocalProfile}
						/>
					</AppSettingsRow>

					<Card.InputRow
						disabled={!activeServer.autoSwitchToLocal}
						label={t(getKey('localUrl'))}
						value={localUrl}
						onChangeText={onChangeLocalUrl}
						errorMessage={localUrlError ?? undefined}
					/>
				</Card>

				{/*TODO: i hate content shifts, leaving for now bc i don't think debounce is quite right
				and an inline save button means less URL space*/}
				{isDifferentLocalUrl && !!activeServer.autoSwitchToLocal && (
					<Button className="rounded-full" onPress={onSaveChangedUrl}>
						<Text>{t(getKey('saveUrlChanges'))}</Text>
					</Button>
				)}
			</View>

			{activeServer.autoSwitchToLocal && (
				<View className="gap-4">
					<Card label={t(getKey('wifiNetwork.label'))}>
						{!activeServer.localProfile?.ssid && (
							<Card.Row
								label={t(
									getKey(
										permissionStatus !== 'granted'
											? 'wifiNetwork.permissionNotGranted.label'
											: 'wifiNetwork.noAssociatedNetwork',
									),
								)}
								description={t(
									getKey(
										permissionStatus !== 'granted'
											? 'wifiNetwork.permissionNotGranted.description'
											: connectedToWifi
												? 'wifiNetwork.connectedTip'
												: 'wifiNetwork.notConnectedToWifi',
									),
								)}
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

					{ssid && !activeServer.localProfile?.ssid && (
						<Button className="rounded-full">
							<Text>
								{t(getKey('wifiNetwork.addNetwork'), {
									ssid: fakeSsid,
								})}
							</Text>
						</Button>
					)}

					{!ssid && !activeServer.localProfile?.ssid && permissionStatus !== 'granted' && (
						<Button className="rounded-full" onPress={requestPermission} disabled={isLoading}>
							<Text>{t(getKey('wifiNetwork.requestPermission'))}</Text>
						</Button>
					)}
				</View>
			)}
		</View>
	)
}

const LOCALE_KEY = 'serverNetworkSettings'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
