import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Search,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const digitalPrescriptions = [
  {
    id: 1,
    rxId: 'E-RX-2024-001',
    patient: 'Khual Smith',
    medication: 'Atorvastatin 10mg',
    quantity: 30,
    prescriber: 'Dr. Johnson',
    receivedDate: '2024-11-18',
    status: 'Pending Review',
    priority: 'Normal',
  },
  {
    id: 2,
    rxId: 'E-RX-2024-002',
    patient: 'Sarah Johnson',
    medication: 'Lisinopril 20mg',
    quantity: 90,
    prescriber: 'Dr. Smith',
    receivedDate: '2024-11-18',
    status: 'Approved',
    priority: 'Normal',
  },
  {
    id: 3,
    rxId: 'E-RX-2024-003',
    patient: 'Mike Williams',
    medication: 'Metformin 500mg',
    quantity: 60,
    prescriber: 'Dr. Brown',
    receivedDate: '2024-11-17',
    status: 'Pending Review',
    priority: 'Urgent',
  },
  {
    id: 4,
    rxId: 'E-RX-2024-004',
    patient: 'John Doe',
    medication: 'Omeprazole 20mg',
    quantity: 30,
    prescriber: 'Dr. Williams',
    receivedDate: '2024-11-17',
    status: 'Approved',
    priority: 'Normal',
  },
  {
    id: 5,
    rxId: 'E-RX-2024-005',
    patient: 'Emily Davis',
    medication: 'Amlodipine 5mg',
    quantity: 30,
    prescriber: 'Dr. Taylor',
    receivedDate: '2024-11-16',
    status: 'Pending Review',
    priority: 'Normal',
  },
  {
    id: 6,
    rxId: 'E-RX-2024-006',
    patient: 'James Miller',
    medication: 'Sertraline 50mg',
    quantity: 90,
    prescriber: 'Dr. Patel',
    receivedDate: '2024-11-16',
    status: 'Approved',
    priority: 'Normal',
  },
  {
    id: 7,
    rxId: 'E-RX-2024-007',
    patient: 'Anna Lee',
    medication: 'Levothyroxine 75mcg',
    quantity: 30,
    prescriber: 'Dr. Nguyen',
    receivedDate: '2024-11-15',
    status: 'Pending Review',
    priority: 'Urgent',
  },
  {
    id: 8,
    rxId: 'E-RX-2024-008',
    patient: 'David Johnson',
    medication: 'Losartan 50mg',
    quantity: 60,
    prescriber: 'Dr. Garcia',
    receivedDate: '2024-11-15',
    status: 'Approved',
    priority: 'Normal',
  },
];

export default function DigitalPrescriptions() {
  const [search, setSearch] = useState('');

  const pendingCount = digitalPrescriptions.filter(
    (p) => p.status === 'Pending Review',
  ).length;
  const approvedCount = digitalPrescriptions.filter(
    (p) => p.status === 'Approved',
  ).length;

  const filtered = digitalPrescriptions.filter((rx) => {
    const q = search.toLowerCase();
    return (
      rx.rxId.toLowerCase().includes(q) ||
      rx.patient.toLowerCase().includes(q) ||
      rx.prescriber.toLowerCase().includes(q) ||
      rx.medication.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-3xl mb-2">Digital Prescriptions</h1>
        <p className="text-muted-foreground">
          Review electronically submitted prescriptions (simulation mode for this project)
        </p>
      </div>

      {/* Simulation banner */}
      <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-slate-900">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="size-4" />
            Simulation Mode – Example Electronic Prescriptions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>
            In a real deployment, this screen would receive prescriptions
            electronically from prescriber systems or e-prescribing networks.
          </p>
          <p>
            For this class project, we are showcasing the pharmacist workflow
            using sample data only. No external doctor system is connected.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total E-Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{digitalPrescriptions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Demo Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">8</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by Rx ID, patient name, medication, or prescriber..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-4">
        {filtered.map((rx) => (
          <Card key={rx.id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{rx.rxId}</h3>
                      {rx.status === 'Pending Review' ? (
                        <Badge variant="secondary" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                          <Clock className="size-3 mr-1" />
                          {rx.status}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-600 hover:bg-green-700 text-white">
                          <CheckCircle2 className="size-3 mr-1" />
                          {rx.status}
                        </Badge>
                      )}
                      {rx.priority === 'Urgent' && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Patient: {rx.patient}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Medication</p>
                    <p className="font-medium">{rx.medication}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-medium">{rx.quantity} tablets</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Prescriber</p>
                    <p className="font-medium">{rx.prescriber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Received</p>
                    <p className="font-medium">{rx.receivedDate}</p>
                  </div>
                </div>

                {/* Read-only note */}
                <p className="text-xs text-muted-foreground">
                  This prescription is shown for demonstration only. Actions
                  such as approval, rejection, or queueing would be performed
                  here in a full production system.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No prescriptions match your search.
          </p>
        )}
      </div>
    </div>
  );
}