import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer border-2 border-black select-none",
  {
    variants: {
      variant: {
        default:
          "bg-accent-lime text-black shadow-brutalist btn-bounce",
        primary:
          "bg-accent-purple text-white shadow-brutalist btn-bounce",
        secondary:
          "bg-white text-black shadow-brutalist hover:bg-slate-50 btn-bounce",
        destructive:
          "bg-accent-orange text-black shadow-brutalist btn-bounce",
        outline:
          "bg-white text-black border-2 border-black hover:bg-accent-lime btn-bounce",
        ghost:
          "bg-transparent text-black border-transparent hover:border-black hover:bg-white btn-bounce",
        link:
          "bg-transparent text-black border-transparent shadow-none hover:underline font-mono tracking-normal normal-case",
        gradient:
          "bg-accent-yellow text-black shadow-brutalist btn-bounce",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-[10px]",
        lg: "h-11 px-8 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, noBounce = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  const computedClasses = buttonVariants({ variant, size, className })
  const finalClasses = noBounce ? computedClasses.replace(/\bbtn-bounce\b/g, '') : computedClasses
  return (
    <Comp
      className={cn(finalClasses)}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
