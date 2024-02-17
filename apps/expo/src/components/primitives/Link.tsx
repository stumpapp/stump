import { Link as NativeLink, ParamListBase } from '@react-navigation/native'
import { styled } from 'nativewind'
import { ComponentProps } from 'react'

type Props = ComponentProps<typeof NativeLink<ParamListBase>>
export const Link = styled<Props>(NativeLink)
