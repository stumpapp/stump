import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { Stack, useNavigation, useRouter } from 'expo-router'
import { CalendarClock, Ellipsis, Trash } from 'lucide-react-native'
import { useLayoutEffect, useRef } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icon,
	Text,
} from '~/components/ui'

import { ReadingSessionEditSheet } from '../ReadingSessionEditSheet'
import { useReadingSessionMutations } from '../useReadingSessionMutations'

const fragment = graphql(`
	fragment ReadingSessionMenu on ReadingSession {
		id
		status
		mediaId
		createdAt
		updatedAt
		elapsedSeconds
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
}

function ReadingSessionMenu({ data }: Props) {
	const session = useFragment(fragment, data)

	const router = useRouter()
	const editSheetRef = useRef<TrueSheet>(null)

	const { confirmDeleteSession } = useReadingSessionMutations({
		// TODO(reading-timeline): invalidate cache first
		onDeleted: () => router.back(),
	})

	const onDelete = () => confirmDeleteSession(session)

	const onEdit = () => editSheetRef.current?.present()

	return (
		<>
			{Platform.select({
				android: <AndroidReadingSessionMenu onDelete={onDelete} onEdit={onEdit} />,
				ios: (
					<Stack.Toolbar placement="right">
						<Stack.Toolbar.Menu icon="ellipsis">
							<Stack.Toolbar.Menu inline>
								<Stack.Toolbar.MenuAction icon="calendar" onPress={onEdit}>
									Date and Time
								</Stack.Toolbar.MenuAction>
							</Stack.Toolbar.Menu>

							<Stack.Toolbar.Menu inline>
								<Stack.Toolbar.MenuAction icon="trash" onPress={onDelete} destructive>
									Delete Session
								</Stack.Toolbar.MenuAction>
							</Stack.Toolbar.Menu>
						</Stack.Toolbar.Menu>
					</Stack.Toolbar>
				),
				default: null,
			})}

			<ReadingSessionEditSheet ref={editSheetRef} session={session} />
		</>
	)
}

export function useReadingSessionMenu(session?: FragmentType<typeof fragment> | null) {
	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (session && Platform.OS === 'android') {
			navigation.setOptions({
				headerRight: () => <ReadingSessionMenu data={session} />,
			})
		}
	}, [navigation, session])

	if (Platform.OS === 'ios' && session) {
		return <ReadingSessionMenu data={session} />
	}

	return null
}

type AndroidReadingSessionMenuProps = {
	onDelete: () => void
	onEdit: () => void
}

function AndroidReadingSessionMenu({ onDelete, onEdit }: AndroidReadingSessionMenuProps) {
	const insets = useSafeAreaInsets()
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
				<DropdownMenuItem onPress={onEdit}>
					<Text className="text-lg">Date and Time</Text>
					<Icon as={CalendarClock} size={20} className="text-foreground-muted ml-auto" />
				</DropdownMenuItem>

				<DropdownMenuSeparator variant="group" />

				<DropdownMenuItem onPress={onDelete} variant="destructive">
					<Text className="text-lg text-fill-danger">Delete Session</Text>
					<Icon as={Trash} size={20} className="text-fill-danger ml-auto" />
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
