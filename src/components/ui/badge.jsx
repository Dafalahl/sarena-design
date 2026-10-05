import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-none border-2 border-black px-2.5 py-0.5 text-[10px] font-bold font-mono tracking-wider uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-accent-lime text-black",
        secondary:
          "bg-accent-purple text-white",
        destructive:
          "bg-accent-orange text-black",
        outline:
          "bg-white text-black",
        success:
          "bg-emerald-500 text-white",
        warning:
          "bg-accent-yellow text-black",
        info:
          "bg-accent-blue text-black",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
