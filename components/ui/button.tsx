import {
  cloneElement,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
} from "react";

import { cn } from "@/lib/utils";

type ButtonVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link";

type ButtonSize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  outline:
    "border border-border bg-background hover:bg-muted hover:text-foreground",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  ghost: "hover:bg-muted hover:text-foreground",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-8 gap-1.5 px-2.5",
  xs: "h-6 gap-1 rounded-md px-2 text-xs",
  sm: "h-7 gap-1 rounded-md px-2.5 text-sm",
  lg: "h-9 gap-1.5 px-2.5",
  icon: "size-8",
  "icon-xs": "size-6 rounded-md",
  "icon-sm": "size-7 rounded-md",
  "icon-lg": "size-9",
};

const buttonVariants = ({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) =>
  cn(
    "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const classes = buttonVariants({ variant, size, className });

  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<{ className?: string }>, {
      className: cn((children.props as { className?: string }).className, classes),
    });
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export { Button, buttonVariants };
