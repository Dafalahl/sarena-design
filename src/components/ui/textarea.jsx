import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-none border-2 border-black bg-white px-3 py-2.5 text-sm text-black shadow-[2px_2px_0px_0px_#000000] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-0 focus:bg-amber-50/10 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Textarea.displayName = "Textarea"

export { Textarea }
