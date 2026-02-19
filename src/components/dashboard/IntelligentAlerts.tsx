import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Users, Calendar, Shield, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Alert {
  id: string;
  type: 'payment_risk' | 'suspicious_activity' | 'term_override' | 'system_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  entity?: string;
  timestamp: Date;
  actionable: boolean;
  actionLabel?: string;
  actionPath?: string;
}

interface IntelligentAlertsProps {
  alerts: Alert[];
  onAlertAction?: (alertId: string) => void;
}

export default function IntelligentAlerts({ alerts, onAlertAction }: IntelligentAlertsProps) {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'payment_risk':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'suspicious_activity':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'term_override':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'system_risk':
        return <Users className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Intelligent Alerts
          <Badge variant="outline">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                expandedAlert === alert.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    {alert.entity && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Entity: {alert.entity}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {alert.timestamp.toLocaleString()}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedAlert === alert.id ? 'rotate-90' : ''
                  }`}
                />
              </div>

              {expandedAlert === alert.id && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="text-sm">
                    <div className="font-medium mb-2">Investigation Details</div>
                    <div className="space-y-2 text-muted-foreground">
                      <div>• Risk Level: {alert.severity.toUpperCase()}</div>
                      <div>• Alert Type: {alert.type.replace('_', ' ').toUpperCase()}</div>
                      <div>• First Detected: {alert.timestamp.toLocaleString()}</div>
                      {alert.entity && <div>• Affected Entity: {alert.entity}</div>}
                    </div>
                  </div>

                  {alert.actionable && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAlertAction?.(alert.id);
                        }}
                      >
                        {alert.actionLabel || 'Investigate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to detailed view
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active alerts detected</p>
              <p className="text-sm">System operating normally</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
