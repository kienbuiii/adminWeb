import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/utils";

const Button = React.forwardRef(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            // Variants
            "bg-primary text-white shadow-md hover:bg-primary/90 focus:ring-primary":
              variant === "default",
            "bg-red-600 text-white shadow-md hover:bg-red-700 focus:ring-red-500":
              variant === "destructive",
            "border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-100 focus:ring-gray-300":
              variant === "outline",
            "bg-transparent text-gray-800 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300":
              variant === "ghost",
            "bg-transparent text-blue-600 hover:underline focus:ring-blue-500":
              variant === "link",

            // Sizes
            "h-10 px-4 py-2 text-base": size === "default",
            "h-9 px-3 text-sm": size === "small",
            "h-12 px-6 text-lg": size === "large",
            "h-10 w-10 p-0 flex items-center justify-center": size === "icon",
          },
          className
        )}
        disabled={disabled}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
