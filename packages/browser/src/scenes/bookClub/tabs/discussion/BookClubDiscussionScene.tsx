export default function BookClubDiscussionScene() {
	// TODO(graphql): Fix me
	return null
	// const { bookClub, viewerCanManage } = useBookClubContext()
	// const [search] = useSearchParams()
	// const archivedDiscussionID = search.get('archived_discussion') ?? undefined

	// const { discussion, isLoading } = useDiscussionQuery({
	// 	bookClubId: bookClub.id,
	// 	discussionId: archivedDiscussionID,
	// })
	// const chatId = (discussion || { id: 'oopsies' }).id ?? archivedDiscussionID

	// if (isLoading) return null
	// if (!discussion && !archivedDiscussionID) {
	// 	const canOpen = !!bookClub.schedule?.books?.length
	// 	// NOTE: ew, kms
	// 	const message = viewerCanManage
	// 		? canOpen
	// 			? 'You have not opened the discussion yet. Click the button below to open it'
	// 			: 'There are no books in the schedule. You must add books to the schedule before a discussion can be opened'
	// 		: 'The discussion has not been opened yet'

	// 	return (
	// 		<Card className="flex flex-col border-dashed px-4 pb-4">
	// 			<GenericEmptyState title="No discussion available" subtitle={message} />
	// 			<div className="self-center">
	// 				{/* FIXME: render right thing */}
	// 				{viewerCanManage && (
	// 					<ButtonOrLink variant="secondary" href={paths.bookClubScheduler(bookClub.id)}>
	// 						Create a schedule
	// 					</ButtonOrLink>
	// 				)}
	// 			</div>
	// 		</Card>
	// 	)
	// } else if (!discussion && archivedDiscussionID) {
	// 	return <Navigate to="/404" />
	// }

	// return (
	// 	<div className="md:h-full">
	// 		{mockMessages.map((message) => (
	// 			<ChatMessage key={message.id} message={message} chatId={chatId} />
	// 		))}
	// 	</div>
	// )
}

// const mockMessages: BookClubDiscussionMessage[] = [
// 	{
// 		child_messages: [
// 			{
// 				content: 'I know right?!?!',
// 				id: '2',
// 				is_top_message: false,
// 				member: {
// 					hide_progress: false,
// 					id: '1',
// 					is_creator: false,
// 					private_membership: false,
// 					role: 'MEMBER',
// 					user: {
// 						id: '1',
// 						username: 'Stede Bonnet',
// 					} as User,
// 				},
// 				timestamp: new Date().toString(),
// 			},
// 		],
// 		content: 'WOW! Did you see that coming?? I cannot believe that happened!!!!',
// 		id: '1',
// 		is_top_message: true,
// 		member: {
// 			hide_progress: false,
// 			id: '2',
// 			is_creator: false,
// 			private_membership: false,
// 			role: 'MEMBER',
// 			user: {
// 				id: '1',
// 				username: 'Wee John',
// 			} as User,
// 		},
// 		timestamp: new Date().toString(),
// 	},
// ]
