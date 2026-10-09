import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'

type ButtonVariant = 'primary' | 'secondary' | 'outline'

interface PrimaryButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  /** 撑满父容器宽度 */
  block?: boolean
  disabled?: boolean
  className?: string
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-tertiary text-[#ffffff]',
  secondary: 'bg-secondary-container text-on-secondary-container',
  outline: 'bg-transparent border border-outline-variant text-on-surface',
}

export default function PrimaryButton({
  children,
  onClick,
  variant = 'primary',
  block = false,
  disabled = false,
  className = '',
}: PrimaryButtonProps) {
  return (
    <View
      className={`h-11 px-6 rounded-full flex items-center justify-center box-border ${
        block ? 'w-full' : 'self-start'
      } ${VARIANT_CLASS[variant]} ${disabled ? 'opacity-40' : 'active:opacity-80'} ${className}`}
      onClick={disabled ? undefined : onClick}
    >
      <Text className="text-label-md">{children}</Text>
    </View>
  )
}
