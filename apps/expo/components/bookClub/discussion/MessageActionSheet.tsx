import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { BookClubMemberRole } from '@stump/graphql'
import { LucideIcon, Pencil, Reply, SmilePlus, Spool, Trash2 } from 'lucide-react-native'
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { Divider } from '~/components/Divider'
import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'

import { EmojiPickerSheet, type EmojiPickerSheetRef } from '../../emoji/EmojiPickerSheet'
import type { EmojiSelection } from '../../emoji/types'
import { Icon, Text } from '../../ui'
import { useBookClubContext } from '../context'
import type { MessageData } from './Message'

// TODO: I'd rather not have this static and use the user's most used or something
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

export type MessageActionSheetRef = {
	open: (message: MessageData) => void
	close: () => void
}

type Props = {
	quickEmojis?: string[]
	onReply?: (message: MessageData) => void
	onThreadPress?: (message: MessageData) => void
	onToggleReaction?: (messageId: string, selection: EmojiSelection) => void
	onDelete?: (messageId: string) => void
}

export const MessageActionSheet = forwardRef<MessageActionSheetRef, Props>(
	({ quickEmojis = QUICK_EMOJIS, onReply, onThreadPress, onToggleReaction, onDelete }, ref) => {
		const sheetRef = useRef<TrueSheet>(null)
		const emojiPickerRef = useRef<EmojiPickerSheetRef>(null)

		const [message, setMessage] = useState<MessageData | null>(null)

		const colors = useColors()

		const { viewerMembership, checkRole } = useBookClubContext()

		const isOwn = !!viewerMembership?.id && message?.memberId === viewerMembership.id
		const isModerator = checkRole(BookClubMemberRole.Moderator)
		const canDelete = isOwn || isModerator

		useImperativeHandle(ref, () => ({
			open: (msg: MessageData) => {
				setMessage(msg)
				sheetRef.current?.present()
			},
			close: () => {
				sheetRef.current?.dismiss()
			},
		}))

		const dismiss = useCallback(() => sheetRef.current?.dismiss(), [])

		const handleEmojiPress = useCallback(
			(emoji: string) => {
				if (!message || !onToggleReaction) return
				dismiss()
				onToggleReaction(message.id, { kind: 'unicode', emoji })
			},
			[message, onToggleReaction, dismiss],
		)

		const handleReply = useCallback(() => {
			if (!message || !onReply) return
			dismiss()
			onReply(message)
		}, [message, onReply, dismiss])

		const handleThread = useCallback(() => {
			if (!message || !onThreadPress) return
			dismiss()
			onThreadPress(message)
		}, [message, onThreadPress, dismiss])

		const handleDelete = useCallback(() => {
			if (!message || !onDelete) return
			dismiss()
			onDelete(message.id)
		}, [message, onDelete, dismiss])

		const handleOpenEmojiPicker = useCallback(() => emojiPickerRef.current?.present(), [])

		const handlePickerEmojiSelect = useCallback(
			(selection: EmojiSelection) => {
				if (!message || !onToggleReaction) return
				dismiss()
				onToggleReaction(message.id, selection)
			},
			[message, onToggleReaction, dismiss],
		)

		return (
			<TrueSheet
				ref={sheetRef}
				detents={['auto']}
				cornerRadius={24}
				grabber
				backgroundColor={IS_IOS_24_PLUS ? undefined : colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
			>
				<View className="pb-8 pt-2">
					<View className="flex-row items-center justify-around px-6 py-3">
						{/* TODO: slice(0,6) once i pass curated ones */}
						{quickEmojis.map((emoji) => (
							<Pressable key={emoji} onPress={() => handleEmojiPress(emoji)}>
								<View className="h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
									<Text size="xl">{emoji}</Text>
								</View>
							</Pressable>
						))}

						<Pressable onPress={handleOpenEmojiPicker}>
							<View className="h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
								<Icon as={SmilePlus} className="h-5 w-5 text-foreground-muted" />
							</View>
						</Pressable>
					</View>

					<View className="my-1">
						<Divider />
					</View>

					<View className="gap-2 px-4 pt-1">
						{/* TODO: Support message editing */}
						<ActionRow icon={Pencil} label="Edit" description="Edit this message" disabled />

						{onReply && (
							<ActionRow
								icon={Reply}
								label="Reply"
								description="Reply inline"
								onPress={handleReply}
							/>
						)}

						{onThreadPress && (
							<ActionRow
								// TODO: This icon was the one that made me not use native, although I'd prefer all native icons here.
								// I'm kinda surprised sf doens't have yarn or spool or something thread related
								icon={Spool}
								label="Thread"
								description="Start a thread"
								onPress={handleThread}
							/>
						)}

						{canDelete && onDelete && (
							<ActionRow
								icon={Trash2}
								label="Delete"
								description="Delete this message"
								destructive
								onPress={handleDelete}
							/>
						)}
					</View>
				</View>

				<EmojiPickerSheet ref={emojiPickerRef} onEmojiSelect={handlePickerEmojiSelect} />
			</TrueSheet>
		)
	},
)

MessageActionSheet.displayName = 'MessageActionSheet'

type ActionRowProps = {
	icon: LucideIcon
	label: string
	description?: string
	onPress?: () => void
	disabled?: boolean
	destructive?: boolean
}

function ActionRow({ icon, label, description, onPress, disabled, destructive }: ActionRowProps) {
	return (
		<Pressable onPress={onPress} disabled={disabled}>
			<View
				className={cn(
					'ios:rounded-[2rem] flex-row items-center gap-4 rounded-3xl p-4',
					destructive ? 'dark:bg-red-500/15 bg-red-500/10' : 'bg-black/5 dark:bg-white/10',
					disabled ? 'opacity-40' : 'active:opacity-80',
				)}
			>
				<View
					className={cn(
						'h-10 w-10 items-center justify-center rounded-full',
						destructive ? 'bg-red-500/15 dark:bg-red-500/20' : 'dark:bg-white/15 bg-black/10',
					)}
				>
					<Icon
						as={icon}
						size={18}
						className={cn(destructive ? 'text-fill-danger' : 'text-foreground-muted')}
					/>
				</View>
				<View className="flex-1 gap-0.5">
					<Text className={cn('font-medium', destructive ? 'text-fill-danger' : '')}>{label}</Text>
					{description && (
						<Text
							size="sm"
							className={cn(destructive ? 'text-fill-danger opacity-70' : 'text-foreground-muted')}
						>
							{description}
						</Text>
					)}
				</View>
			</View>
		</Pressable>
	)
}
