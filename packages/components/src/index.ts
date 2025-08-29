// NOTE: Don't use this unless necessary!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any

export { Accordion } from './accordion'
export { Alert, AlertDescription, AlertTitle } from './alert'
export { Badge, type BadgeProps } from './badge'
export { Breadcrumbs, type BreadcrumbsProps } from './breadcrumbs'
export {
	Button,
	ButtonOrLink,
	type ButtonOrLinkProps,
	type ButtonProps,
	buttonVariants,
	IconButton,
	type IconButtonProps,
} from './button'
export { Calendar, DatePicker } from './calendar'
export { Card, CardGrid, type CardProps, HoverCard, type HoverCardProps } from './card'
export { Command, type CommandProps } from './command'
export { Divider, Spacer, type SpacerProps, SplitContainer } from './container'
export { ContextMenu, type ContextMenuProps } from './context-menu'
export { ConfirmationModal, type ConfirmationModalProps, Dialog } from './dialog'
export { Drawer } from './drawer'
export { Dropdown, DropdownMenu, type DropdownMenuProps } from './dropdown'
export { EmojiPicker } from './emoji'
export { Form, type FormProps, Label, type LabelProps } from './form'
export * from './hooks'
export { AspectRatio, Avatar, Image } from './image'
export {
	CheckBox,
	type CheckBoxProps,
	Input,
	PasswordInput,
	RawSwitch,
	RawTextArea,
	type RawTextAreaProps,
	Switch,
	type SwitchProps,
	TextArea,
	type TextAreaProps,
	WideSwitch,
	type WideSwitchProps,
} from './input'
export { Link } from './link'
export { NavigationMenu, navigationMenuTriggerStyle } from './navigation'
export { Popover } from './popover'
export { Preformatted, type PreformattedProps } from './preformatted'
export { FullScreenLoader, ProgressBar, type ProgressBarProps, ProgressSpinner } from './progress'
export { RadioGroup } from './radio'
export { ScrollArea, ScrollBar } from './scroll-area'
export { ComboBox, type ComboBoxProps, NativeSelect, type NativeSelectProps } from './select'
export { Sheet, SheetPrimitive } from './sheet'
export { Slider } from './slider'
export { Tabs } from './tabs'
export {
	Heading,
	type HeadingProps,
	Statistic,
	type StatisticProps,
	Text,
	TEXT_VARIANTS,
	type TextProps,
} from './text'
export { Toast } from './toast'
export { ToolTip, type ToolTipProps } from './tooltip'
export { cn, cx, type PickSelect, type Without, type XOR } from './utils'

// TODO: Add charts! https://ui.shadcn.com/docs/components/chart yay
// Cool data visualization stuff!
