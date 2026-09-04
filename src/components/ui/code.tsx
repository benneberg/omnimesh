import { cn } from "@/lib/utils"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "sonner"
import React from "react"
type CodeProps = React.HTMLAttributes<HTMLElement>;
export function Code({ className, ...props }: CodeProps) {
  return (
    <code
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm",
        className
      )}
      {...props}
    />
  )
}
interface PreProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode
}
export function Pre({ className, children, ...props }: PreProps) {
  const [copied, setCopied] = useState(false)
  const codeRef = React.useRef<HTMLPreElement>(null)
  const handleCopy = async () => {
    if (!codeRef.current) return
    try {
      await navigator.clipboard.writeText(codeRef.current.textContent || "")
      setCopied(true)
      toast.success("Copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy")
    }
  }
  return (
    <div className="relative">
      <pre
        ref={codeRef}
        className={cn(
          "w-full overflow-x-auto rounded-md bg-muted p-4 border",
          className
        )}
        {...props}
      >
        {children}
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 h-7 w-7 p-0 opacity-0 hover:opacity-100 group-hover:opacity-100"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}
Code.displayName = "Code"
Pre.displayName = "Pre"