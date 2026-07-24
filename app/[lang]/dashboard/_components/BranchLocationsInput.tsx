"use client"

import React from "react"
import { Plus, Trash2 } from "lucide-react"

export type BranchLocation = {
  name: string
  address: string
  hours: string
  phone: string
  email: string
}

type BranchLocationsInputProps = {
  headquarters: BranchLocation
  onHqChange: (field: keyof BranchLocation, value: string) => void
  branches: BranchLocation[]
  onBranchesChange: (updated: BranchLocation[]) => void
  t: {
    labelHeadquarters: string
    descHeadquarters: string
    labelBranches: string
    descBranches: string
    placeholderBranchName: string
    placeholderBranchAddress: string
    placeholderBranchHours: string
    placeholderBranchPhone: string
    placeholderBranchEmail: string
    addBranchBtn: string
    requiredBadge: string
  }
  inputStyle: string
}

export default function BranchLocationsInput({
  headquarters,
  onHqChange,
  branches,
  onBranchesChange,
  t,
  inputStyle,
}: BranchLocationsInputProps) {
  
  const addBranch = () => {
    onBranchesChange([...branches, { name: "", address: "", hours: "", phone: "", email: "" }])
  }

  const handleBranchChange = (index: number, field: keyof BranchLocation, value: string) => {
    const updated = [...branches]
    updated[index][field] = value
    onBranchesChange(updated)
  }

  const removeBranch = (index: number) => {
    onBranchesChange(branches.filter((_, i) => i !== index))
  }

  return (
    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 border-t border-neutral-100 pt-8">
      
      <div className="md:col-span-2 space-y-4">
        <div>
          <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900 font-mono">
            {t.labelHeadquarters}
            <span className="text-neutral-500 text-[11px] font-sans font-medium ml-1">{t.requiredBadge}</span>
          </label>
          <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5">
            {t.descHeadquarters}
          </p>
        </div>
        <div className="p-5 border border-neutral-200 rounded-2xl bg-white space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={headquarters.name}
              onChange={(e) => onHqChange("name", e.target.value)}
              placeholder={t.placeholderBranchName}
              className={inputStyle}
              required
            />
            <input
              type="text"
              value={headquarters.address}
              onChange={(e) => onHqChange("address", e.target.value)}
              placeholder={t.placeholderBranchAddress}
              className={inputStyle}
            />
            <input
              type="text"
              value={headquarters.hours}
              onChange={(e) => onHqChange("hours", e.target.value)}
              placeholder={t.placeholderBranchHours}
              className={inputStyle}
            />
            <input
              type="text"
              value={headquarters.phone}
              onChange={(e) => onHqChange("phone", e.target.value)}
              placeholder={t.placeholderBranchPhone}
              className={inputStyle}
            />
            <div className="md:col-span-2">
              <input
                type="email"
                value={headquarters.email}
                onChange={(e) => onHqChange("email", e.target.value)}
                placeholder={t.placeholderBranchEmail}
                className={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 space-y-4 pt-4 border-t border-neutral-100">
        <div>
          <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900 font-mono">
            {t.labelBranches}
          </label>
          <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5">
            {t.descBranches}
          </p>
        </div>

        <div className="space-y-4">
          {branches.map((branch, idx) => (
            <div
              key={idx}
              className="p-4 border border-neutral-200/70 rounded-2xl bg-neutral-50/20 space-y-3 relative group"
            >
              <button
                type="button"
                onClick={() => removeBranch(idx)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={branch.name}
                  onChange={(e) => handleBranchChange(idx, "name", e.target.value)}
                  placeholder={t.placeholderBranchName}
                  className={inputStyle}
                />
                <input
                  type="text"
                  value={branch.address}
                  onChange={(e) => handleBranchChange(idx, "address", e.target.value)}
                  placeholder={t.placeholderBranchAddress}
                  className={inputStyle}
                />
                <input
                  type="text"
                  value={branch.hours}
                  onChange={(e) => handleBranchChange(idx, "hours", e.target.value)}
                  placeholder={t.placeholderBranchHours}
                  className={inputStyle}
                />
                <input
                  type="text"
                  value={branch.phone}
                  onChange={(e) => handleBranchChange(idx, "phone", e.target.value)}
                  placeholder={t.placeholderBranchPhone}
                  className={inputStyle}
                />
                <div className="md:col-span-2">
                  <input
                    type="email"
                    value={branch.email}
                    onChange={(e) => handleBranchChange(idx, "email", e.target.value)}
                    placeholder={t.placeholderBranchEmail}
                    className={inputStyle}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addBranch}
          className="w-full py-3 border border-dashed border-neutral-300 hover:border-neutral-400 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-all flex items-center justify-center gap-2 bg-white"
        >
          <Plus className="w-3.5 h-3.5" />
          {t.addBranchBtn}
        </button>
      </div>

    </div>
  )
}
