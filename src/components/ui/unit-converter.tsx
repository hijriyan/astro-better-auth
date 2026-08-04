import * as React from "react"
import { Calculator } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SourceUnit = "seconds" | "minutes" | "hours" | "days" | "weeks" | "months"

const multipliers: Record<SourceUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 60 * 60,
  days: 24 * 60 * 60,
  weeks: 7 * 24 * 60 * 60,
  months: 30 * 24 * 60 * 60,
}

interface UnitConverterProps {
  targetUnit: "ms" | "s"
  onConvert: (value: number) => void
  allowedUnits?: SourceUnit[]
}

const allUnits: { value: SourceUnit; label: string }[] = [
  { value: "seconds", label: "Seconds" },
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
]

export function UnitConverter({ targetUnit, onConvert, allowedUnits }: UnitConverterProps) {
  const unitsToRender = allUnits.filter((u) => !allowedUnits || allowedUnits.includes(u.value))
  
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState<string>("1")
  const [unit, setUnit] = React.useState<SourceUnit>(unitsToRender[0]?.value || "days")

  const calculateResult = () => {
    const num = parseFloat(value)
    if (isNaN(num)) return 0
    
    let seconds = num * multipliers[unit]
    return targetUnit === "ms" ? seconds * 1000 : seconds
  }

  const handleApply = () => {
    onConvert(calculateResult())
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="icon" className="h-8 w-8 shrink-0 ml-2 text-muted-foreground" type="button" title="Unit Converter" />}>
        <Calculator className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Unit Converter</h4>
            <p className="text-sm text-muted-foreground">
              Calculate time in {targetUnit === "ms" ? "milliseconds" : "seconds"}.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="converter-value">Value</Label>
                <Input
                  id="converter-value"
                  type="number"
                  min={1}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="converter-unit">Unit</Label>
                <Select value={unit} onValueChange={(val) => { if (val) setUnit(val as SourceUnit) }}>
                  <SelectTrigger id="converter-unit" className="h-8 text-sm">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsToRender.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="rounded-md bg-muted p-2 mt-1">
              <div className="text-xs text-muted-foreground">Result</div>
              <div className="font-mono text-sm font-medium">
                {Intl.NumberFormat().format(calculateResult())} {targetUnit}
              </div>
            </div>

            <Button size="sm" className="w-full mt-2" onClick={handleApply}>
              Apply Value
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
