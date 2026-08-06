import { Lock, Send, X } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, Pressable, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
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
	placeholder,
	replyingTo,
	onCancelReply,
}: MessageComposerProps) {
	const { t } = useTranslate()
	const inputRef = useRef<TextInput>(null)
	const resolvedPlaceholder = placeholder ?? t('bookClub.messagePlaceholder')

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
				className="gap-2 border-edge px-4 py-3 flex-row items-center justify-center border-t bg-background"
				style={{ paddingBottom: keyboardVisible ? 12 : bottom + 12 }}
			>
				<Icon as={Lock} className="h-4 w-4 text-foreground-muted" />
				<Text size="sm" className="text-foreground-muted">
					{t('bookClub.discussionLocked')}
				</Text>
			</View>
		)
	}

	return (
		<View>
			{replyingTo && (
				<View className="gap-2 border-edge bg-background-surface/50 px-4 py-2 flex-row items-center border-t">
					<View className="flex-1">
						<Text size="xs" className="font-medium">
							{t('bookClub.replyingTo', {
								name:
									replyingTo.member?.displayName ||
									replyingTo.member?.username ||
									t('common.unknown'),
							})}
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
				className="gap-2 border-edge px-4 py-2 flex-row items-end border-t bg-background"
				style={{ paddingBottom: bottomPadding }}
			>
				<TextInput
					ref={inputRef}
					className="native:text-base squircle border-edge bg-background-surface px-3 py-2 max-h-[120px] min-h-[40px] flex-1 rounded-2xl border text-foreground"
					placeholder={resolvedPlaceholder}
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
					className="mb-1 h-9 w-9 bg-background-surface flex items-center justify-center rounded-full"
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
