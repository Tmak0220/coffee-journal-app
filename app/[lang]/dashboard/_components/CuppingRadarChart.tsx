"use client"

import React from "react"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"

type RadarData = {
  subject: string
  value: number
}

type Props = {
  data: RadarData[]
}

export default function CuppingRadarChart({ data }: Props) {
  // すべてのデータが 0（未入力）の場合はグラフが潰れるので、
  // プレースホルダー表示にするなどの制御もここで独立して書けます。
  const hasData = data.some(d => d.value > 0)

  if (!hasData) {
    return (
      <div className="w-full h-32 flex items-center justify-center text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
        No Data Available
      </div>
    )
  }

  return (
    <div className="w-full h-36 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
          <PolarGrid stroke="#f5f5f5" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: "#a3a3a3", fontSize: 9, fontFamily: "monospace", fontWeight: "600" }} 
          />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            name="Cupping"
            dataKey="value"
            stroke="#171717"
            fill="#171717"
            fillOpacity={0.04}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}