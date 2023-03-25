export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U
export type PickSelect<T, K extends keyof T> = T[K]
// NOTE: Don't use this unless necessary!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any

export { Alert } from './alert'
export { type BadgeProps, Badge } from './badge'
export {
	type ButtonOrLinkProps,
	type ButtonProps,
	type IconButtonProps,
	Button,
	ButtonOrLink,
	IconButton,
} from './button'
export { type CardProps, type HoverCardProps, Card, HoverCard } from './card'
export { type CommandProps, Command } from './command'
export { Container, Divider, Layout } from './container'
export { type ContextMenuProps, ContextMenu } from './context-menu'
export { type ConfirmationModalProps, ConfirmationModal, Dialog } from './dialog'
export { type DropdownMenuProps, DropdownMenu } from './dropdown'
export { type FormProps, type LabelProps, Form, Label } from './form'
export { useBodyLock, useBoolean, useToast } from './hooks'
export { AspectRatio, Avatar, Image } from './image'
export { type CheckBoxProps, type TextAreaProps, CheckBox, Input, TextArea } from './input'
export { Link } from './link'
export { Popover } from './popover'
export { type ProgressBarProps, FullScreenLoader, ProgressBar } from './progress'
export { type ComboBoxProps, type NativeSelectProps, ComboBox, NativeSelect } from './select'
export { Tabs } from './tabs'
export {
	type HeadingProps,
	type StatisticProps,
	type TextProps,
	Heading,
	Statistic,
	Text,
	TEXT_VARIANTS,
} from './text'
export { type ToolTipProps, ToolTip } from './tooltip'
export { cn, cx } from './utils'
