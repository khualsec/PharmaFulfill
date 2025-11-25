import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Printer,
  Package
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface PrescriptionDetailsResponse {
  rxId: number;
  status: string;
  priority?: string | null;
  entryMethod?: string | null;
  daysSupply?: number | null;
  dateIssued?: string | null;
  lastFillDate?: string | null;
  refillsTotal: number;
  refillsUsed: number;
  dosage?: string | null;
  instructions?: string | null;
  quantity?: number | null;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    dob?: string | null;
    phone?: string | null;
    address?: string | null;
    insuranceId?: number | null;
  };
  drug: {
    drugId: number;
    name: string;
    strength?: string | null;
    form?: string | null;
    ndc?: string | null;
  };
  prescriber: {
    prescriberId: number;
    name: string;
    licenseNo?: string | null;
    specialty?: string | null;
  };
  fillHistory: {
    fillId: number;
    dateFilled: string | null;
    qtyDispensed: number | null;
    stage: string | null;
  }[];
}

interface FillingInfoState {
  lotNumber: string;
  expirationDate: string;
  ndc: string;
  quantityDispensed: number | '';
  pharmacistNotes: string;
}

export function PrescriptionFilling() {
  const navigate = useNavigate();
  const { rxId } = useParams<{ rxId: string }>();
  const { user } = useAuth(); // logged-in pharmacist/tech

  const [data, setData] = useState<PrescriptionDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fillingInfo, setFillingInfo] = useState<FillingInfoState>({
    lotNumber: '',
    expirationDate: '',
    ndc: '',
    quantityDispensed: '',
    pharmacistNotes: ''
  });

  const [inventoryStatus] = useState({
    available: true,
    inStock: 150,
    location: 'Aisle 3, Shelf B'
  });

  useEffect(() => {
    if (!rxId) return;

    setLoading(true);
    setError(null);

    api
      .get<PrescriptionDetailsResponse>(`/api/pharmacist/prescriptions/${rxId}`, {
        silent: true
      })
      .then((res) => {
        if (res.ok && res.data) {
          setData(res.data);
          setFillingInfo((prev) => ({
            ...prev,
            quantityDispensed: res.data.quantity ?? ''
          }));
        } else {
          setError((res as any).error || 'Unable to load prescription.');
        }
      })
      .catch(() => {
        setError('Network error while loading prescription.');
      })
      .finally(() => setLoading(false));
  }, [rxId]);

  const handleInputChange = (
    field: keyof FillingInfoState,
    value: string | number | ''
  ) => {
    setFillingInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrintLabel = () => {
    if (!data) return;
    console.log('Printing prescription label for:', data.rxId);
    toast('Label print requested', {
      description: `Label for Rx ${data.rxId} would be printed here.`
    });
  };

  const handleCompleteFilling = async () => {
    if (!data || !rxId) return;

    if (!user) {
      toast('Not authenticated', {
        description: 'You must be logged in as staff to complete a fill.'
      });
      return;
    }

    const staffId = user.id;

    // should already be blocked by disabled button, but double-check
    if (
      !fillingInfo.lotNumber ||
      !fillingInfo.expirationDate ||
      !fillingInfo.ndc ||
      fillingInfo.quantityDispensed === '' ||
      fillingInfo.quantityDispensed <= 0
    ) {
      toast('Missing required fields', {
        description: 'Please complete all required filling information.'
      });
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post(`/api/pharmacist/prescriptions/${rxId}/complete`, {
        staffId,
        lotNumber: fillingInfo.lotNumber,
        expirationDate: fillingInfo.expirationDate,
        ndc: fillingInfo.ndc,
        quantityDispensed:
          typeof fillingInfo.quantityDispensed === 'number'
            ? fillingInfo.quantityDispensed
            : Number(fillingInfo.quantityDispensed),
        pharmacistNotes: fillingInfo.pharmacistNotes
      });

      if (res.ok) {
        toast('Prescription moved to verification', {
          description: `Rx ${rxId} is now Pending Verification.`
        });
        navigate('/dashboard/pharmacist');
      } else {
        toast('Failed to complete filling', {
          description: (res as any).error || 'Please try again.'
        });
      }
    } catch {
      toast('Network error', {
        description: 'Unable to complete filling. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToQueue = () => {
    navigate('/dashboard/pharmacist');
  };

  if (!rxId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl mb-2">Invalid Prescription</h1>
          <Button onClick={() => navigate('/dashboard/pharmacist')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Loading prescription...</p>
          <Button variant="outline" onClick={handleBackToQueue}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Queue
          </Button>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl mb-2">Prescription Not Found</h1>
          {error && (
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
          )}
          <Button onClick={() => navigate('/dashboard/pharmacist')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Map backend data -> UI model used by the Figma design
  const fullPatientName = `${data.patient.firstName} ${data.patient.lastName}`;
  const remainingRefills = Math.max(0, data.refillsTotal - data.refillsUsed);

  const prescription = {
    rxId: data.rxId,
    patientName: fullPatientName,
    patientDOB: data.patient.dob || '—',
    medication: data.drug.name,
    strength: data.drug.strength || '',
    dosageForm: data.drug.form || 'Tablet',
    quantity: data.quantity ?? '—',
    directions: data.instructions || data.dosage || '—',
    refills: remainingRefills,
    prescriber: data.prescriber.name,
    prescriberPhone: '(615) 555-0100', // backend doesn’t have this yet
    priority:
      (data.priority || 'Normal').charAt(0).toUpperCase() +
      (data.priority || 'Normal').slice(1),
    allergies: [] as string[], // not in schema yet
    currentMeds: [] as string[], // not in schema yet
    insurance: 'On file' // could be enhanced by joining Insurance later
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleBackToQueue}
              >
                <ArrowLeft className="size-4 mr-2" />
                Back to Queue
              </Button>
              <div>
                <h1 className="text-gray-900 dark:text-white">Prescription Filling</h1>
                <p className="text-gray-600 dark:text-gray-400">Rx ID: {prescription.rxId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {prescription.priority === 'Urgent' && (
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
                  Urgent
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Prescription Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Patient Information */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-gray-900 dark:text-white mb-4">Patient Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Name</p>
                  <p className="text-gray-900 dark:text-white">{prescription.patientName}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Date of Birth</p>
                  <p className="text-gray-900 dark:text-white">{prescription.patientDOB}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Insurance</p>
                  <p className="text-gray-900 dark:text-white">{prescription.insurance}</p>
                </div>
              </div>
            </div>

            {/* Medication Details */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-gray-900 dark:text-white mb-4">Medication Details</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Medication</p>
                  <p className="text-gray-900 dark:text-white">
                    {prescription.medication} {prescription.strength}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Dosage Form</p>
                  <p className="text-gray-900 dark:text-white">{prescription.dosageForm}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Quantity</p>
                  <p className="text-gray-900 dark:text-white">{prescription.quantity}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Refills Remaining</p>
                  <p className="text-gray-900 dark:text-white">{prescription.refills}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Directions</p>
                  <p className="text-gray-900 dark:text-white">
                    {prescription.directions}
                  </p>
                </div>
              </div>
            </div>

            {/* Prescriber Information */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-gray-900 dark:text-white mb-4">Prescriber Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Prescriber</p>
                  <p className="text-gray-900 dark:text-white">{prescription.prescriber}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="text-gray-900 dark:text-white">
                    {prescription.prescriberPhone}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Filling Workflow */}
          <div className="lg:col-span-2 space-y-6">
            {/* Alerts & Warnings */}
            {prescription.allergies.length > 0 && (
              <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-500" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                  <span className="font-medium">Allergies:</span>{' '}
                  {prescription.allergies.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {prescription.currentMeds.length > 0 && (
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                <AlertTriangle className="size-4 text-blue-600 dark:text-blue-500" />
                <AlertDescription className="text-blue-800 dark:text-blue-300">
                  <span className="font-medium">Current Medications:</span>{' '}
                  {prescription.currentMeds.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {/* Inventory Status */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-900 dark:text-white">Inventory Status</h2>
                {inventoryStatus.available ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="size-5" />
                    <span>In Stock</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="size-5" />
                    <span>Out of Stock</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Available Quantity
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {inventoryStatus.inStock} tablets
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Location</p>
                  <p className="text-gray-900 dark:text-white">
                    {inventoryStatus.location}
                  </p>
                </div>
              </div>
            </div>

            {/* Filling Information Form */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-gray-900 dark:text-white mb-4">
                Filling Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lotNumber">Lot Number *</Label>
                    <Input
                      id="lotNumber"
                      placeholder="Enter lot number"
                      value={fillingInfo.lotNumber}
                      onChange={(e) =>
                        handleInputChange('lotNumber', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="expirationDate">Expiration Date *</Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      value={fillingInfo.expirationDate}
                      onChange={(e) =>
                        handleInputChange('expirationDate', e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ndc">NDC Number *</Label>
                    <Input
                      id="ndc"
                      placeholder="XXXXX-XXXX-XX"
                      value={fillingInfo.ndc}
                      onChange={(e) => handleInputChange('ndc', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantityDispensed">Quantity Dispensed *</Label>
                    <Input
                      id="quantityDispensed"
                      type="number"
                      value={fillingInfo.quantityDispensed}
                      onChange={(e) =>
                        handleInputChange(
                          'quantityDispensed',
                          e.target.value === ''
                            ? ''
                            : parseInt(e.target.value, 10) || ''
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="pharmacistNotes">Pharmacist Notes</Label>
                  <Textarea
                    id="pharmacistNotes"
                    placeholder="Add any notes about this prescription..."
                    rows={3}
                    value={fillingInfo.pharmacistNotes}
                    onChange={(e) =>
                      handleInputChange('pharmacistNotes', e.target.value)
                    }
                  />
                </div>

                {/* Print Label */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    onClick={handlePrintLabel}
                    className="w-full"
                  >
                    <Printer className="size-4 mr-2" />
                    Print Prescription Label
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleBackToQueue}
                className="flex-1"
                disabled={submitting}
              >
                Return to Queue
              </Button>
              <Button
                onClick={handleCompleteFilling}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={
                  submitting ||
                  !fillingInfo.lotNumber ||
                  !fillingInfo.expirationDate ||
                  !fillingInfo.ndc ||
                  fillingInfo.quantityDispensed === '' ||
                  fillingInfo.quantityDispensed <= 0
                }
              >
                <Package className="size-4 mr-2" />
                {submitting ? 'Completing...' : 'Complete Filling'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}