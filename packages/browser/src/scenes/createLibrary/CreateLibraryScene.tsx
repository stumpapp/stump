import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Breadcrumb, ButtonOrLink } from '@stump/components'
import { CreateOrUpdateLibraryInput, graphql } from '@stump/graphql'
import { handleApiError } from '@stump/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { SceneContainer } from '@/components/container'
import {
	CreateOrUpdateLibrarySchema,
	intoThumbnailConfig,
} from '@/components/library/createOrUpdate'
import { PageHeader } from '@/components/sharedLayout'
import { useConfetti } from '@/hooks/useConfetti'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

import CreateLibraryForm from './CreateLibraryForm'

const query = graphql(`
	query CreateLibrarySceneExistingLibraries {
		libraries(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				name
				path
			}
		}
	}
`)

const mutation = graphql(`
	mutation CreateLibrarySceneCreateLibrary($input: CreateOrUpdateLibraryInput!) {
		createLibrary(input: $input) {
			id
		}
	}
`)

export default function CreateLibraryScene() {
	const paths = usePaths()
	const navigate = useNavigate()
	const { sdk } = useSDK()
	const client = useQueryClient()
	const { start: startConfetti } = useConfetti({ duration: 5000 })
	const {
		data: {
			libraries: { nodes: libraries },
		},
	} = useSuspenseGraphQL(query, [sdk.cacheKeys.libraryCreateLibraryQuery])
	const { t, translate } = useTranslate()
	const {
		mutate: createLibrary,
		isPending,
		error,
	} = useGraphQLMutation(mutation, {
		mutationKey: [sdk.cacheKeys.libraryCreate],
		onSuccess: ({ createLibrary: { id } }) => {
			navigate(paths.librarySeries(id))
			startConfetti()
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.libraries] })
		},
	})
	const createError = useMemo(() => (error ? handleApiError(error) : undefined), [error])

	/**
	 * A function which will handle the submission of the form, creating a new library
	 * provided the form values. Note the transformation of certain values.
	 */
	const handleSubmit = useCallback(
		(values: CreateOrUpdateLibrarySchema) => {
			const {
				name,
				path,
				description,
				tags,
				scanAfterPersist,
				ignoreRules,
				thumbnailConfig,
				...config
			} = values

			const input: CreateOrUpdateLibraryInput = {
				config: {
					...config,
					ignoreRules: ignoreRules.map(({ glob }) => glob),
					thumbnailConfig: intoThumbnailConfig(thumbnailConfig),
				} as CreateOrUpdateLibraryInput['config'],
				description,
				name,
				path,
				scanAfterPersist,
				tags: tags?.map(({ label }) => label).filter(Boolean),
			}

			createLibrary({ input })
		},
		[createLibrary],
	)

	useEffect(() => {
		if (createError) {
			toast.error(t('createLibraryScene.failedToCreateLibrary'), {
				description: createError,
			})
		}
	}, [createError, t])

	return (
		<div className="relative flex flex-1 flex-col">
			<PageHeader>
				<Breadcrumb>
					<Breadcrumb.List>
						<Breadcrumb.Link asChild>
							<Link to="/libraries">Libraries</Link>
						</Breadcrumb.Link>
						<Breadcrumb.Separator />
						<Breadcrumb.Page>Create Library</Breadcrumb.Page>
					</Breadcrumb.List>
				</Breadcrumb>

				<div className="ml-auto">
					<ButtonOrLink
						href="https://stumpapp.dev/docs/guides/fundamentals/libraries#supported-patterns"
						variant="outline"
						size="sm"
						target="_blank"
					>
						{translate('shared.common.documentation')}{' '}
						<ExternalLink className="ml-1 h-4 w-4 text-muted-foreground" />
					</ButtonOrLink>
				</div>
			</PageHeader>

			<SceneContainer>
				<div className="gap-12 flex flex-col">
					{libraries && (
						<CreateLibraryForm
							existingLibraries={libraries}
							onSubmit={handleSubmit}
							isLoading={isPending}
						/>
					)}
				</div>
			</SceneContainer>
		</div>
	)
}
