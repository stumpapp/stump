import { TypedDocumentString } from '@stump/graphql'

import { Api } from '../api'
import { attemptWebsocketConnect } from '../socket'

class TestWebSocket extends EventTarget {
	static OPEN = 1
	static CONNECTING = 0
	readyState = TestWebSocket.OPEN
	send = vi.fn()
	close = vi.fn()

	constructor(
		public url: string,
		public protocol: string,
	) {
		super()
		queueMicrotask(() => this.dispatchEvent(new Event('open')))
	}
}

afterEach(() => vi.unstubAllGlobals())

it.each([
	['http://example.org', 'ws://example.org/api/graphql/ws'],
	['https://example.org/stump', 'wss://example.org/stump/api/graphql/ws'],
	['https://example.org/apps/stump/', 'wss://example.org/apps/stump/api/graphql/ws'],
])('connects subscriptions beneath %s', async (baseURL, expected) => {
	vi.stubGlobal('WebSocket', TestWebSocket)
	const sdk = new Api({ baseURL })
	const { socket, unsubscribe } = await attemptWebsocketConnect({
		sdk,
		query: new TypedDocumentString<unknown, Record<string, never>>('subscription { __typename }'),
	})
	expect(socket.url).toBe(expected)
	expect(socket.protocol).toBe('graphql-ws')
	expect(socket.send).toHaveBeenCalledWith(
		JSON.stringify({
			type: 'connection_init',
			payload: { headers: sdk.headers },
		}),
	)
	unsubscribe()
	expect(socket.close).toHaveBeenCalled()
})
