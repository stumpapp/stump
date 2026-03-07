import { useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import { Button, Input } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
			toast.success('Public URL updated successfully')
			client.setQueryData(['serverConfig', 'publicUrl'], {
				serverConfig: {
					publicUrl: data.updatePublicUrl.publicUrl,
				},
			})
		},
		onError: (error) => {
			toast.error('Failed to update public URL', {
				description: error instanceof Error ? error.message : 'An unknown error occurred',
			})
		},
	})

	const isDifferent = (serverConfig.publicUrl || '') !== publicUrl

	return (
		<div className="flex items-start gap-4">
			<Input
				label={t(getKey('label'))}
				description={t(getKey('description'))}
				placeholder="https://my-stump-instance.cloud"
				value={publicUrl}
				onChange={(e) => setPublicUrl(e.target.value)}
				containerClassName="md:max-w-sm max-w-[unset]"
			/>

			{isDifferent && (
				<Button
					variant="primary"
					className="mt-[26px] shrink"
					onClick={() => updatePublicUrl({ publicUrl })}
				>
					{t('common.save')}
				</Button>
			)}
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.server/general.sections.serverPublicUrl'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
