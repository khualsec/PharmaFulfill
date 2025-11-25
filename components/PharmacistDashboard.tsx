import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card';
import { Button } from './ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from './ui/tabs';
import DashboardLayout, {
  Home,
  FileText,
  Package,
  Users,
  BarChart3
} from './DashboardLayout';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Package as PackageIcon
} from 'lucide-react';
import PrescriptionQueue from './PrescriptionQueue';
import PatientRecords from './PatientRecords';
import PharmacistInventory from './PharmacistInventory';
import DigitalPrescriptions from './DigitalPrescriptions';
import PharmacistReports from './PharmacistReports';
import NewPrescriptionEntry from './NewPrescriptionEntry';
import PrescriptionDetails from './PrescriptionDetails';
import PatientPrescriptionHistory from './PatientPrescriptionHistory';
import PatientDetailView from './PatientDetailView';
import api from '../lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type ActivePage =
  | 'Dashboard'
  | 'New Prescription'
  | 'Prescription Queue'
  | 'Patient Records'
  | 'Inventory'
  | 'Digital Prescriptions'
  | 'Reports';

interface DashboardQueueItem {
  id: number;
  rxId: string;
  patient: string;
  medication: string;
  quantity: number | null;
  priority: string;
  timeInQueue: string;
  prescriber?: string | null;
  insurance?: string | null;
  status: string; // "Pending" | "In Progress" | etc.
}

interface QueueResponse {
  items: DashboardQueueItem[];
}

// NEW: inventory + reports types
interface InventoryItem {
  storeId: number;
  drugId: number;
  name: string;
  ndc: string;
  storeName: string;
  stockQty: number;
  expiresOn: string | null;
}

interface ReportsSummary {
  scriptsFilledToday: number;
  patientsServedToday: number;
  totalRevenueToday: number;
  avgWaitMinutesToday: number | null;
  topMedications: { name: string; count: number }[];
  insuranceBreakdown: { name: string; percentage: number; count: number }[];
}

const LOW_STOCK_THRESHOLD = 50;

export default function PharmacistDashboard() {
  const [activePage, setActivePage] = useState<ActivePage>('Dashboard');
  const [selectedRxId, setSelectedRxId] = useState<number | null>(null);

  // Used to trigger queue re-fetches (both dashboard + queue page)
  const [queueRefreshKey, setQueueRefreshKey] = useState(0);

  // Data for dashboard "Active Queue" tab & stats
  const [dashboardQueue, setDashboardQueue] = useState<DashboardQueueItem[]>([]);

  // Data for "Pending Verification" tab
  const [pendingVerification, setPendingVerification] = useState<DashboardQueueItem[]>([]);

  // NEW: inventory + reports summary for dashboard
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // For prescription history view (inside Patient Records)
  const [historyPatientId, setHistoryPatientId] = useState<number | null>(null);
  const [historyPatientName, setHistoryPatientName] = useState<string | null>(null);

  // For patient detail view (View Full Record)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);

  const navigate = useNavigate();

  // Load queue + pending verification data whenever refreshKey changes
  useEffect(() => {
    // Active queue (Pending / In Progress)
    api.get<QueueResponse>('/api/pharmacist/queue', { silent: true }).then((res) => {
      if (res.ok && res.data && Array.isArray(res.data.items)) {
        setDashboardQueue(res.data.items);
      } else {
        setDashboardQueue([]);
      }
    });

    // Prescriptions with Status = 'Pending Verification'
    api
      .get<QueueResponse>('/api/pharmacist/pending-verification', { silent: true })
      .then((res) => {
        if (res.ok && res.data && Array.isArray(res.data.items)) {
          setPendingVerification(res.data.items);
        } else {
          setPendingVerification([]);
        }
      })
      .catch(() => {
        setPendingVerification([]);
      });

    // NEW: inventory for low-stock + quick inventory
    setLoadingInventory(true);
    api
      .get<InventoryItem[]>('/api/inventory', { silent: true })
      .then((res) => {
        if (res.ok && res.data && Array.isArray(res.data)) {
          setInventory(res.data);
        } else {
          setInventory([]);
        }
      })
      .catch(() => {
        setInventory([]);
      })
      .finally(() => {
        setLoadingInventory(false);
      });

    // NEW: reports summary for "Completed Today"
    api
      .get<ReportsSummary>('/api/pharmacist/reports/summary', { silent: true })
      .then((res) => {
        if (res.ok && res.data) {
          setSummary(res.data);
        } else {
          setSummary(null);
        }
      })
      .catch(() => {
        setSummary(null);
      });
  }, [queueRefreshKey]);

  const totalInQueue = dashboardQueue.length;

  const urgentCount = useMemo(
    () =>
      dashboardQueue.filter(
        (q) => q.priority?.toLowerCase() === 'urgent'
      ).length,
    [dashboardQueue]
  );

  // NEW: completed today + low stock metrics
  const completedToday = summary?.scriptsFilledToday ?? 0;

  const lowStockCount = useMemo(
    () => inventory.filter((item) => item.stockQty < LOW_STOCK_THRESHOLD).length,
    [inventory]
  );

  const lowStockItems = useMemo(
    () => inventory.filter((item) => item.stockQty < LOW_STOCK_THRESHOLD),
    [inventory]
  );

  const menuGroups = [
    {
      label: 'Main',
      items: [
        {
          title: 'Dashboard',
          icon: Home,
          onClick: () => {
            setActivePage('Dashboard');
            setSelectedRxId(null);
            setHistoryPatientId(null);
            setHistoryPatientName(null);
            setSelectedPatientId(null);
            setSelectedPatientName(null);
          }
        },
        {
          title: 'New Prescription',
          icon: PlusCircle,
          onClick: () => {
            setActivePage('New Prescription');
            setSelectedRxId(null);
            setHistoryPatientId(null);
            setHistoryPatientName(null);
            setSelectedPatientId(null);
            setSelectedPatientName(null);
          }
        },
        {
          title: 'Prescription Queue',
          icon: Clock,
          onClick: () => {
            setActivePage('Prescription Queue');
            setSelectedRxId(null);
            setHistoryPatientId(null);
            setHistoryPatientName(null);
            setSelectedPatientId(null);
            setSelectedPatientName(null);
          }
        },
        {
          title: 'Patient Records',
          icon: Users,
          onClick: () => {
            setActivePage('Patient Records');
            setSelectedRxId(null);
            // keep whichever patient/history view is open
          }
        }
      ]
    },
    {
      label: 'Management',
      items: [
        {
          title: 'Inventory',
          icon: Package,
          onClick: () => {
            setActivePage('Inventory');
            setSelectedRxId(null);
            setHistoryPatientId(null);
            setHistoryPatientName(null);
            setSelectedPatientId(null);
            setSelectedPatientName(null);
          }
        },
        {
          title: 'Digital Prescriptions',
          icon: FileText,
          onClick: () => {
            setActivePage('Digital Prescriptions');
            setSelectedRxId(null);
            setHistoryPatientId(null);
            setHistoryPatientName(null);
            setSelectedPatientId(null);
            setSelectedPatientName(null);
          }
        },
        {
          title: 'Reports',
          icon: BarChart3,
          onClick: () => {
            setActivePage('Reports');
            setSelectedRxId(null);
            setHistoryPatientId(null);
            setHistoryPatientName(null);
            setSelectedPatientId(null);
            setSelectedPatientName(null);
          }
        }
      ]
    }
  ];

  const handleViewDetails = (id: number) => {
    setSelectedRxId(id);
    setActivePage('Prescription Queue');
  };

  const handleStartFilling = (id: number) => {
    // TODO: replace with real logged-in pharmacist ID once auth wiring is complete
    const staffId = 1;

    api
      .post(`/api/pharmacist/prescriptions/${id}/start`, { staffId })
      .then((res) => {
        if (res.ok) {
          toast('Filling started', {
            description: `Prescription RX-${id} is now in progress.`
          });
          // Trigger queue re-fetch (dashboard + PrescriptionQueue + summary)
          setQueueRefreshKey((prev) => prev + 1);
          // Navigate to the pharmacist filling screen for this Rx
          navigate(`/dashboard/pharmacist/fill/${id}`);
        } else {
          toast('Failed to start filling', {
            description: (res as any).error || 'Please try again.'
          });
        }
      })
      .catch(() => {
        toast('Network error', {
          description: 'Unable to start filling. Please try again.'
        });
      });
  };

  // View full record from PatientRecords
  const handleViewPatient = (id: number, name: string) => {
    setSelectedPatientId(id);
    setSelectedPatientName(name);
    setHistoryPatientId(null);
    setHistoryPatientName(null);
    setActivePage('Patient Records');
  };

  // View Rx history from PatientRecords
  const handleViewPrescriptionHistory = (id: number, name: string) => {
    setHistoryPatientId(id);
    setHistoryPatientName(name);
    setSelectedPatientId(null);
    setSelectedPatientName(null);
    setActivePage('Patient Records');
  };

  const renderDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Pharmacist Dashboard</h1>
        <p className="text-muted-foreground">
          Process prescriptions and manage pharmacy operations
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Prescriptions in Queue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{totalInQueue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Urgent Priority</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-destructive">{urgentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed Today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {summary ? completedToday : '–'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Low Stock Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-destructive">{lowStockCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="queue">Prescription Queue</TabsTrigger>
          <TabsTrigger value="verification">Pending Verification</TabsTrigger>
          <TabsTrigger value="inventory">Quick Inventory</TabsTrigger>
        </TabsList>

        {/* Active Queue tab (using real data) */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5" />
                Active Queue
              </CardTitle>
              <CardDescription>
                Prescriptions waiting to be filled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardQueue.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{item.rxId}</h3>
                          <span>
                            <span className="sr-only">Priority</span>
                            <span>
                              <Button
                                variant={
                                  item.priority.toLowerCase() === 'urgent'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                size="sm"
                                className="pointer-events-none cursor-default"
                              >
                                {item.priority}
                              </Button>
                            </span>
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Patient: {item.patient}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Prescriber: {item.prescriber || '—'}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="size-4" />
                        {item.timeInQueue}
                      </span>
                    </div>
                    <div className="mb-3">
                      <p className="font-medium">{item.medication}</p>
                      <p className="text-sm text-muted-foreground">
                        Quantity:{' '}
                        {item.quantity != null ? `${item.quantity} units` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Insurance: {item.insurance || '—'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleStartFilling(item.id)}
                      >
                        <PackageIcon className="size-4 mr-2" />
                        {item.status === 'In Progress'
                          ? 'Resume Filling'
                          : 'Start Filling'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(item.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
                {dashboardQueue.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No prescriptions in the queue.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Verification tab (now wired to backend) */}
        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5" />
                Awaiting Tech Verification
              </CardTitle>
              <CardDescription>
                Filled prescriptions pending final verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingVerification.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="size-12 mx-auto mb-4 opacity-50" />
                  <p>No prescriptions awaiting verification</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingVerification.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{item.rxId}</h3>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="pointer-events-none cursor-default"
                            >
                              Pending Verification
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Patient: {item.patient}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Prescriber: {item.prescriber || '—'}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="size-4" />
                          {item.timeInQueue}
                        </span>
                      </div>
                      <div className="mb-3">
                        <p className="font-medium">{item.medication}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity:{' '}
                          {item.quantity != null ? `${item.quantity} units` : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Insurance: {item.insurance || '—'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(item.id)}
                        >
                          Review Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick inventory – NOW USING REAL DATA */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>
                Medications that need reordering
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInventory && (
                <p className="text-sm text-muted-foreground">
                  Loading inventory…
                </p>
              )}

              {!loadingInventory && lowStockItems.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No low stock items at the moment.
                </p>
              )}

              {!loadingInventory && lowStockItems.length > 0 && (
                <div className="space-y-3">
                  {lowStockItems.slice(0, 5).map((item) => (
                    <div
                      key={`${item.storeId}-${item.drugId}`}
                      className="border rounded-lg p-3 border-destructive/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            NDC: {item.ndc} · {item.storeName}
                          </p>
                        </div>
                        <Button variant="destructive" size="sm">
                          {item.stockQty} units left
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );

  const renderContent = () => {
    switch (activePage) {
      case 'Prescription Queue':
        if (selectedRxId != null) {
          return (
            <PrescriptionDetails
              prescriptionId={selectedRxId}
              onBack={() => setSelectedRxId(null)}
            />
          );
        }
        return (
          <PrescriptionQueue
            onViewDetails={handleViewDetails}
            onStartFilling={handleStartFilling}
            refreshKey={queueRefreshKey}
          />
        );

      case 'Patient Records':
        if (selectedPatientId != null) {
          return (
            <PatientDetailView
              patientId={selectedPatientId}
              patientName={selectedPatientName ?? undefined}
              onBack={() => {
                setSelectedPatientId(null);
                setSelectedPatientName(null);
              }}
            />
          );
        }

        if (historyPatientId != null) {
          return (
            <PatientPrescriptionHistory
              patientId={historyPatientId}
              patientName={historyPatientName ?? undefined}
              onBack={() => {
                setHistoryPatientId(null);
                setHistoryPatientName(null);
              }}
            />
          );
        }

        return (
          <PatientRecords
            onViewPatient={handleViewPatient}
            onViewPrescriptionHistory={handleViewPrescriptionHistory}
          />
        );

      case 'Inventory':
        return <PharmacistInventory />;

      case 'Digital Prescriptions':
        return <DigitalPrescriptions />;

      case 'Reports':
        return <PharmacistReports />;

      case 'New Prescription':
        return (
          <NewPrescriptionEntry
            onCreated={() => {
              // bump the refresh key so both dashboard + queue + summary re-fetch
              setQueueRefreshKey((prev) => prev + 1);
            }}
          />
        );

      case 'Dashboard':
      default:
        return renderDashboard();
    }
  };

  return (
    <DashboardLayout menuGroups={menuGroups} title="Pharmacist Portal">
      {renderContent()}
    </DashboardLayout>
  );
}