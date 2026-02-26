import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, AlertTriangle, GraduationCap, Database, RefreshCw, Percent, Search, Filter, Calendar, Download, FileText } from "lucide-react";
import { getAccurateDashboardStats, getOtherFeesBreakdown, getPupilsByFeeType, getDiscountBreakdown } from "@/services/fees";
import { supabase } from "@/integrations/supabase/client";
import { getGradeCounts } from "@/services/grades";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Comprehensive Collection Analytics Component
const CollectionAnalytics = () => {
  const [viewMode, setViewMode] = useState<'term' | 'month' | 'year'>('term');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(''); // Will be set from database
  const [feeType, setFeeType] = useState<'all' | 'tuition'>('all');
  const [availableTerms, setAvailableTerms] = useState<{ id: string; name: string; year: number }[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableFeeTypes, setAvailableFeeTypes] = useState<{ type: string; label: string; count: number }[]>([]);
  const [analyticsData, setAnalyticsData] = useState<{ time_bucket: string; rate: number; volume: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalExpected: 0,
    totalCollected: 0,
    currentRate: 0,
    outstanding: 0,
    highestPeriod: ''
  });

  // Fetch available terms, years, and fee types from database
  useEffect(() => {
    const fetchDatabaseData = async () => {
      // Fetch active terms with years
      const { data: terms } = await supabase
        .from('terms')
        .select('id, name, start_date, end_date')
        .eq('is_active', true)
        .order('start_date', { ascending: true });
      
      // Extract unique years from terms
      if (terms && terms.length > 0) {
        const years = [...new Set(terms.map(term => new Date(term.start_date).getFullYear()))];
        setAvailableYears(years.sort((a, b) => b - a));
        
        // Set default year to most recent
        const mostRecentYear = years[0];
        setSelectedYear(mostRecentYear.toString());
        
        // Set available terms with year info
        setAvailableTerms(terms.map(term => ({
          id: term.id, 
          name: term.name, 
          year: new Date(term.start_date).getFullYear()
        })));
      }
      
      // Fetch fee types from other_fees table
      const { data: otherFees } = await supabase
        .from('other_fees')
        .select('fee_type')
        .not('fee_type', 'is', null);
      
      if (otherFees && otherFees.length > 0) {
        const feeTypeCounts = otherFees.reduce((acc, fee) => {
          const type = fee.fee_type;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const feeTypes = Object.entries(feeTypeCounts)
          .map(([type, count]) => ({
            type,
            label: type.charAt(0).toUpperCase() + type.slice(1),
            count: count as number
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        
        setAvailableFeeTypes(feeTypes);
      }
    };
    
    fetchDatabaseData();
  }, []);

  // Fetch analytics data based on current filters
  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      let analyticsData: { time_bucket: string; rate: number; volume: number }[] = [];
      let totalExpected = 0;
      let totalCollected = 0;
      
      // Helper function to filter fees by type
      const filterFeesByType = (schoolFees: any[], otherFees: any[], type: string) => {
        if (type === 'all') {
          return {
            schoolFees,
            otherFees
          };
        } else if (type === 'tuition') {
          return {
            schoolFees,
            otherFees: []
          };
        } else {
          // Check if this fee type exists in our available fee types
          const feeTypeExists = availableFeeTypes.some(ft => ft.type.toLowerCase() === type.toLowerCase());
          if (!feeTypeExists) {
            return { schoolFees: [], otherFees: [] };
          }
          return {
            schoolFees: [],
            otherFees: otherFees.filter(fee => fee.fee_type?.toLowerCase() === type.toLowerCase())
          };
        }
      };
      
      if (viewMode === 'term' && selectedTerm) {
        // Term View - Group by weeks within term
        const { data: termData } = await supabase
          .from('terms')
          .select('start_date, end_date')
          .eq('id', selectedTerm)
          .single();
        
        if (termData) {
          const startDate = new Date(termData.start_date);
          const endDate = new Date(termData.end_date);
          const weeksInTerm = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          
          // Get all fees for this term
          const { data: schoolFees } = await supabase
            .from('school_fees')
            .select('total_expected, total_collected')
            .eq('term_id', selectedTerm);
          
          const { data: otherFees } = await supabase
            .from('other_fees')
            .select('fee_type, total_expected, collected')
            .eq('term_id', selectedTerm);
          
          // Filter by fee type
          const filteredFees = filterFeesByType(schoolFees || [], otherFees || [], feeType);
          
          // Calculate totals
          totalExpected = (filteredFees.schoolFees?.reduce((sum, fee) => sum + (fee.total_expected || 0), 0) || 0) + 
                        (filteredFees.otherFees?.reduce((sum, fee) => sum + (fee.total_expected || 0), 0) || 0);
          totalCollected = (filteredFees.schoolFees?.reduce((sum, fee) => sum + (fee.total_collected || 0), 0) || 0) + 
                         (filteredFees.otherFees?.reduce((sum, fee) => sum + (fee.collected || 0), 0) || 0);
          
          // Generate weekly data with proper cumulative logic
          let cumulativeCollected = 0;
          for (let week = 1; week <= weeksInTerm; week++) {
            const weekStart = new Date(startDate.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
            const weekEnd = new Date(Math.min(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000, endDate.getTime()));
            
            // Get installments for this week
            const { data: weekInstallments } = await supabase
              .from('installments')
              .select('amount_paid')
              .gte('date_paid', weekStart.toISOString())
              .lte('date_paid', weekEnd.toISOString());
            
            const weekVolume = weekInstallments?.reduce((sum, installment) => sum + (installment.amount_paid || 0), 0) || 0;
            cumulativeCollected += weekVolume;
            const rate = totalExpected > 0 ? (cumulativeCollected / totalExpected) * 100 : 0;
            
            analyticsData.push({
              time_bucket: `Week ${week}`,
              rate: Math.round(rate),
              volume: weekVolume
            });
          }
        }
      } else if (viewMode === 'month' && selectedMonth && selectedYear) {
        // Month View - Group by days
        const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
        const monthStart = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
        const monthEnd = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, daysInMonth, 23, 59, 59);
        
        // Get all fees for this month/year
        const { data: schoolFees } = await supabase
          .from('school_fees')
          .select('total_expected, total_collected')
          .eq('term_id', (await supabase.from('terms').select('id').eq('is_active', true).single()).data?.id);
        
        const { data: otherFees } = await supabase
          .from('other_fees')
          .select('fee_type, total_expected, collected')
          .eq('term_id', (await supabase.from('terms').select('id').eq('is_active', true).single()).data?.id);
        
        // Filter by fee type
        const filteredFees = filterFeesByType(schoolFees || [], otherFees || [], feeType);
        
        // Calculate totals
        totalExpected = (filteredFees.schoolFees?.reduce((sum, fee) => sum + (fee.total_expected || 0), 0) || 0) + 
                      (filteredFees.otherFees?.reduce((sum, fee) => sum + (fee.total_expected || 0), 0) || 0);
        totalCollected = (filteredFees.schoolFees?.reduce((sum, fee) => sum + (fee.total_collected || 0), 0) || 0) + 
                       (filteredFees.otherFees?.reduce((sum, fee) => sum + (fee.collected || 0), 0) || 0);
        
        // Generate daily data with proper cumulative logic
        let cumulativeCollected = 0;
        for (let day = 1; day <= daysInMonth; day++) {
          const dayStart = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, day);
          const dayEnd = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, day, 23, 59, 59);
          
          const { data: dayInstallments } = await supabase
            .from('installments')
            .select('amount_paid')
            .gte('date_paid', dayStart.toISOString())
            .lte('date_paid', dayEnd.toISOString());
          
          const dayVolume = dayInstallments?.reduce((sum, installment) => sum + (installment.amount_paid || 0), 0) || 0;
          cumulativeCollected += dayVolume;
          const rate = totalExpected > 0 ? (cumulativeCollected / totalExpected) * 100 : 0;
          
          analyticsData.push({
            time_bucket: `Day ${day}`,
            rate: Math.round(rate),
            volume: dayVolume
          });
        }
      } else if (viewMode === 'year' && selectedYear) {
        // Year View - Group by months
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const yearStart = new Date(parseInt(selectedYear), 0, 1);
        const yearEnd = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59);
        
        // Get all fees for this year
        const { data: schoolFees } = await supabase
          .from('school_fees')
          .select('total_expected, total_collected');
        
        const { data: otherFees } = await supabase
          .from('other_fees')
          .select('fee_type, total_expected, collected');
        
        // Filter by fee type
        const filteredFees = filterFeesByType(schoolFees || [], otherFees || [], feeType);
        
        // Calculate totals
        totalExpected = (filteredFees.schoolFees?.reduce((sum, fee) => sum + (fee.total_expected || 0), 0) || 0) + 
                      (filteredFees.otherFees?.reduce((sum, fee) => sum + (fee.total_expected || 0), 0) || 0);
        totalCollected = (filteredFees.schoolFees?.reduce((sum, fee) => sum + (fee.total_collected || 0), 0) || 0) + 
                       (filteredFees.otherFees?.reduce((sum, fee) => sum + (fee.collected || 0), 0) || 0);
        
        // Generate monthly data with proper cumulative logic
        let cumulativeCollected = 0;
        for (let month = 0; month < 12; month++) {
          const monthStart = new Date(parseInt(selectedYear), month, 1);
          const monthEnd = new Date(parseInt(selectedYear), month + 1, 0, 23, 59, 59);
          
          const { data: monthInstallments } = await supabase
            .from('installments')
            .select('amount_paid')
            .gte('date_paid', monthStart.toISOString())
            .lte('date_paid', monthEnd.toISOString());
          
          const monthVolume = monthInstallments?.reduce((sum, installment) => sum + (installment.amount_paid || 0), 0) || 0;
          cumulativeCollected += monthVolume;
          const rate = totalExpected > 0 ? (cumulativeCollected / totalExpected) * 100 : 0;
          
          analyticsData.push({
            time_bucket: months[month],
            rate: Math.round(rate),
            volume: monthVolume
          });
        }
      }
      
      if (analyticsData.length > 0) {
        setAnalyticsData(analyticsData);
        
        // Calculate summary
        const highestVolumeItem = analyticsData.reduce((max, item) => 
          (item.volume || 0) > (max.volume || 0) ? item : max, analyticsData[0]);
        
        setSummary({
          totalExpected,
          totalCollected,
          currentRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
          outstanding: totalExpected - totalCollected,
          highestPeriod: highestVolumeItem?.time_bucket || ''
        });
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [viewMode, selectedTerm, selectedMonth, selectedYear, feeType]);

  // Render different time selectors based on view mode
  const renderTimeSelectors = () => {
    switch (viewMode) {
      case 'term':
        return (
          <div className="flex gap-2">
            <select 
              value={selectedTerm} 
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Select Term</option>
              {availableTerms.map(term => (
                <option key={term.id} value={term.id}>{term.name} ({term.year})</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        );
      case 'month':
        return (
          <div className="flex gap-2">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Select Month</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        );
      case 'year':
        return (
          <div className="flex gap-2">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-green-100 text-green-700 font-medium"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        );
    }
  };

  // Render the main chart
  const renderChart = () => {
    if (loading) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Loading analytics...</div>
        </div>
      );
    }

    if (analyticsData.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">No data available for selected filters</div>
        </div>
      );
    }

    const maxRate = 100; // Fixed scale 0-100%
    const maxVolume = Math.max(...analyticsData.map(d => d.volume || 0), 1);
    
    return (
      <div className="h-80 w-full">
        <div className="relative h-full w-full">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 25, 50, 75, 100].map((value) => (
              <div key={value} className="border-b border-gray-200" style={{ position: "absolute", width: "100%", top: `${100 - value}%` }} />
            ))}
          </div>
          
          {/* Chart */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
            {/* Volume bars */}
            {analyticsData.map((point, index) => {
              const x = (index / (analyticsData.length - 1)) * 760 + 20;
              const barWidth = 760 / analyticsData.length * 0.6;
              const barHeight = (point.volume / maxVolume) * 280;
              const y = 300 - barHeight;
              
              return (
                <rect
                  key={`bar-${index}`}
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="#e5e7eb"
                  opacity="0.6"
                />
              );
            })}
            
            {/* Collection rate line */}
            {analyticsData.map((point, index) => {
              const x = (index / (analyticsData.length - 1)) * 760 + 20;
              const y = 300 - (point.rate / maxRate) * 280;
              const prevX = index > 0 ? ((index - 1) / (analyticsData.length - 1)) * 760 + 20 : 20;
              const prevY = index > 0 ? 300 - (analyticsData[index - 1].rate / maxRate) * 280 : 300;
              
              return (
                <g key={index}>
                  {/* Line */}
                  {index > 0 && (
                    <line
                      x1={prevX}
                      y1={prevY}
                      x2={x}
                      y2={y}
                      stroke="#16a34a"
                      strokeWidth="3"
                    />
                  )}
                  {/* Point */}
                  <circle cx={x} cy={y} r="5" fill="#16a34a" />
                  {/* Rate label */}
                  <text
                    x={x}
                    y={y - 10}
                    textAnchor="middle"
                    className="text-xs font-medium"
                    fill="#16a34a"
                  >
                    {point.rate}%
                  </text>
                  {/* Time bucket label */}
                  <text
                    x={x}
                    y={315}
                    textAnchor="middle"
                    className="text-xs text-gray-600"
                  >
                    {point.time_bucket}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Collection Progress & Payment Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="mb-6 space-y-4">
          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('term')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'term' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Term View
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'year' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Year View
            </button>
          </div>

          {/* Time Selectors + Fee Type */}
          <div className="flex gap-4 items-center">
            {renderTimeSelectors()}
            
            {/* Fee Type Selector */}
            <select 
              value={feeType} 
              onChange={(e) => setFeeType(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Fees</option>
              <option value="tuition">Tuition</option>
              {availableFeeTypes.map(ft => (
                <option key={ft.type} value={ft.type}>
                  {ft.label} ({ft.count} students)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart */}
        <div className="mb-6">
          {renderChart()}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-sm mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Cumulative Collection Rate (%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-300 rounded"></div>
            <span className="text-gray-600">Payment Volume</span>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Expected</div>
            <div className="text-lg font-bold text-blue-600">ZMW {summary.totalExpected.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Collected</div>
            <div className="text-lg font-bold text-green-600">ZMW {summary.totalCollected.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Current Rate</div>
            <div className="text-lg font-bold text-purple-600">{summary.currentRate}%</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Outstanding</div>
            <div className="text-lg font-bold text-orange-600">ZMW {summary.outstanding.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Highest Period</div>
            <div className="text-lg font-bold text-indigo-600">{summary.highestPeriod}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({ 
    totalPupils: 0, 
    admittedPupils: 0,
    newPupils: 0,
    totalExpected: 0,
    totalCollected: 0, 
    totalOutstanding: 0,
    schoolFeesExpected: 0,
    schoolFeesCollected: 0,
    schoolFeesOutstanding: 0,
    otherFeesExpected: 0,
    otherFeesCollected: 0,
    otherFeesOutstanding: 0,
    totalDiscountAmount: 0,
    pupilsWithDiscounts: 0
  });
  const [gradeCounts, setGradeCounts] = useState<{ id: string; name: string; count: number }[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [otherFeesBreakdown, setOtherFeesBreakdown] = useState<any[]>([]);
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [paymentLimit, setPaymentLimit] = useState(10);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        // First test Supabase connection
        const { data, error: connError } = await supabase.from('grades').select('count').single();
        if (connError) {
          setConnectionStatus('error');
          throw new Error(`Database connection failed: ${connError.message}`);
        }
        setConnectionStatus('connected');

        // Load dashboard data
        const [s, counts, payments, otherFees] = await Promise.all([
          getAccurateDashboardStats().catch(err => {
            console.warn('Dashboard stats error:', err);
            return { 
              totalPupils: 0, 
              admittedPupils: 0, 
              newPupils: 0, 
              totalExpected: 0,
              totalCollected: 0, 
              totalOutstanding: 0,
              schoolFeesExpected: 0,
              schoolFeesCollected: 0,
              schoolFeesOutstanding: 0,
              otherFeesExpected: 0,
              otherFeesCollected: 0,
              otherFeesOutstanding: 0,
              totalDiscountAmount: 0,
              pupilsWithDiscounts: 0
            };
          }),
          getGradeCounts().catch(err => {
            console.warn('Grade counts error:', err);
            return [];
          }),
          supabase.from('installments')
            .select("*, pupils(full_name), school_fees(terms(name)), other_fees(fee_type)")
            .order("created_at", { ascending: false })
            .limit(10)
            .then(({ data, error }) => {
              if (error) throw error;
              return data || [];
            }),
          getOtherFeesBreakdown().catch(err => {
            console.warn('Other fees breakdown error:', err);
            return [];
          })
        ]);
        
        setStats(s);
        setGradeCounts(counts);
        setPaymentHistory(payments);
        setOtherFeesBreakdown(otherFees);
        setError(null);
      } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to load dashboard data';
        
        // Provide user-friendly error messages
        let userFriendlyMessage = 'Unable to load dashboard data. ';
        
        if (errorMessage.includes('connection')) {
          userFriendlyMessage += 'Please check your internet connection and try again.';
        } else if (errorMessage.includes('Database')) {
          userFriendlyMessage += 'Database service may be temporarily unavailable. Please try again in a few moments.';
        } else if (errorMessage.includes('timeout')) {
          userFriendlyMessage += 'Request timed out. Please try again.';
        } else {
          userFriendlyMessage += 'An unexpected error occurred. Please try refreshing the page.';
        }
        
        setError(userFriendlyMessage);
        setConnectionStatus('error');
      } finally {
        setLoading(false);
      }
    };
    load();

    // Set up real-time subscriptions for live updates
    const pupilsSubscription = supabase
      .channel('pupils-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pupils' }, () => {
        console.log('Pupils data changed, refreshing dashboard...');
        load();
      })
      .subscribe();

    const feesSubscription = supabase
      .channel('fees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'school_fees' }, () => {
        console.log('School fees data changed, refreshing dashboard...');
        load();
      })
      .subscribe();

    const installmentsSubscription = supabase
      .channel('installments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installments' }, () => {
        console.log('Installments data changed, refreshing dashboard...');
        load();
      })
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      pupilsSubscription.unsubscribe();
      feesSubscription.unsubscribe();
      installmentsSubscription.unsubscribe();
    };
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setConnectionStatus('checking');
    // Trigger reload
    window.location.reload();
  };

  const handleEditPayment = async () => {
    if (!selectedPayment) return;

    const oldAmount = selectedPayment.amount_paid_original || selectedPayment.amount_paid;
    const newAmount = selectedPayment.amount_paid;
    const oldDiscount = selectedPayment.discount_applied_original || 0;
    const newDiscount = selectedPayment.discount_applied || 0;

    // Calculate old and new effective amounts
    const oldEffective = oldAmount - (oldAmount * oldDiscount / 100);
    const newEffective = newAmount - (newAmount * newDiscount / 100);
    const adjustment = newEffective - oldEffective;

    try {
      // Update installment
      const { error: instError } = await supabase
        .from('installments')
        .update({
          amount_paid: newAmount,
          discount_applied: newDiscount,
          RCT_no: selectedPayment.RCT_no || null
        })
        .eq('id', selectedPayment.id);

      if (instError) throw instError;

      // Update fee record
      if (selectedPayment.school_fee_id) {
        const { data: fee } = await supabase.from('school_fees').select('total_collected, balance').eq('id', selectedPayment.school_fee_id).single();
        const newCollected = Number(fee.total_collected) + adjustment;
        const newBalance = Number(fee.balance) - adjustment;
        await supabase
          .from('school_fees')
          .update({
            total_collected: newCollected,
            balance: newBalance,
            paid_toggle: newBalance <= 0
          })
          .eq('id', selectedPayment.school_fee_id);

      } else if (selectedPayment.other_fee_id) {
        const { data: fee } = await supabase.from('other_fees').select('collected, balance').eq('id', selectedPayment.other_fee_id).single();
        const newCollected = Number(fee.collected) + adjustment;
        const newBalance = Number(fee.balance) - adjustment;
        await supabase
          .from('other_fees')
          .update({
            collected: newCollected,
            balance: newBalance,
            paid_toggle: newBalance <= 0
          })
          .eq('id', selectedPayment.other_fee_id);
      }

      setEditPaymentOpen(false);
      setSelectedPayment(null);
      // Reload payment history
      const { data: payments } = await supabase
        .from('installments')
        .select("*, pupils(full_name), school_fees(terms(name)), other_fees(fee_type)")
        .order("created_at", { ascending: false })
        .limit(10);
      setPaymentHistory(payments || []);
      toast({ title: "Payment updated successfully" });
    } catch (error: any) {
      toast({ title: "Error updating payment", description: error.message, variant: "destructive" });
    }
  };

  const discountCards = [
    { label: "Total Discount", value: `ZMW ${(stats.totalDiscountAmount || 0).toLocaleString()}`, color: "text-purple-500" },
    { label: "Pupils with Discounts", value: stats.pupilsWithDiscounts || 0, color: "text-blue-500" },
    { label: "Average Discount", value: `${stats.pupilsWithDiscounts > 0 ? (stats.totalDiscountAmount / stats.pupilsWithDiscounts).toFixed(2) : 0}%`, color: "text-green-500" },
  ];

  const summaryCards = [
    { label: "Total Pupils", value: stats.totalPupils || 0, icon: Users, color: "text-primary", detail: `${stats.admittedPupils || 0} admitted, ${stats.newPupils || 0} new` },
    { label: "Total Expected (All Fees)", value: `ZMW ${(stats.totalExpected || 0).toLocaleString()}`, icon: DollarSign, color: "text-blue-600", detail: "School + Other fees" },
    { label: "Total Collected (All Fees)", value: `ZMW ${(stats.totalCollected || 0).toLocaleString()}`, icon: DollarSign, color: "text-green-600", detail: "School + Other fees" },
    { label: "Total Outstanding (All Fees)", value: `ZMW ${(stats.totalOutstanding || 0).toLocaleString()}`, icon: AlertTriangle, color: "text-red-600", detail: "School + Other fees" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin mb-4" />
        <div className="text-center">
          <p>Loading dashboard data...</p>
          <p className="text-sm mt-2">Connecting to Supabase database</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center max-w-md">
          <Database className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Database Connection Error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title font-heading">Dashboard</h1>
            <p className="page-description">Overview of school operations</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Database className={`h-4 w-4 ${
              connectionStatus === 'connected' ? 'text-green-500' : 
              connectionStatus === 'error' ? 'text-red-500' : 'text-yellow-500'
            }`} />
            <span className="text-muted-foreground">
              {connectionStatus === 'connected' ? 'Connected to Supabase' : 
               connectionStatus === 'error' ? 'Connection Error' : 'Checking...'}
            </span>
          </div>
        </div>
      </div>

      {/* Simple Financial Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-heading font-semibold mb-4 text-primary">Financial Overview</h2>
        
        {/* Main Summary - What We Have vs What We Need */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-6 w-6 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-600">TOTAL PUPILS</span>
            </div>
            <div className="text-3xl font-bold text-emerald-700 mb-2">{stats.totalPupils}</div>
            <div className="text-sm text-emerald-600">Total Enrolled</div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">TOTAL COLLECTED</span>
            </div>
            <div className="text-3xl font-bold text-blue-700 mb-2">ZMW {(stats.totalCollected || 0).toLocaleString()}</div>
            <div className="text-sm text-blue-600">All Fees Collected</div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <span className="text-sm font-medium text-orange-600">TOTAL OUTSTANDING</span>
            </div>
            <div className="text-3xl font-bold text-orange-700 mb-2">ZMW {(stats.totalOutstanding || 0).toLocaleString()}</div>
            <div className="text-sm text-orange-600">All Unpaid Fees</div>
          </Card>
        </div>

        {/* Money Flow - Where Does It Come From and Go */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* School Fees - Tuition Money */}
          <Card className="p-6 border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-emerald-700">TUITION FEES</h3>
              <GraduationCap className="h-5 w-5 text-emerald-600" />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                <span className="text-sm font-medium text-emerald-700">Total Expected</span>
                <span className="font-bold text-emerald-700">ZMW {(stats.schoolFeesExpected || 0).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-700">Collected</span>
                <span className="font-bold text-green-700">ZMW {(stats.schoolFeesCollected || 0).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-orange-700">Outstanding</span>
                <span className="font-bold text-orange-700">ZMW {(stats.schoolFeesOutstanding || 0).toLocaleString()}</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-emerald-600">Collection Progress</span>
                <span className="font-medium text-emerald-700">
                  {stats.schoolFeesExpected > 0 ? Math.round((stats.schoolFeesCollected / stats.schoolFeesExpected) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={stats.schoolFeesExpected > 0 ? (stats.schoolFeesCollected / stats.schoolFeesExpected) * 100 : 0} 
                className="h-3 bg-emerald-100"
              />
            </div>
          </Card>

          {/* Other Fees - Extra Money */}
          <Card className="p-6 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-700">OTHER FEES</h3>
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-purple-700">
                  {otherFeesBreakdown.length > 0 
                    ? otherFeesBreakdown.map(fee => fee.fee_type).join(', ')
                    : 'Other fees'
                  }
                </span>
                <span className="font-bold text-purple-700">ZMW {(stats.otherFeesExpected || 0).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-teal-50 rounded-lg">
                <span className="text-sm font-medium text-teal-700">Collected</span>
                <span className="font-bold text-teal-700">ZMW {(stats.otherFeesCollected || 0).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-red-700">Outstanding</span>
                <span className="font-bold text-red-700">ZMW {(stats.otherFeesOutstanding || 0).toLocaleString()}</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-purple-600">Collection Progress</span>
                <span className="font-medium text-purple-700">
                  {stats.otherFeesExpected > 0 ? Math.round((stats.otherFeesCollected / stats.otherFeesExpected) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={stats.otherFeesExpected > 0 ? (stats.otherFeesCollected / stats.otherFeesExpected) * 100 : 0} 
                className="h-3 bg-purple-100"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Collection Analytics Section */}
      <div className="mb-8">
        <CollectionAnalytics />
      </div>

      {/* Discounts Section - Compact */}
      <div className="mb-8">
        <h2 className="text-xl font-heading font-semibold mb-4 text-primary">Discounts Analysis</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {discountCards.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Percent className="h-5 w-5 text-purple-600" />
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
              <div className="text-xl font-bold">{item.value}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment History Section - Enhanced */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold text-primary">Payment History</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLoadingPayments(true)}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by pupil name, RCT number, or fee type..."
              value={paymentSearch}
              onChange={(e) => setPaymentSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="all">All Payments</option>
              <option value="school_fee">School Fees</option>
              <option value="other_fee">Other Fees</option>
              <option value="with_discount">With Discount</option>
              <option value="without_discount">Without Discount</option>
            </select>
            <select
              value={paymentLimit}
              onChange={(e) => setPaymentLimit(Number(e.target.value))}
              className="px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="10">Last 10</option>
              <option value="25">Last 25</option>
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
            </select>
          </div>
        </div>

        {paymentHistory.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No payments recorded yet</p>
              <p className="text-sm">Payment records will appear here once payments are made</p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-medium">Pupil</TableHead>
                    <TableHead className="font-medium">Fee Type</TableHead>
                    <TableHead className="font-medium text-right">Amount</TableHead>
                    <TableHead className="font-medium text-right">Discount</TableHead>
                    <TableHead className="font-medium text-right">Effective</TableHead>
                    <TableHead className="font-medium">RCT #</TableHead>
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="font-medium text-center">Status</TableHead>
                    <TableHead className="font-medium text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory
                    .filter(payment => {
                      const matchesSearch = paymentSearch === "" || 
                        payment.pupils?.full_name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        payment.RCT_no?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        (payment.fee_type === 'school_fee' ? 'School Fee' : payment.other_fees?.fee_type || payment.fee_type).toLowerCase().includes(paymentSearch.toLowerCase());
                      
                      const matchesFilter = paymentFilter === "all" ||
                        (paymentFilter === "school_fee" && payment.fee_type === 'school_fee') ||
                        (paymentFilter === "other_fee" && payment.fee_type !== 'school_fee') ||
                        (paymentFilter === "with_discount" && payment.discount_applied > 0) ||
                        (paymentFilter === "without_discount" && payment.discount_applied === 0);
                      
                      return matchesSearch && matchesFilter;
                    })
                    .slice(0, paymentLimit)
                    .map((inst) => {
                      const effectiveAmount = Number(inst.amount_paid) - (Number(inst.amount_paid) * inst.discount_applied / 100);
                      return (
                        <TableRow key={inst.id} className="hover:bg-muted/25 transition-colors">
                          <TableCell>
                            <div>
                              <div className="font-medium">{inst.pupils?.full_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {inst.fee_type === 'school_fee' ? 'School Fee' : inst.other_fees?.fee_type || inst.fee_type}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={inst.fee_type === 'school_fee' ? 'default' : 'secondary'}>
                              {inst.fee_type === 'school_fee' ? 'School' : 'Other'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ZMW {Number(inst.amount_paid).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {inst.discount_applied > 0 ? (
                              <Badge variant="outline" className="text-purple-600 border-purple-600">
                                {inst.discount_applied}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ZMW {effectiveAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {inst.RCT_no ? (
                              <Badge variant="outline" className="font-mono text-xs">
                                {inst.RCT_no}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No RCT</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{new Date(inst.created_at).toLocaleDateString()}</div>
                              <div className="text-muted-foreground text-xs">
                                {new Date(inst.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={inst.discount_applied > 0 ? 'default' : 'secondary'}>
                              {inst.discount_applied > 0 ? 'Discounted' : 'Full'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => { 
                                setSelectedPayment({
                                  ...inst, 
                                  amount_paid_original: inst.amount_paid, 
                                  discount_applied_original: inst.discount_applied
                                }); 
                                setEditPaymentOpen(true); 
                              }}
                              className="h-8 px-3"
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            {paymentHistory.length > paymentLimit && (
              <div className="border-t bg-muted/25 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min(paymentLimit, paymentHistory.length)} of {paymentHistory.length} payments
                </p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Pupils per Grade Section */}
      <div className="stat-card">
        <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Pupils per Grade
        </h2>
        {gradeCounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No grades created yet or no data available.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gradeCounts.map((g) => (
              <div 
                key={g.name} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/pupils?grade=${g.id}`)}
                title={`Click to view ${g.name} pupils`}
              >
                <span className="font-medium text-sm">{g.name}</span>
                <span className="text-lg font-bold text-primary">{g.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Payment Modal */}
      <Dialog open={editPaymentOpen} onOpenChange={setEditPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Pupil: {selectedPayment?.pupils?.full_name} | Fee: {selectedPayment?.fee_type === 'school_fee' ? 'School Fee' : selectedPayment?.other_fees?.fee_type}
            </p>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Original Amount:</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ZMW {Number(selectedPayment.amount_paid).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Date: {new Date(selectedPayment.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-amount">Payment Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={selectedPayment.amount_paid || ''}
                  onChange={(e) => setSelectedPayment({ ...selectedPayment, amount_paid: Number(e.target.value) })}
                  min="0"
                  step="0.01"
                  placeholder="Enter payment amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-rct">RCT Number (Receipt)</Label>
                <Input
                  id="edit-rct"
                  value={selectedPayment.RCT_no || ''}
                  onChange={(e) => setSelectedPayment({ ...selectedPayment, RCT_no: e.target.value })}
                  placeholder="Enter RCT number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-discount">Discount Percentage (%)</Label>
                <Input
                  id="edit-discount"
                  type="number"
                  value={selectedPayment.discount_applied || 0}
                  onChange={(e) => setSelectedPayment({ ...selectedPayment, discount_applied: Number(e.target.value) })}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 10.00"
                />
                {selectedPayment.discount_applied > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Effective amount: ZMW {(Number(selectedPayment.amount_paid) - (Number(selectedPayment.amount_paid) * selectedPayment.discount_applied / 100)).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditPaymentOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditPayment}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
