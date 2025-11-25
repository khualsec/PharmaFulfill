import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import {
  ArrowLeft,
  User,
  Pill,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

interface PrescriptionDetailsProps {
  prescriptionId: number;
  onBack: () => void;
}

interface PatientInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  dob: string | null;
  phone: string | null;
  address: string | null;
  insuranceId: number | null;
}

interface DrugInfo {
  drugId: number;
  name: string;
  strength: string | null;
  form: string | null;
  ndc: string | null;
}

interface PrescriberInfo {
  prescriberId: number;
  name: string;
  licenseNo: string | null;
  specialty: string | null;
}

interface FillHistoryItem {
  fillId: number;
  dateFilled: string | null;
  qtyDispensed: number | null;
  stage: string | null;
}

interface PrescriptionDetailsData {
  rxId: number;
  status: string;
  priority: string | null;
  entryMethod: string | null;
  daysSupply: number | null;
  dateIssued: string | null;
  lastFillDate: string | null;
  refillsTotal: number | null;
  refillsUsed: number | null;
  dosage: string | null;
  instructions: string;
  quantity: number | null;
  patient: PatientInfo;
  drug: DrugInfo;
  prescriber: PrescriberInfo;
  fillHistory: FillHistoryItem[];
}

export default function PrescriptionDetails({
  prescriptionId,
  onBack,
}: PrescriptionDetailsProps) {
  const [data, setData] = useState<PrescriptionDetailsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch details from backend
  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      setLoading(true);
      setError(null);

      const res = await api.get<PrescriptionDetailsData>(
        `/api/pharmacist/prescriptions/${prescriptionId}`
      );

      if (cancelled) return;

      if (!res.ok || !res.data) {
        setError((res as any).error || 'Failed to load prescription.');
        toast('Error loading prescription', {
          description:
            (res as any).error || 'Unable to load details. Please try again.',
        });
        setLoading(false);
        return;
      }

      // Defensive: ensure arrays are arrays
      const normalized: PrescriptionDetailsData = {
        ...res.data,
        fillHistory: Array.isArray((res.data as any).fillHistory)
          ? (res.data as any).fillHistory
          : [],
      };

      setData(normalized);
      setLoading(false);
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [prescriptionId]);

  const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  };

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
  };

  const priorityColor = (priority?: string | null) => {
    const p = (priority || '').toLowerCase();
    if (p === 'urgent') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    if (p === 'routine')
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4 mr-2" />
          Back to Queue
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Loading prescription...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please wait while we load the details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4 mr-2" />
          Back to Queue
        </Button>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Unable to load prescription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error || 'Something went wrong while loading this prescription.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { patient, drug, prescriber, fillHistory } = data;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="size-4 mr-2" />
        Back to Queue
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Prescription Details</h1>
          <p className="text-sm text-muted-foreground">
            Rx ID: <span className="font-mono">RX-{data.rxId}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.priority && (
            <Badge className={priorityColor(data.priority)}>
              {data.priority}
            </Badge>
          )}
          <Badge variant="outline">{data.status}</Badge>
          {data.entryMethod && (
            <Badge variant="secondary">
              {data.entryMethod.charAt(0).toUpperCase() + data.entryMethod.slice(1)} entry
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Patient + Prescriber */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">
                {patient.lastName} {patient.firstName}
              </p>
              <p className="text-sm text-muted-foreground">
                DOB: {formatDate(patient.dob)}
              </p>
              {patient.phone && (
                <p className="text-sm text-muted-foreground">Phone: {patient.phone}</p>
              )}
              {patient.email && (
                <p className="text-sm text-muted-foreground">Email: {patient.email}</p>
              )}
              {patient.address && (
                <p className="text-sm text-muted-foreground">Address: {patient.address}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Insurance ID: {patient.insuranceId ?? '—'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Prescriber Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="font-semibold">{prescriber.name}</p>
              {prescriber.specialty && (
                <p className="text-sm text-muted-foreground">
                  Specialty: {prescriber.specialty}
                </p>
              )}
              {prescriber.licenseNo && (
                <p className="text-xs text-muted-foreground">
                  License: {prescriber.licenseNo}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Drug, SIG, history */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="size-5" />
                Medication & Directions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold">
                  {drug.name}{' '}
                  {drug.strength && (
                    <span className="text-muted-foreground font-normal">
                      {drug.strength}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Form: {drug.form || '—'} · NDC: {drug.ndc || '—'}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium">{data.quantity ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Refills</p>
                  <p className="font-medium">
                    {data.refillsUsed ?? 0}/{data.refillsTotal ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days Supply</p>
                  <p className="font-medium">{data.daysSupply ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date Issued</p>
                  <p className="font-medium">{formatDate(data.dateIssued)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Dosage</p>
                <p>{data.dosage || '—'}</p>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Instructions (SIG)</p>
                <p>{data.instructions || '—'}</p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="history" className="space-y-3">
            <TabsList>
              <TabsTrigger value="history">Fill History</TabsTrigger>
              <TabsTrigger value="meta">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="size-5" />
                    Fill History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {fillHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No previous fills recorded for this prescription.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {fillHistory.map((fill) => (
                        <div
                          key={fill.fillId}
                          className="border rounded-lg px-3 py-2 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {fill.stage || '—'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(fill.dateFilled)}
                            </p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Qty: {fill.qtyDispensed ?? '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meta">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="size-5" />
                    Prescription Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Issued:</span>{' '}
                    {formatDateTime(data.dateIssued)}
                  </p>
                  <p>
                    <span className="font-medium">Last Fill:</span>{' '}
                    {formatDateTime(data.lastFillDate)}
                  </p>
                  <p>
                    <span className="font-medium">Current Status:</span>{' '}
                    {data.status}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}