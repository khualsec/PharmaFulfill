import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  FileText,
  Calendar,
  Pill,
  User as UserIcon,
  ArrowLeft
} from 'lucide-react';
import api from '../lib/api';

interface PatientPrescriptionHistoryProps {
  patientId: number;
  /** Optional – nicer header text if you already know the name from PatientRecords */
  patientName?: string;
  /** Optional – if you want a back button in the header */
  onBack?: () => void;
}

interface HistoryItem {
  id: number;
  rxId: string;           // "RX-1001"
  medication: string;     // "Atorvastatin 10mg"
  prescriber: string;
  filledDate: string | null;
  quantity: number | null;
  daysSupply: number | null;
  refills: number;
  refillsRemaining: number;
  status: string;         // DB status string like "Pending", "Ready", "Picked Up", etc.
}

/** Decide if this should be considered "active/current" for the top section */
function isActiveStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();

  // Treat these as still "current" / in workflow
  const activeSet = new Set([
    'pending',
    'new',
    'queued',
    'in progress',
    'filling',
    'pending verification',
    'printed',
    'ready',
    'filled'
  ]);

  return activeSet.has(s);
}

/** Optional: just return status as-is for badge text */
function statusDisplay(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return status;
}

export default function PatientPrescriptionHistory({
  patientId,
  patientName,
  onBack
}: PatientPrescriptionHistoryProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load prescriptions for this patient from backend
  useEffect(() => {
    if (!patientId) return;

    setLoading(true);
    setError(null);
    setItems([]);

    api
      .get<{ prescriptions: any[] }>(
        `/api/patient/prescriptions?patientId=${patientId}`,
        { silent: true }
      )
      .then((res) => {
        if (!res.ok || !res.data || !Array.isArray(res.data.prescriptions)) {
          setError((res as any).error || 'Failed to load prescription history.');
          return;
        }

        const mapped: HistoryItem[] = res.data.prescriptions.map((rx) => {
          const refillsTotal = rx.refillsTotal ?? 0;
          const refillsUsed = rx.refillsUsed ?? 0;
          const remaining = Math.max(0, refillsTotal - refillsUsed);

          // Use lastFillDate primarily; fall back to dateIssued
          const filledDate = rx.lastFillDate || rx.dateIssued || null;

          const medName = [rx.drugName, rx.strength].filter(Boolean).join(' ');

          return {
            id: rx.rxId,
            rxId: `RX-${rx.rxId}`,
            medication: medName || 'Unknown medication',
            prescriber: rx.prescriberName || 'Unknown prescriber',
            filledDate,
            quantity: rx.quantity ?? null,
            daysSupply: rx.daysSupply ?? null,
            refills: refillsTotal,
            refillsRemaining: remaining,
            status: rx.status || 'Unknown'
          };
        });

        setItems(mapped);
      })
      .catch(() => {
        setError('Network error while loading prescription history.');
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  // Split into "active" vs "past" using DB status
  const { activePrescriptions, completedPrescriptions } = useMemo(() => {
    const active: HistoryItem[] = [];
    const past: HistoryItem[] = [];

    items.forEach((p) => {
      if (isActiveStatus(p.status)) {
        active.push(p);
      } else {
        past.push(p);
      }
    });

    return { activePrescriptions: active, completedPrescriptions: past };
  }, [items]);

  const totalPrescriptions = items.length;
  const refillsAvailable = useMemo(
    () => items.reduce((sum, p) => sum + (p.refillsRemaining || 0), 0),
    [items]
  );

  const headerName =
    patientName ?? (patientId ? `Patient #${patientId}` : 'Patient');

  if (loading && items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading prescription history...</p>
      </div>
    );
  }

  if (!loading && !error && items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl mb-1">Prescription History</h2>
            <p className="text-muted-foreground">{headerName}</p>
          </div>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
          )}
        </div>
        <div className="text-center py-8">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-muted-foreground">No prescription history found</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header (matches Figma but with optional Back button) */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl mb-1">Prescription History</h2>
          <p className="text-muted-foreground">{headerName}</p>
        </div>
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
        )}
      </div>

      {/* Top stats (same layout as your Figma version) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{activePrescriptions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{totalPrescriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Refills Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{refillsAvailable}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lists – same visual style as Figma, but using live data */}
      <div className="space-y-6">
        {/* Active/current prescriptions */}
        {activePrescriptions.length > 0 && (
          <div>
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <FileText className="size-5" />
              Active Prescriptions
            </h3>
            <div className="space-y-3">
              {activePrescriptions.map((prescription) => (
                <Card key={prescription.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{prescription.rxId}</h4>
                          <Badge
                            variant="outline"
                            className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          >
                            {statusDisplay(prescription.status)}
                          </Badge>
                        </div>
                        {prescription.filledDate && (
                          <p className="text-sm text-muted-foreground">
                            Filled on {prescription.filledDate}
                          </p>
                        )}
                      </div>
                      {prescription.refillsRemaining > 0 && (
                        <Badge variant="secondary">
                          {prescription.refillsRemaining} refills left
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Pill className="size-4 text-muted-foreground" />
                        <p className="font-medium">{prescription.medication}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserIcon className="size-4 text-muted-foreground" />
                        <p className="text-sm">
                          Prescribed by {prescription.prescriber}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mt-3 pt-3 border-t">
                        <div>
                          <p className="text-muted-foreground">Quantity</p>
                          <p className="font-medium">
                            {prescription.quantity ?? '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Days Supply</p>
                          <p className="font-medium">
                            {prescription.daysSupply != null
                              ? `${prescription.daysSupply} days`
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Refills</p>
                          <p className="font-medium">{prescription.refills}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Past / completed / picked up / cancelled */}
        {completedPrescriptions.length > 0 && (
          <div>
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <Calendar className="size-5" />
              Past Prescriptions
            </h3>
            <div className="space-y-3">
              {completedPrescriptions.map((prescription) => (
                <Card key={prescription.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{prescription.rxId}</h4>
                          <Badge variant="outline">
                            {statusDisplay(prescription.status)}
                          </Badge>
                        </div>
                        {prescription.filledDate && (
                          <p className="text-sm text-muted-foreground">
                            Filled on {prescription.filledDate}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Pill className="size-4 text-muted-foreground" />
                        <p className="font-medium">{prescription.medication}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserIcon className="size-4 text-muted-foreground" />
                        <p className="text-sm">
                          Prescribed by {prescription.prescriber}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}