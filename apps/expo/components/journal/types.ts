export type JournalEditorProps = {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	onFocus?: () => void
	onBlur?: () => void
	lineHeight?: number
}

// TODO: okay so i _think_ i have a handle on how those nifty little rich text features work
// otu of the box for iOS. it would require a native module to use uitextivew, which is
// part of uikit (not swiftui, which expo ui uses). the problematic parts:
// - it outputs html, which i _really_ do not want to deal with but would mean we'd have to
//   take that html and convert it to markdown before pushing up to server, and do the
//   inverse when pulled down from server (bc no way im conforming all platforms on html)
//   can't just store e.g. html v text in db because that kills cross-platform compat
// - technically you can create an nsattributedstring from markdown, but there is a blurb in the
//   docs that reads like it is not quite that simple to get it properly repr for
//   the uitextview: "The system doesn’t add style attributes to match the Markdown elements"
//   so my understanding is id have to minimally parse the markdown and apply attributes
//   myself which gives me a little bit of agita
//
// for me later so i dont need to go digging again:
// - https://developer.apple.com/documentation/uikit/uitextview
// - https://developer.apple.com/documentation/uikit/uitextview/attributedtext
//
// anyways, for now I GUESS ill just leave it as a plain input and call it a day! i split
// the file preemptively for that native module down the road tho
