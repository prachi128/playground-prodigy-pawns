'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, getDefaultClassNames } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        ...defaultClassNames,
        root: cn(defaultClassNames.root),
        months: cn(
          'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
          defaultClassNames.months
        ),
        month: cn('space-y-4', defaultClassNames.month),
        month_caption: cn(
          'flex justify-center pt-1 relative items-center',
          defaultClassNames.month_caption
        ),
        caption_label: cn('text-sm font-medium', defaultClassNames.caption_label),
        nav: cn('space-x-1 flex items-center', defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
          defaultClassNames.button_next
        ),
        month_grid: cn('w-full border-collapse space-y-1', defaultClassNames.month_grid),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
          defaultClassNames.weekday
        ),
        week: cn('flex w-full mt-2', defaultClassNames.week),
        day: cn(
          'h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 [&:has([data-selected].range-end)]:rounded-r-md [&:has([data-selected].outside)]:bg-accent/50 [&:has([data-selected])]:bg-accent first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md',
          defaultClassNames.day
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal data-[selected]:opacity-100',
          defaultClassNames.day_button
        ),
        range_start: cn('rounded-l-md', defaultClassNames.range_start),
        range_end: cn('rounded-r-md', defaultClassNames.range_end),
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: cn('bg-accent text-accent-foreground', defaultClassNames.today),
        outside:
          'text-muted-foreground data-[selected]:bg-accent/50 data-[selected]:text-muted-foreground',
        disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
        range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" {...chevronProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
