import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import api from '../lib/api';

interface PatientDetailViewProps {
  patientId: number;
  patientName?: string;
  onBack?: () => void; // <-- Close button callback
}

interface PatientDetail {
  id: number;
  firstName: string;
  lastName: string;
  dob: string | null;
  age: number | null;
  phone: string | null;
  email: string;
  address: string | null;
  insuranceProvider: string | null;
  insurancePlan: string | null;
  activePrescriptions: number;
  totalPrescriptions: number;
  lastVisit: string | null;
}

export default function PatientDetailView({
  patientId,
  patientName,
  onBack,
}: PatientDetailViewProps) {
  const [data, setData] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load patient details
  useEffect(() => {
    if (!patientId) return;

    setLoading(true);
    setError(null);

    api
      .get<PatientDetail>(`/api/patients/${patientId}`, { silent: true })
      .then((res) => {
        if (res.ok && res.data) {
          setData(res.data);
        } else {
          setError((res as any).error || 'Failed to load patient details.');
        }
      })
      .catch(() => setError('Network error while loading patient details.'))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading && !data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading patient details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">{error || 'Patient not found'}</p>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4 mr-2" />
            Go Back
          </Button>
        )}
      </div>
    );
  }

  const displayName =
    patientName ?? `${data.firstName} ${data.lastName}`.trim();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl mb-1">{displayName}</h2>
          <p className="text-muted-foreground">Patient ID: {data.id}</p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-base px-4 py-2">
            {data.activePrescriptions} Active Rx
          </Badge>

          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {data.dob
                  ? `${data.dob}${data.age != null ? ` (Age ${data.age})` : ''}`
                  : '—'}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{data.address || '—'}</p>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              <p className="font-medium">{data.phone || '—'}</p>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <p className="font-medium">{data.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4" />
              Insurance Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Provider</p>
              <p className="font-medium">{data.insuranceProvider || '—'}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="font-medium">{data.insurancePlan || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            Prescription Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl mb-1">{data.activePrescriptions}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>

            <div>
              <p className="text-3xl mb-1">{data.totalPrescriptions}</p>
              <p className="text-sm text-muted-foreground">Total Filled</p>
            </div>

            <div>
              <p className="text-3xl mb-1">
                <Calendar className="size-8 inline" />
              </p>
              <p className="text-sm text-muted-foreground">
                Last Visit: {data.lastVisit || '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Close Button */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => {
            if (onBack) onBack();
          }}
        >
          Close
        </Button>
      </div>
    </div>
  );
}