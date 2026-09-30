export function FileName({
  children,
  className = '',
}: {
  children: string
  className?: string
}) {
  return (
    <bdi dir="ltr" className={className}>
      {children}
    </bdi>
  )
}
