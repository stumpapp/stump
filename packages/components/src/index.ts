export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U
export type PickSelect<T, K extends keyof T> = T[K]
// NOTE: Don't use this unless necessary!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any

export { Alert } from './alert'
export { Badge, type BadgeProps } from './badge'
export {
	Button,
	ButtonOrLink,
	type ButtonOrLinkProps,
	type ButtonProps,
	IconButton,
	type IconButtonProps,
} from './button'
export { Card, CardGrid, type CardProps, EntityCard, HoverCard, type HoverCardProps } from './card'
export { Command, type CommandProps } from './command'
export { Container, Divider, Layout, Spacer, type SpacerProps } from './container'
export { ContextMenu, type ContextMenuProps } from './context-menu'
export { ConfirmationModal, type ConfirmationModalProps, Dialog } from './dialog'
export { DropdownMenu, type DropdownMenuProps } from './dropdown'
export { Form, type FormProps, Label, type LabelProps } from './form'
export { useBodyLock, useBoolean, usePrevious, usePreviousIsDifferent, useToast } from './hooks'
export { AspectRatio, Avatar, Image } from './image'
export {
	CheckBox,
	type CheckBoxProps,
	Input,
	RawSwitch,
	Switch,
	type SwitchProps,
	TextArea,
	type TextAreaProps,
} from './input'
export { Link } from './link'
export { Popover } from './popover'
export { FullScreenLoader, ProgressBar, type ProgressBarProps, ProgressSpinner } from './progress'
export { RadioGroup } from './radio'
export { ComboBox, type ComboBoxProps, NativeSelect, type NativeSelectProps } from './select'
export { Sheet, SheetPrimitive } from './sheet'
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
export { ToolTip, type ToolTipProps } from './tooltip'
export { cn, cx } from './utils'
