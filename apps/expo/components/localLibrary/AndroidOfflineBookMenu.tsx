import { BookOpenCheck, CircleMinus, Ellipsis, Trash } from 'lucide-react-native'
import { Fragment } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icon,
	Text,
} from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'

type Props = {
	handleMarkAsComplete: () => void
	handleClearProgress: () => void
	handleDelete: () => void
	progression: { isCompleted: boolean; hasProgress: boolean }
}

export default function AndroidOfflineBookMenu({
	handleMarkAsComplete,
	handleClearProgress,
	handleDelete,
	progression,
}: Props) {
	const insets = useSafeAreaInsets()
	const { t } = useTranslate()

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button className="squircle h-8 w-8 p-0 rounded-full" variant="ghost" size="icon">
					<View>
						<Icon as={Ellipsis} size={20} className="text-foreground" />
					</View>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				insets={contentInsets}
				sideOffset={2}
				className="tablet:w-64 w-3/5"
				align="end"
			>
				<DropdownMenuGroup>
					{!progression.isCompleted && (
						<Fragment>
							<DropdownMenuItem onPress={handleMarkAsComplete}>
								<Text className="text-lg">{t('bookActions.markAsRead.label')}</Text>
								<Icon
									as={BookOpenCheck}
									size={20}
									className={cn('ml-auto text-foreground-muted')}
								/>
							</DropdownMenuItem>
							{progression.hasProgress && <DropdownMenuSeparator />}
						</Fragment>
					)}

					{progression.hasProgress && (
						<DropdownMenuItem onPress={handleClearProgress}>
							<Text className="text-lg">{t('bookActions.clearProgress.label')}</Text>
							<Icon as={CircleMinus} size={20} className={cn('ml-auto text-foreground-muted')} />
						</DropdownMenuItem>
					)}
				</DropdownMenuGroup>

				{(progression.hasProgress || !progression.isCompleted) && (
					<DropdownMenuSeparator variant="group" />
				)}

				<DropdownMenuItem onPress={handleDelete}>
					<Text className="text-lg text-fill-danger">{t('bookActions.deleteBook.label')}</Text>
					<Icon as={Trash} size={20} className={cn('ml-auto text-fill-danger')} />
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
