import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import DashboardLayout, { 
  FileText, 
  MapPin, 
  Bell, 
  User, 
  CreditCard 
} from './DashboardLayout';
import { 
  Clock, 
  Package,
  AlertCircle,
  LayoutDashboard
} from 'lucide-react';

import MyPrescriptions from './MyPrescriptions';
import FindPharmacy from './FindPharmacy';
import OrderHistory from './OrderHistory';
import PatientNotifications from './PatientNotifications';
import MyProfile from './MyProfile';
import PrescriptionDetails from './PrescriptionDetails';
import RequestRefill from './RequestRefill';

import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

// Backend prescription format
interface Prescription {
  rxId: number;
  drugName: string;
  strength: string | null;
  form: string | null;
  dosage: string | null;
  quantity: number | null;
  refillsTotal: number | null;
  refillsUsed: number | null;
  dateIssued: string | null;
  lastFillDate: string | null;
  status: string | null;
  instructions: string | null;
  prescriberName: string | null;
}

export default function PatientDashboard() {
  const { user } = useAuth();

  const [activePage, setActivePage] = useState('Dashboard');

  // Old state kept
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<number | null>(null);

  // NEW: Full selected prescription (needed for RequestRefill)
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  const menuGroups = [
    {
      items: [
        { title: 'Dashboard', icon: LayoutDashboard, onClick: () => setActivePage('Dashboard') },
        { title: 'My Prescriptions', icon: FileText, onClick: () => setActivePage('My Prescriptions') },
        { title: 'Find Pharmacy', icon: MapPin, onClick: () => setActivePage('Find Pharmacy') },
        { title: 'Order History', icon: CreditCard, onClick: () => setActivePage('Order History') },
        { title: 'Notifications', icon: Bell, onClick: () => setActivePage('Notifications') },
        { title: 'My Profile', icon: User, onClick: () => setActivePage('My Profile') },
      ]
    }
  ];

  // Load prescriptions from backend
  const loadPrescriptions = async () => {
    if (!user) return;

    setLoadingPrescriptions(true);

    const res = await api.get<{ prescriptions: Prescription[] }>(
      `/api/patient/prescriptions?patientId=${user.id}`,
      { silent: true }
    );

    if (res.ok && Array.isArray(res.data.prescriptions)) {
      setPrescriptions(res.data.prescriptions);
    }

    setLoadingPrescriptions(false);
  };

  useEffect(() => {
    if (!user) return;
    loadPrescriptions();
  }, [user]);

  // View Details
  const handleViewDetails = (id: number) => {
    const found = prescriptions.find((p) => p.rxId === id);
    if (found) setSelectedPrescription(found);

    setSelectedPrescriptionId(id);
    setActivePage('Prescription Details');
  };

  // Request Refill
  const handleRequestRefill = (id: number) => {
    const found = prescriptions.find((p) => p.rxId === id);
    if (found) setSelectedPrescription(found);

    setSelectedPrescriptionId(id);
    setActivePage('Request Refill');
  };

  const handleBackToPrescriptions = () => setActivePage('My Prescriptions');

  // Dashboard metrics
  const activeCount = prescriptions.length;

  const refillsAvailable = prescriptions.reduce((sum, rx) => {
    const total = rx.refillsTotal ?? 0;
    const used = rx.refillsUsed ?? 0;
    return sum + Math.max(total - used, 0);
  }, 0);

  const pendingOrders = prescriptions.filter(
    (rx) => rx.status === 'Pending' || rx.status === 'PendingRenewal'
  ).length;

  const readyForPickup = prescriptions.filter((rx) => rx.status === 'Ready').length;

  // Map backend prescriptions into card format
  const cardPrescriptions = prescriptions.map((rx) => ({
    id: rx.rxId,
    medication: `${rx.drugName} ${rx.strength ?? ''}`.trim(),
    prescriber: rx.prescriberName ?? '',
    status: rx.status ?? 'Pending',
    refills: Math.max((rx.refillsTotal ?? 0) - (rx.refillsUsed ?? 0), 0),
    lastFilled: rx.lastFillDate ? rx.lastFillDate.slice(0, 10) : '—',
  }));

  const renderContent = () => {
    switch (activePage) {
      case 'My Prescriptions':
        return (
          <MyPrescriptions
            prescriptions={prescriptions}
            loading={loadingPrescriptions}
            reload={loadPrescriptions}
            onViewDetails={handleViewDetails}
            onRequestRefill={handleRequestRefill}
          />
        );

      case 'Find Pharmacy':
        return <FindPharmacy />;

      case 'Order History':
        return <OrderHistory />;

      case 'Notifications':
        return <PatientNotifications />;

      case 'My Profile':
        return <MyProfile />;

      case 'Prescription Details':
        return (
          <PrescriptionDetails
            prescriptionId={selectedPrescriptionId!}
            onBack={handleBackToPrescriptions}
          />
        );

      case 'Request Refill':
        return (
          <RequestRefill
            prescription={selectedPrescription!}
            onBack={handleBackToPrescriptions}
          />
        );

      default:
        return renderDashboard();
    }
  };

  // Original dashboard UI unchanged
  const renderDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Patient Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your prescriptions and view your medication history
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Prescriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Refills Available</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{refillsAvailable}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ready for Pickup</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{readyForPickup}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                My Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cardPrescriptions.map((rx) => (
                  <div key={rx.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{rx.medication}</h3>
                        <p className="text-sm text-muted-foreground">
                          Prescribed by {rx.prescriber}
                        </p>
                      </div>

                      <Badge
                        variant={rx.status === 'Ready' ? 'default' : 'secondary'}
                        className={
                          rx.status === 'Ready'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-yellow-600 hover:bg-yellow-700'
                        }
                      >
                        {rx.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="size-4" />
                        {rx.refills} refills left
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="size-4" />
                        Last filled: {rx.lastFilled}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={rx.status !== 'Ready'}
                        onClick={() => handleRequestRefill(rx.id)}
                      >
                        Request Refill
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(rx.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5" />
                Nearest Pharmacy
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold">PharmaFulfill Downtown</p>
                <p className="text-sm text-muted-foreground">
                  123 Main St, Nashville, TN 37201
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Distance: 2.3 miles
                </p>
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => setActivePage('Find Pharmacy')}
              >
                View All Locations
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="size-5" />
                Important Notices
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="border-l-2 border-primary pl-3">
                  <p className="font-semibold">Prescription Ready</p>
                  <p className="text-muted-foreground">
                    Your Atorvastatin prescription is ready for pickup
                  </p>
                </div>

                <div className="border-l-2 border-muted pl-3">
                  <p className="font-semibold">Refill Reminder</p>
                  <p className="text-muted-foreground">
                    Lisinopril refill due in 5 days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );

  return (
    <DashboardLayout menuGroups={menuGroups} title="Patient Portal" sidebarWidth="20rem">
      {renderContent()}
    </DashboardLayout>
  );
}