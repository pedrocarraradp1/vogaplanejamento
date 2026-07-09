import { cn } from "@/lib/utils"

export interface FieldValueReadonlyProps extends React.ComponentProps<"p"> {
  empty?: string
}

export function FieldValueReadonly({
  className,
  children,
  empty = "—",
  ...props
}: FieldValueReadonlyProps) {
  const vazio =
    children === null ||
    children === undefined ||
    children === "" ||
    (typeof children === "number" && Number.isNaN(children))

  return (
    <p className={cn("field-value-readonly", className)} {...props}>
      {vazio ? empty : children}
    </p>
  )
}
