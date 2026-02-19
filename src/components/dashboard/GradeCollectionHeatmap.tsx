import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface GradeHeatmapItem {
  gradeId: string;
  gradeName: string;
  collectionRate: number;
  expected: number;
  collected: number;
  outstanding: number;
}

interface GradeCollectionHeatmapProps {
  items: GradeHeatmapItem[];
  onGradeClick?: (gradeId: string) => void;
}

function getHeatColor(rate: number) {
  if (rate >= 90) return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (rate >= 70) return "bg-green-100 text-green-900 border-green-200";
  if (rate >= 50) return "bg-yellow-100 text-yellow-900 border-yellow-200";
  if (rate >= 30) return "bg-orange-100 text-orange-900 border-orange-200";
  return "bg-red-100 text-red-900 border-red-200";
}

export default function GradeCollectionHeatmap({ items, onGradeClick }: GradeCollectionHeatmapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Grade-Level Collection Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">No grade collection data available</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <button
                key={item.gradeId}
                type="button"
                onClick={() => onGradeClick?.(item.gradeId)}
                className={cn(
                  "text-left p-4 rounded-lg border transition-shadow hover:shadow-sm",
                  getHeatColor(item.collectionRate),
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{item.gradeName}</div>
                    <div className="text-xs opacity-80">Expected: ZMW {item.expected.toLocaleString()}</div>
                    <div className="text-xs opacity-80">Collected: ZMW {item.collected.toLocaleString()}</div>
                    <div className="text-xs opacity-80">Outstanding: ZMW {item.outstanding.toLocaleString()}</div>
                  </div>
                  <div className="shrink-0 text-lg font-bold">{item.collectionRate}%</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
