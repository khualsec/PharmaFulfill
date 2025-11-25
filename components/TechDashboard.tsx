import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import DashboardLayout, {
  Home,
  CheckCircle2,
  Package,
} from './DashboardLayout';
import { Clock, XCircle, FileCheck, AlertCircle } from 'lucide-react';
import VerificationQueue from './VerificationQueue';
import TechInventoryCheck from './TechInventoryCheck';
import api from '../lib/api';

type PendingVerificationItem = {
  id: number;
  rxId: string;
  patient: string;
  medication: string;
  quantity: number | null;
  priority: string | null;
  timeInQueue: string;
  prescriber: string | null;
  insurance: string | null;
  status: string;
};

type SummaryResponse = {
  scriptsFilledToday: number;
  patientsServedToday: number;
  totalRevenueToday: number;
  avgWaitMinutesToday: number | null;
  topMedications: { name: string; count: number }[];
  insuranceBreakdown: { name: string; percentage: number; count: number }[];
};

export default function TechDashboard() {
  const [activePage, setActivePage] = useState('Dashboard');

  const [pendingItems, setPendingItems] = useState<PendingVerificationItem[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [verifiedToday, setVerifiedToday] = useState<number | null>(null);
  const [issuesFound, setIssuesFound] = useState<number | null>(null);
  const [avgVerificationMinutes, setAvgVerificationMinutes] = useState<number | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        setPendingLoading(true);
        const res = await api.get<{ items: PendingVerificationItem[] }>(
          '/api/pharmacist/pending-verification',
          { silent: true }
        );
        if (res.ok && res.data && Array.isArray(res.data.items)) {
          setPendingItems(res.data.items);
        } else {
          setPendingItems([]);
        }
      } catch {
        setPendingItems([]);
      } finally {
        setPendingLoading(false);
      }
    };

    const fetchSummary = async () => {
      try {
        setSummaryLoading(true);
        const res = await api.get<SummaryResponse>(
          '/api/pharmacist/reports/summary',
          { silent: true }
        );
        if (res.ok && res.data) {
          setVerifiedToday(res.data.scriptsFilledToday);
          setAvgVerificationMinutes(res.data.avgWaitMinutesToday);
          // For now, we do not have a real "issues" metric, so keep it as 0 or null.
          setIssuesFound(0);
        } else {
          setVerifiedToday(null);
          setAvgVerificationMinutes(null);
          setIssuesFound(null);
        }
      } catch {
        setVerifiedToday(null);
        setAvgVerificationMinutes(null);
        setIssuesFound(null);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchPending();
    fetchSummary();
  }, []);

  const menuGroups = [
    {
      label: 'Main',
      items: [
        { title: 'Dashboard', icon: Home, onClick: () => setActivePage('Dashboard') },
        { title: 'Verification Queue', icon: CheckCircle2, onClick: () => setActivePage('Verification Queue') },
      ],
    },
    {
      label: 'Other',
      items: [
        { title: 'Inventory Check', icon: Package, onClick: () => setActivePage('Inventory Check') },
      ],
    },
  ];

  const renderContent = () => {
    switch (activePage) {
      case 'Verification Queue':
        return <VerificationQueue />;
      case 'Inventory Check':
        return <TechInventoryCheck />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Technician Dashboard</h1>
        <p className="text-muted-foreground">
          Verify prescriptions and ensure quality control
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {pendingLoading ? '…' : pendingItems.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Verified Today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-600">
              {summaryLoading ? '…' : verifiedToday ?? '—'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Issues Found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-destructive">
              {summaryLoading ? '…' : issuesFound ?? '—'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg. Verification Time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {summaryLoading
                ? '…'
                : avgVerificationMinutes != null
                ? `${avgVerificationMinutes}m`
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="size-5" />
            Verification Queue
          </CardTitle>
          <CardDescription>
            Prescriptions filled by pharmacists awaiting final verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLoading && (
            <p className="text-sm text-muted-foreground">
              Loading pending verification queue…
            </p>
          )}

          {!pendingLoading && pendingItems.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No prescriptions pending verification.
            </p>
          )}

          {!pendingLoading && pendingItems.length > 0 && (
            <div className="space-y-4">
              {pendingItems.slice(0, 3).map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{item.rxId}</h3>
                        <Badge>Ready for Review</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Patient: {item.patient}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="size-4" />
                      {item.timeInQueue}
                    </span>
                  </div>

                  <div className="mb-3 space-y-1">
                    <p className="font-medium">{item.medication}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantity:{' '}
                      {item.quantity != null ? `${item.quantity} capsules` : '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Prescriber: {item.prescriber || '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Insurance: {item.insurance || '—'}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded p-3 mb-3">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="size-4" />
                      Verification Checklist:
                    </p>
                    <ul className="text-sm space-y-1 ml-6">
                      <li>Correct medication selected</li>
                      <li>Accurate quantity dispensed</li>
                      <li>Proper labeling applied</li>
                      <li>Patient instructions included</li>
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setActivePage('Verification Queue')}
                    >
                      <CheckCircle2 className="size-4 mr-2" />
                      Go to Full Queue
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActivePage('Verification Queue')}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  return (
    <DashboardLayout menuGroups={menuGroups} title="Technician Portal">
      {renderContent()}
    </DashboardLayout>
  );
}