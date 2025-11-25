import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart3, TrendingUp, DollarSign, Package, Users } from 'lucide-react';

type TopMed = { name: string; count: number };
type InsuranceItem = { name: string; percentage: number; count: number };

type ReportsSummary = {
  scriptsFilledToday: number;
  patientsServedToday: number;
  totalRevenueToday: number;
  avgWaitMinutesToday: number | null;
  topMedications: TopMed[];
  insuranceBreakdown: InsuranceItem[];
};

export default function PharmacistReports() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [topMeds, setTopMeds] = useState<TopMed[]>([]);
  const [insurance, setInsurance] = useState<InsuranceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // Summary (today)
        const summaryRes = await fetch('http://localhost:5000/api/pharmacist/reports/summary');
        if (summaryRes.ok) {
          const data: ReportsSummary = await summaryRes.json();
          setSummary(data);
          setTopMeds(data.topMedications || []);
          setInsurance(data.insuranceBreakdown || []);
        } else {
          setSummary(null);
          setTopMeds([]);
          setInsurance([]);
        }
      } catch (err) {
        console.error('Error loading reports summary', err);
        setSummary(null);
        setTopMeds([]);
        setInsurance([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Reports &amp; Analytics</h1>
        <p className="text-muted-foreground">
          View pharmacy performance metrics based on real data
        </p>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="size-4" />
              Scripts Filled (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {summary && !loading ? summary.scriptsFilledToday : '–'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="size-3 inline mr-1" />
              Live from Fill records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="size-4" />
              Revenue (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {summary && !loading ? `$${summary.totalRevenueToday.toFixed(2)}` : '–'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From Billing records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="size-4" />
              Patients Served (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {summary && !loading ? summary.patientsServedToday : '–'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Distinct patients with fills today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="size-4" />
              Avg. Wait Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {summary && !loading
                ? summary.avgWaitMinutesToday != null
                  ? `${summary.avgWaitMinutesToday}m`
                  : 'N/A'
                : '–'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From Rx issued date to fill
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top meds + Insurance breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Top Medications Dispensed (Last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading data…</p>
            ) : topMeds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No medication data available.</p>
            ) : (
              <div className="space-y-4">
                {topMeds.map((med, index) => {
                  const maxCount = topMeds[0]?.count || 1;
                  const widthPct = Math.min(100, (med.count / maxCount) * 100);
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{med.name}</p>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="font-semibold">{med.count}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insurance Breakdown (Last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading data…</p>
            ) : insurance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No insurance data available.</p>
            ) : (
              <div className="space-y-4">
                {insurance.map((ins, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{ins.name}</p>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${ins.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="font-semibold">{ins.percentage}%</p>
                      <p className="text-xs text-muted-foreground">
                        {ins.count} fills
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}