interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeUp?: boolean;
}

export function StatCard({ label, value, change, changeUp }: StatCardProps) {
  return (
    <div className="bg-bg2 border border-bg5 rounded-2xl p-5">
      <p className="text-txt3 text-[10px] tracking-widest mb-2">{label}</p>
      <p className="text-txt font-bold text-3xl mb-1">{value}</p>
      {change && (
        <p className={`text-xs ${changeUp ? "text-accent-light" : "text-coral"}`}>
          {changeUp ? "↑" : "↓"} {change}
        </p>
      )}
    </div>
  );
}
