import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Search, User, FileText, Phone, Mail } from 'lucide-react';
import api from '../lib/api';

interface PatientRecordsProps {
  onViewPatient: (id: number, name: string) => void;
  onViewPrescriptionHistory: (id: number, name: string) => void;
}

interface BackendPatient {
  patientId: number;
  firstName: string;
  lastName: string;
  email: string;
  dob: string | null;
  phone?: string | null;
  insuranceProvider?: string | null;
}

interface PatientRecord {
  id: number;
  name: string;
  dob: string;
  phone: string;
  email: string;
  insurance: string;
  allergies: string;
  lastVisit: string;
  activePrescriptions: number;
}

export default function PatientRecords({
  onViewPatient,
  onViewPrescriptionHistory
}: PatientRecordsProps) {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from backend: GET /api/patients
  useEffect(() => {
    setLoading(true);
    setError(null);

    api
      .get<any>('/api/patients', { silent: true })
      .then((res) => {
        console.log('PATIENTS API raw:', res.data);

        if (!res.ok || !res.data) {
          setError((res as any).error || 'Failed to load patients.');
          return;
        }

        const raw = res.data as any;
        let list: BackendPatient[] = [];

        if (Array.isArray(raw)) {
          list = raw;
        } else if (Array.isArray(raw.items)) {
          list = raw.items;
        } else if (Array.isArray(raw.patients)) {
          list = raw.patients;
        } else {
          setError('Failed to load patients (unexpected response shape).');
          return;
        }

        const mapped: PatientRecord[] = list.map((p) => {
          const name = `${p.firstName} ${p.lastName}`;
          const dobDisplay = p.dob
            ? new Date(p.dob).toLocaleDateString()
            : '—';

          return {
            id: p.patientId,
            name,
            dob: dobDisplay,
            phone: p.phone || 'Not provided',
            email: p.email,
            insurance: p.insuranceProvider || 'Not recorded',
            allergies: 'Not recorded', // no allergies column in schema yet
            lastVisit: 'Not recorded', // wire later if you add a field
            activePrescriptions: 0 // wire later from /api/patient/prescriptions
          };
        });

        setPatients(mapped);
      })
      .catch(() => {
        setError('Network error while loading patients.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;

    const term = searchTerm.toLowerCase();
    return patients.filter((p) => {
      return (
        p.name.toLowerCase().includes(term) ||
        p.phone.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term)
      );
    });
  }, [patients, searchTerm]);

  const totalPatients = patients.length;

  // For now these are still mock stats (you can wire real stats later)
  const activeToday = 12;
  const newThisMonth = 23;
  const pendingRefills = 8;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Patient Records</h1>
        <p className="text-muted-foreground">
          View and manage patient information and prescription history
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{totalPatients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{activeToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{newThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pending Refills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{pendingRefills}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loading && (
        <p className="text-sm text-muted-foreground mb-4">
          Loading patients...
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive mb-4">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {filteredPatients.map((patient) => (
          <Card key={patient.id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{patient.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      DOB: {patient.dob}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {patient.activePrescriptions} Active Rx
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    <span>{patient.email}</span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Insurance</p>
                    <p className="font-medium">{patient.insurance}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Allergies</p>
                    <p className="font-medium">{patient.allergies}</p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Last visit: {patient.lastVisit}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => onViewPatient(patient.id, patient.name)}
                  >
                    <User className="size-4 mr-2" />
                    View Full Record
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onViewPrescriptionHistory(patient.id, patient.name)
                    }
                  >
                    <FileText className="size-4 mr-2" />
                    Prescription History
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && filteredPatients.length === 0 && !error && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No patients found.
          </p>
        )}
      </div>
    </div>
  );
}