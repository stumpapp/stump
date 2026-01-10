// import { Avatar, Button, cx, IconButton, Text, ToolTip } from '@stump/components'
// import { BookClubDiscussionMessage } from '@stump/sdk'
// import dayjs from 'dayjs'
// import { MessageCircle, ThumbsUp } from 'lucide-react'
// import pluralize from 'pluralize'
// import { Link } from 'react-router-dom'

// import { useBookClubContext } from '@/components/bookClub'
// import Markdown from '@/components/markdown/MarkdownPreview'
// import paths from '@/paths'

// type Props = {
// 	message: BookClubDiscussionMessage
// 	chatId: string
// 	isArchived?: boolean
// }
// export default function ChatMessage({ message, chatId, isArchived }: Props) {
// 	// TODO(graphql): Fix me
// 	return null
// 	// const { prefetch } = usePrefetchClubThread()
// 	// const { bookClub, viewerMember } = useBookClubContext()

// 	// const displayName = message.member?.display_name ?? message.member?.user?.username ?? 'Unknown'
// 	// const avatarUrl = message.member?.user?.avatar_url ?? undefined

// 	// const childMessages = message.child_messages?.length ?? 0

// 	// const isLikedByViewer =
// 	// 	message.likes?.some(({ liked_by }) => liked_by?.id === viewerMember?.id) ?? false

// 	// return (
// 	// 	<div className="flex gap-4">
// 	// 		<Avatar src={avatarUrl} fallback={displayName} className="h-8 w-8" />

// 	// 		<div className="flex flex-col gap-4">
// 	// 			<div className="flex flex-col gap-1">
// 	// 				<div className="flex items-center gap-2">
// 	// 					<Text size="sm" className="font-medium">
// 	// 						{displayName}
// 	// 					</Text>

// 	// 					<Text size="xs" variant="muted">
// 	// 						{dayjs(message.timestamp).format('MMMM D, YYYY h:mm A')}
// 	// 					</Text>
// 	// 				</div>
// 	// 				<Markdown className="text-sm dark:text-gray-150">{message.content}</Markdown>
// 	// 			</div>

// 	// 			<div className="flex items-center gap-2">
// 	// 				<IconButton variant="ghost" size="sm" className="flex items-center gap-2">
// 	// 					<ThumbsUp
// 	// 						className={cx('h-4 w-4', {
// 	// 							'text-foreground-brand': isLikedByViewer,
// 	// 						})}
// 	// 					/>
// 	// 				</IconButton>

// 	// 				<ToolTip content="Go to thread">
// 	// 					<Button
// 	// 						variant="ghost"
// 	// 						size="sm"
// 	// 						onMouseEnter={() =>
// 	// 							prefetch({
// 	// 								bookClubId: bookClub.id,
// 	// 								chatId,
// 	// 								threadId: message.id,
// 	// 							})
// 	// 						}
// 	// 					>
// 	// 						<Link
// 	// 							to={paths.bookClubDiscussionMessage(
// 	// 								bookClub.id,
// 	// 								message.id,
// 	// 								isArchived ? chatId : undefined,
// 	// 							)}
// 	// 							className="flex items-center gap-2 py-0.5"
// 	// 						>
// 	// 							<Text size="xs">{pluralize('reply', childMessages, true)}</Text>
// 	// 							<MessageCircle className="h-4 w-4" />
// 	// 						</Link>
// 	// 					</Button>
// 	// 				</ToolTip>
// 	// 			</div>
// 	// 		</div>
// 	// 	</div>
// 	// )
// }
