import { BookByIdQuery } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Ellipsis } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { useFavoriteBook } from '~/lib/hooks/useFavoriteBook'
import { cn } from '~/lib/utils'

type Props = {
	id: string
	isFavorite: boolean
}

export default function BookMenu({ id, ...props }: Props) {
	const client = useQueryClient()

	const onFavoriteChanged = useCallback(
		(isFavorite: boolean) => {
			client.setQueryData(['bookById', id], (oldData: BookByIdQuery | undefined) => {
				// You can transform oldData or return new data entirely
				if (!oldData) return

				return {
					...oldData,
					mediaById: {
						...oldData.mediaById,
						isFavorite,
					},
				}
			})
		},
		[client, id],
	)

	const { isFavorite, favoriteBook } = useFavoriteBook({
		id,
		onSuccess: onFavoriteChanged,
		...props,
	})

	const [isOpen, setIsOpen] = useState(false)

	return (
		<DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenu.Trigger>
				<Pressable onPress={() => setIsOpen((prev) => !prev)}>
					{({ pressed }) => (
						<View className={cn(pressed && 'opacity-70')}>
							<Ellipsis size={20} className="text-foreground-muted" />
						</View>
					)}
				</Pressable>
			</DropdownMenu.Trigger>

			<DropdownMenu.Content>
				<DropdownMenu.Item key="isFavorite" onSelect={() => favoriteBook()}>
					<DropdownMenu.ItemIndicator />
					<DropdownMenu.ItemTitle>{isFavorite ? 'Unfavorite' : 'Favorite'}</DropdownMenu.ItemTitle>
					<DropdownMenu.ItemIcon ios={{ name: isFavorite ? 'heart.fill' : 'heart' }} />
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	)
}
