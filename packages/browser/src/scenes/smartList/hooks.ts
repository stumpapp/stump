import { useGraphQLMutation, useSDK } from '@stump/client'
import { graphql, SaveSmartListView } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import omit from 'lodash/omit'
import { useCallback } from 'react'
import { toast } from 'sonner'

import { useSmartListContext } from './context'
import { useSmartListViewStore } from './store'

const createViewMutation = graphql(`
	mutation CreateSmartListView($input: SaveSmartListView!) {
		createSmartListView(input: $input) {
			id
			listId
			name
			search
			enableMultiSort
			bookColumns {
				id
				position
			}
			bookSorting {
				id
				desc
			}
			groupColumns {
				id
				position
			}
			groupSorting {
				id
				desc
			}
		}
	}
`)

const updateViewMutation = graphql(`
	mutation UpdateSmartListView($originalName: String!, $input: SaveSmartListView!) {
		updateSmartListView(originalName: $originalName, input: $input) {
			id
			listId
			name
			search
			enableMultiSort
			bookColumns {
				id
				position
			}
			bookSorting {
				id
				desc
			}
			groupColumns {
				id
				position
			}
			groupSorting {
				id
				desc
			}
		}
	}
`)

const deleteViewMutation = graphql(`
	mutation DeleteSmartListView($id: ID!, $name: String!) {
		deleteSmartListView(id: $id, name: $name) {
			id
			name
		}
	}
`)

/**
 * Hook to save the current working view as a new stored view
 */
export const useSaveWorkingView = () => {
	const { list } = useSmartListContext()
	const workingView = useSmartListViewStore((s) => s.workingView)
	const selectStoredView = useSmartListViewStore((s) => s.selectStoredView)

	const client = useQueryClient()
	const { sdk } = useSDK()

	const { mutateAsync: createView } = useGraphQLMutation(createViewMutation, {
		mutationKey: [sdk.cacheKeys.smartListViewCreate, list.id],
		onSuccess: (data) => {
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartListById, list.id] })
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartListMeta, list.id] })
			selectStoredView(data.createSmartListView)
		},
	})

	const saveWorkingView = useCallback(
		async (name: string) => {
			if (!workingView) {
				return
			}

			try {
				await createView({
					input: {
						listId: list.id,
						name,
						...workingView,
					} as SaveSmartListView,
				})
			} catch (error) {
				console.error(error)
				const prefix = 'Failed to create view'
				if (error instanceof Error) {
					toast.error(`${prefix}${error.message ? `: ${error.message}` : ''}`)
				} else {
					toast.error(prefix)
				}
			}
		},
		[workingView, list.id, createView],
	)

	return { saveWorkingView }
}

/**
 * Hook to update the currently selected stored view with the working view changes
 */
export const useSaveSelectedStoredView = () => {
	const { list } = useSmartListContext()
	const workingView = useSmartListViewStore((s) => s.workingView)
	const selectedView = useSmartListViewStore((s) => s.selectedView)
	const selectStoredView = useSmartListViewStore((s) => s.selectStoredView)

	const client = useQueryClient()
	const { sdk } = useSDK()

	const { mutateAsync: updateView } = useGraphQLMutation(updateViewMutation, {
		mutationKey: [sdk.cacheKeys.smartListViewUpdate, list.id],
		onSuccess: (data) => {
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartListById, list.id] })
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartListMeta, list.id] })
			selectStoredView(data.updateSmartListView)
		},
	})

	const saveSelectedStoredView = useCallback(
		async (newName?: string) => {
			if (!selectedView || !workingView) {
				return
			}

			try {
				await updateView({
					originalName: selectedView.name,
					input: omit(
						{
							...selectedView,
							...workingView,
							...(newName ? { name: newName } : {}),
						} as SaveSmartListView,
						'id',
					),
				})
			} catch (error) {
				console.error(error)
				const prefix = 'Failed to save view'
				if (error instanceof Error) {
					toast.error(`${prefix}${error.message ? `: ${error.message}` : ''}`)
				} else {
					toast.error(prefix)
				}
			}
		},
		[selectedView, workingView, updateView],
	)

	return { saveSelectedStoredView }
}

/**
 * Hook to delete the currently selected stored view
 */
export const useDeleteSelectedView = () => {
	const { list } = useSmartListContext()
	const selectedView = useSmartListViewStore((s) => s.selectedView)
	const selectStoredView = useSmartListViewStore((s) => s.selectStoredView)

	const client = useQueryClient()
	const { sdk } = useSDK()

	const { mutateAsync: deleteView, isPending } = useGraphQLMutation(deleteViewMutation, {
		mutationKey: ['deleteView', list.id],
		onSuccess: () => {
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartListById, list.id] })
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartListMeta, list.id] })
			selectStoredView(undefined)
		},
	})

	const deleteSelectedView = useCallback(async () => {
		if (!selectedView) {
			return
		}

		try {
			await deleteView({
				id: list.id,
				name: selectedView.name,
			})
			toast.success('View deleted')
		} catch (error) {
			console.error(error)
			const prefix = 'Failed to delete view'
			if (error instanceof Error) {
				toast.error(`${prefix}${error.message ? `: ${error.message}` : ''}`)
			} else {
				toast.error(prefix)
			}
		}
	}, [selectedView, list.id, deleteView])

	return { deleteSelectedView, isDeleting: isPending }
}
