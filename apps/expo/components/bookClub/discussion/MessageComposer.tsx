import { Lock, Send, X } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, Pressable, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'

type ReplyingTo = {
	id: string
	content: string
	member?: {
		displayName?: string | null
		username?: string | null
	} | null
}

type MessageComposerProps = {
	onSend: (content: string) => void
	isSending?: boolean
	isLocked?: boolean
	placeholder?: string
	parentMessageId?: string
	replyingTo?: ReplyingTo | null
	onCancelReply?: () => void
}

export default function MessageComposer({
	onSend,
	isSending,
	isLocked,
	placeholder = 'Type a message...',
	replyingTo,
	onCancelReply,
}: MessageComposerProps) {
	const inputRef = useRef<TextInput>(null)

	const [text, setText] = useState('')
	const [keyboardVisible, setKeyboardVisible] = useState(false)

	// This was a bit of a pain to figure out, keyboard shit for mobile apps is SO ANNOYING
	useEffect(() => {
		const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
		const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
		const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true))
		const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false))
		return () => {
			showSub.remove()
			hideSub.remove()
		}
	}, [])

	const { bottom } = useSafeAreaInsets()

	const bottomPadding = keyboardVisible ? 8 : bottom + 8

	const colors = useColors()

	const handleSend = useCallback(() => {
		const trimmed = text.trim()
		if (!trimmed || isSending) return
		onSend(trimmed)
		setText('')
	}, [text, isSending, onSend])

	if (isLocked) {
		return (
			<View
				className="flex-row items-center justify-center gap-2 border-t border-edge bg-background px-4 py-3"
				style={{ paddingBottom: keyboardVisible ? 12 : bottom + 12 }}
			>
				<Icon as={Lock} className="h-4 w-4 text-foreground-muted" />
				<Text size="sm" className="text-foreground-muted">
					This discussion is locked.
				</Text>
			</View>
		)
	}

	return (
		<View>
			{replyingTo && (
				<View className="flex-row items-center gap-2 border-t border-edge bg-background-surface/50 px-4 py-2">
					<View className="flex-1">
						<Text size="xs" className="font-medium">
							Replying to{' '}
							{replyingTo.member?.displayName || replyingTo.member?.username || 'Unknown'}
						</Text>
						<Text size="xs" className="text-foreground-muted" numberOfLines={1}>
							{replyingTo.content}
						</Text>
					</View>
					<Pressable onPress={onCancelReply} hitSlop={8}>
						<Icon as={X} className="h-4 w-4 text-foreground-muted" />
					</Pressable>
				</View>
			)}
			<View
				className="flex-row items-end gap-2 border-t border-edge bg-background px-4 py-2"
				style={{ paddingBottom: bottomPadding }}
			>
				<TextInput
					ref={inputRef}
					className="native:text-base squircle max-h-[120px] min-h-[40px] flex-1 rounded-2xl border border-edge bg-background-surface px-3 py-2 text-foreground"
					placeholder={placeholder}
					placeholderTextColor="#999"
					value={text}
					onChangeText={setText}
					multiline
					editable={!isSending}
					returnKeyType="default"
					blurOnSubmit={false}
				/>

				<Pressable
					onPress={handleSend}
					disabled={!text.trim() || isSending}
					className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-background-surface"
					style={
						!isSending && text.trim() ? { backgroundColor: colors.fill.brand.DEFAULT } : undefined
					}
				>
					<Icon
						as={Send}
						className={cn(
							'h-4 w-4',
							text.trim() && !isSending ? 'text-white' : 'text-foreground-muted',
						)}
					/>
				</Pressable>
			</View>
		</View>
	)
}
