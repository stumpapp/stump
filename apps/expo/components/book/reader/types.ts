export type OfflineCompatibleReader = {
	serverId: string
	requestHeaders?: () => Record<string, string>
}
