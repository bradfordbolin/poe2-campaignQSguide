import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold leading-none',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground',
        primary: 'bg-primary text-primary-foreground border-transparent',
        secondary: 'bg-secondary text-secondary-foreground border-transparent',
        outline: 'bg-transparent text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
)

