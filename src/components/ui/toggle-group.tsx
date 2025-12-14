import * as React from 'react'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const toggleGroupVariants = cva(
  'inline-flex items-center justify-center rounded-md border border-border bg-transparent p-1',
  {
    variants: {
      size: {
        default: '',
        sm: 'text-xs',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

const toggleItemVariants = cva(
  'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
  {
    variants: {
      size: {
        default: 'h-9',
        sm: 'h-8 px-2.5 text-xs',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

export const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleGroupVariants>
>(({ className, size, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(toggleGroupVariants({ size }), className)}
    {...props}
  />
))
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

export const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleItemVariants>
>(({ className, size, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(toggleItemVariants({ size }), className)}
    {...props}
  />
))
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

