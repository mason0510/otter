import * as React from "react"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-lg border bg-slate-800/50 text-slate-50 ${className || ''}`}
      {...props}
    />
  )
)
Card.displayName = "Card"

export { Card }
