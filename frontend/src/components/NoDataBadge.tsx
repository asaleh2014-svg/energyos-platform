import { Unplug } from 'lucide-react'

/** Shown on cards/sections where data is not sourced from the database */
export function NoDataBadge({ label = 'Not connected to DB' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400">
      <Unplug size={9} />
      {label}
    </span>
  )
}

/** Full-card empty state with dashed border */
export function NoDataCard({ title, icon: Icon }: { title: string; icon?: React.ElementType }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-amber-500/20 bg-amber-500/5 p-6 flex flex-col items-center justify-center gap-2 text-center">
      <Unplug size={20} className="text-amber-500/40" />
      <div className="text-sm font-medium text-white/40">{title}</div>
      <NoDataBadge label="No data source connected" />
    </div>
  )
}
