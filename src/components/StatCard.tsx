import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: "default" | "success" | "warning" | "destructive";
}

const variantStyles = {
  default: "bg-card border border-border",
  success: "bg-success/10 border border-success/20",
  warning: "bg-warning/10 border border-warning/20",
  destructive: "bg-destructive/10 border border-destructive/20",
};

const iconStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  destructive: "bg-destructive/20 text-destructive",
};

export default function StatCard({ title, value, subtitle, icon, variant = "default" }: StatCardProps) {
  return (
    <div className={`rounded-xl p-5 animate-fade-in ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1 font-display">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${iconStyles[variant]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
