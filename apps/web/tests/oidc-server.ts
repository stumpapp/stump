import { createServer } from 'node:http'

import { Events, OAuth2Server } from 'oauth2-mock-server'

type OidcClaims = {
	sub: string
	email: string
	name?: string
	groups: string[]
}

const OIDC_PORT = 9000
const SERVER_PORT = 9001

async function main() {
	const authServer = new OAuth2Server()
	await authServer.issuer.keys.generate('RS256')

	let pendingClaims: OidcClaims | null = null

	authServer.service.on(Events.BeforeTokenSigning, (token) => {
		if (!pendingClaims) return
		token.payload.sub = pendingClaims.sub
		token.payload.groups = pendingClaims.groups
	})

	authServer.service.on(Events.BeforeUserinfo, (userInfoResponse) => {
		if (!pendingClaims) return
		userInfoResponse.body = {
			...userInfoResponse.body,
			sub: pendingClaims.sub,
			email: pendingClaims.email,
			name: pendingClaims.name ?? pendingClaims.email,
		}
		pendingClaims = null
	})

	const httpServer = createServer((req, res) => {
		// this is for playwright, so it knows the service is up and ready
		// for the testing suites
		if (req.method === 'GET' && req.url === '/health') {
			res.writeHead(200)
			res.end('ok')
			return
		}

		if (req.method === 'POST' && req.url === '/set-claims') {
			let body = ''
			req.setEncoding('utf8')
			req.on('data', (chunk) => (body += chunk))
			req.on('end', () => {
				try {
					pendingClaims = JSON.parse(body) as OidcClaims
					res.writeHead(200)
					res.end('ok')
				} catch {
					res.writeHead(400)
					res.end('bad json')
				}
			})
			return
		}

		res.writeHead(404)
		res.end()
	})

	await authServer.start(OIDC_PORT, 'localhost')
	try {
		await new Promise<void>((resolve, reject) => {
			httpServer.once('error', reject)
			httpServer.listen(SERVER_PORT, 'localhost', resolve)
		})
	} catch (error) {
		await authServer.stop()
		throw error
	}

	process.stdout.write(`oauth test provider at http://localhost:${OIDC_PORT}\n`)
	process.stdout.write(`http server at http://localhost:${SERVER_PORT}\n`)

	process.on('SIGTERM', () => {
		httpServer.close()
		authServer.stop()
	})
}

main().catch((error) => {
	console.error('Failed to start!', error)
})
