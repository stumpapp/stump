import { useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import { Input } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useDebouncedValue } from 'rooks'
import { toast } from 'sonner'

const mutation = graphql(`
	mutation ServerPublicURLUpdate($publicUrl: String!) {
		updatePublicUrl(publicUrl: $publicUrl) {
			publicUrl
		}
	}
`)

const query = graphql(`
	query ServerPublicURL {
		serverConfig {
			publicUrl
		}
	}
`)

export default function ServerPublicURL() {
	const { t } = useLocaleContext()

	const client = useQueryClient()
	const {
		data: { serverConfig },
	} = useSuspenseGraphQL(query, ['serverConfig', 'publicUrl'])

	const [publicUrl, setPublicUrl] = useState(() => serverConfig.publicUrl || '')

	const { mutate: updatePublicUrl } = useGraphQLMutation(mutation, {
		onSuccess: (data) => {
			client.setQueryData(['serverConfig', 'publicUrl'], {
				serverConfig: {
					publicUrl: data.updatePublicUrl.publicUrl,
				},
			})
		},
		onError: (error) => {
			toast.error(t(getKey('updateFailed')), {
				description: error instanceof Error ? error.message : t('common.unknownError'),
			})
		},
	})
	const [debouncedValue] = useDebouncedValue(publicUrl, 1000)

	useEffect(() => {
		if (debouncedValue !== serverConfig.publicUrl) {
			updatePublicUrl({ publicUrl: debouncedValue })
		}
	}, [debouncedValue, serverConfig.publicUrl, updatePublicUrl])

	return (
		<Input
			placeholder="https://my-stump-instance.cloud"
			value={publicUrl}
			onChange={(e) => setPublicUrl(e.target.value)}
			containerClassName="md:max-w-sm max-w-[unset]"
		/>
	)
}

const LOCALE_BASE = 'settingsScene.server/general.sections.serverConfig.publicUrl'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
