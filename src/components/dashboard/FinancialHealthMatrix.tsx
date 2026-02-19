import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";

interface FinancialHealthMatrixProps {
  data: {
    revenueVelocity: {
      current: number;
      previous: number;
      change: number;
    };
    riskExposure: {
      days30: number;
      days60: number;
      days90: number;
      total: number;
    };
    collectionRate: number;
    activeAlerts: number;
  };
  currentTerm?: number;
  currentYear?: number;
  isLocked?: boolean;
  totalExpected?: number; // Add total expected for risk calculation
}

export default function FinancialHealthMatrix({ data, currentTerm = 1, currentYear = new Date().getFullYear(), isLocked = false, totalExpected = 0 }: FinancialHealthMatrixProps) {
  const { revenueVelocity, riskExposure, collectionRate, activeAlerts } = data;

  // Calculate risk threshold based on expected revenue
  const highRiskThreshold = totalExpected > 0 ? totalExpected * 0.3 : 1000000; // 30% of expected or default
  const criticalRiskThreshold = totalExpected > 0 ? totalExpected * 0.5 : 2000000; // 50% of expected or default

  return (
    <div className="space-y-6">
      {/* Live Status Strip */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border">
        <div className="flex items-center gap-6">
          <Badge variant="outline" className={isLocked ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-green-50 text-green-700 border-green-200"}>
            Term {currentTerm} {isLocked ? "- LOCKED" : "- ACTIVE"}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Collection Rate:</span>
            <span className="font-semibold">{collectionRate}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Risk Level:</span>
            <Badge variant={riskExposure.total > criticalRiskThreshold ? "destructive" : riskExposure.total > highRiskThreshold ? "destructive" : "secondary"}>
              {riskExposure.total > criticalRiskThreshold ? "Critical" : riskExposure.total > highRiskThreshold ? "High" : "Medium"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">{activeAlerts} Active Alerts</span>
        </div>
      </div>

      {/* Financial Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Velocity */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">ZMW {revenueVelocity.current.toLocaleString()}</span>
                <div className={`flex items-center gap-1 text-sm ${
                  revenueVelocity.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {revenueVelocity.change > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {Math.abs(revenueVelocity.change)}%
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Last 7 days vs previous 7 days
              </div>
              <div className="text-xs text-muted-foreground">
                Previous: ZMW {revenueVelocity.previous.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Exposure */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Risk Exposure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-red-600">
                ZMW {riskExposure.total.toLocaleString()}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>30 days</span>
                  <span>ZMW {riskExposure.days30.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>60 days</span>
                  <span>ZMW {riskExposure.days60.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>90 days</span>
                  <span className="text-red-600">ZMW {riskExposure.days90.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collection Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold">{collectionRate}%</div>
              <Progress value={collectionRate} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {collectionRate < 70 ? "Below target" : collectionRate < 90 ? "On track" : "Excellent"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
