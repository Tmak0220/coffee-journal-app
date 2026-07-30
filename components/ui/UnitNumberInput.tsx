"use client"

import type { InputHTMLAttributes } from "react"

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value?: string
  onValueChange: (value: string) => void
  unit?: string
  prefix?: string
}

const normalizeCharacters = (value: string) => value
  .replace(/[０-９]/g, (character) => String(character.charCodeAt(0) - 0xfee0))
  .replace(/[．。]/g, ".")
  .replace(/[−ー]/g, "-")
  .replace(/,/g, "")

export const numericPart = (value?: string) => {
  if (!value) return ""
  const normalized = normalizeCharacters(value.trim())
  const match = normalized.match(/-?(?:\d+(?:\.\d*)?|\.\d+)/)
  return match?.[0] || ""
}

export default function UnitNumberInput({
  value = "",
  onValueChange,
  unit,
  prefix,
  min,
  max,
  className = "",
  disabled,
  ...props
}: Props) {
  const displayValue = numericPart(value)

  const updateValue = (rawValue: string) => {
    const normalized = normalizeCharacters(rawValue)
    if (normalized === "" || normalized === "-" || normalized === "." || normalized === "-.") {
      onValueChange(normalized)
      return
    }
    if (/^-?\d*(?:\.\d*)?$/.test(normalized)) {
      onValueChange(normalized)
      return
    }
    onValueChange(numericPart(normalized))
  }

  const clampValue = () => {
    if (displayValue === "") return
    const number = Number(displayValue)
    if (!Number.isFinite(number)) {
      onValueChange("")
      return
    }
    const minimum = min == null ? null : Number(min)
    const maximum = max == null ? null : Number(max)
    const clamped = Math.min(
      maximum != null && Number.isFinite(maximum) ? maximum : number,
      Math.max(minimum != null && Number.isFinite(minimum) ? minimum : number, number)
    )
    onValueChange(String(clamped))
  }

  return (
    <div className={`flex overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-sm transition focus-within:border-neutral-500 focus-within:ring-4 focus-within:ring-neutral-100 ${disabled ? "cursor-not-allowed bg-neutral-100" : ""} ${className}`}>
      {prefix && (
        <span className="flex shrink-0 items-center border-r border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold text-neutral-500">
          {prefix}
        </span>
      )}
      <input
        {...props}
        type="text"
        inputMode="decimal"
        value={displayValue}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => updateValue(event.target.value)}
        onBlur={(event) => {
          clampValue()
          props.onBlur?.(event)
        }}
        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:text-neutral-500"
      />
      {unit && (
        <span className="flex shrink-0 items-center border-l border-neutral-200 bg-neutral-50 px-3 font-mono text-[11px] font-semibold text-neutral-500">
          {unit}
        </span>
      )}
    </div>
  )
}
