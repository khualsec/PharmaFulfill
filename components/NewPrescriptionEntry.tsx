import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { PlusCircle, User, Pill, FileText } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

// Optional callback so the dashboard can refresh the queue after a new RX
interface NewPrescriptionEntryProps {
  onCreated?: () => void;
}

// Types for backend data
interface PatientOption {
  patientId: number;
  firstName: string;
  lastName: string;
  email: string;
  dob: string | null;
  phone?: string | null;
  insuranceProvider: string | null;
}

interface DrugOption {
  drugId: number;
  name: string;
  ndc: string | null;
  strength: string | null;
  form: string | null;
}

interface PrescriberOption {
  prescriberId: number;
  name: string;
  licenseNo: string | null;
  specialty: string | null;
}

type FieldErrors = {
  patientId?: string;
  drugId?: string;
  prescriberId?: string;
  quantity?: string;
  priority?: string;
  entryMethod?: string;
};

export default function NewPrescriptionEntry({ onCreated }: NewPrescriptionEntryProps) {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [drugs, setDrugs] = useState<DrugOption[]>([]);
  const [prescribers, setPrescribers] = useState<PrescriberOption[]>([]);

  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    patientDOB: '',
    patientPhone: '',
    insurance: '',
    medication: '',
    strength: '',
    quantity: '',
    refills: '',
    daysSupply: '',
    directions: '',
    prescriberId: '',
    prescriberName: '',
    prescriberNPI: '',
    prescriberPhone: '',
    rxDate: '',
    rxNumber: '',
    priority: '',
    entryMethod: '',
    notes: '',
    drugId: ''
  });

  // ❗ error messages for required fields
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // clear error on change
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Load patients, drugs, prescribers from backend
  useEffect(() => {
    setLoadingLookups(true);
    Promise.all([
      api.get<{ patients?: PatientOption[] }>('/api/patients', { silent: true }),
      api.get<DrugOption[]>('/api/drugs', { silent: true }),
      api.get<PrescriberOption[]>('/api/prescribers', { silent: true })
    ])
      .then(([patientsRes, drugsRes, prescribersRes]) => {
        if (patientsRes.ok && patientsRes.data) {
          // Backend might return either { patients: [...] } or just [...]
          const list =
            Array.isArray((patientsRes.data as any).patients)
              ? (patientsRes.data as any).patients
              : patientsRes.data;
          setPatients(list as PatientOption[]);
        }
        if (drugsRes.ok && Array.isArray(drugsRes.data)) {
          setDrugs(drugsRes.data);
        }
        if (prescribersRes.ok && Array.isArray(prescribersRes.data)) {
          setPrescribers(prescribersRes.data);
        }
      })
      .catch(() => {
        toast.error('Failed to load patients, drugs, or prescribers.');
      })
      .finally(() => setLoadingLookups(false));
  }, []);

  // 🔒 Figure out which patient is selected + insurance display text
  const selectedPatient =
    patients.find(p => p.patientId.toString() === formData.patientId) || null;

  const insuranceDisplay = selectedPatient
    ? selectedPatient.insuranceProvider || 'No insurance on file'
    : 'Select a patient to view';

  const handleAddToQueue = () => {
    const newErrors: FieldErrors = {};

    if (!formData.patientId) {
      newErrors.patientId = 'Patient is required.';
    }
    if (!formData.drugId) {
      newErrors.drugId = 'Medication is required.';
    }
    if (!formData.prescriberId) {
      newErrors.prescriberId = 'Prescriber is required.';
    }
    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required.';
    }
    if (!formData.priority) {
      newErrors.priority = 'Priority is required.';
    }
    if (!formData.entryMethod) {
      newErrors.entryMethod = 'Entry method is required.';
    }

    // If we have any errors, show them + toast and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(
        'Please fill in all required fields (patient, medication, prescriber, quantity, priority, entry method).'
      );
      return;
    }

    const qty = parseInt(formData.quantity, 10);
    const refillsTotal = formData.refills ? parseInt(formData.refills, 10) : 0;
    const daysSupply = formData.daysSupply ? parseInt(formData.daysSupply, 10) : undefined;

    if (Number.isNaN(qty) || qty <= 0) {
      setErrors(prev => ({ ...prev, quantity: 'Quantity must be a positive number.' }));
      toast.error('Quantity must be a positive number.');
      return;
    }

    const payload = {
      patientId: Number(formData.patientId),
      prescriberId: Number(formData.prescriberId),
      drugId: Number(formData.drugId),
      dosage: formData.directions || '',
      qty,
      refillsTotal,
      instructions: formData.directions || formData.notes || '',
      daysSupply,
      priority: formData.priority, // 'urgent' | 'normal' | 'routine'
      entryMethod: formData.entryMethod, // 'paper' | 'phone' | 'fax' | 'walkin' | 'electronic'
      dateIssued: formData.rxDate || undefined
    };

    setSubmitting(true);
    api
      .post('/api/pharmacist/prescriptions', payload)
      .then(res => {
        if (!res.ok) {
          const msg =
            (res as any).error ||
            'Failed to add prescription to queue. Please try again.';
          toast.error(msg);
          return;
        }

        toast.success('Prescription added to queue successfully!');
        setErrors({}); // clear any old errors

        // Notify parent dashboard to refresh queue, if provided
        if (onCreated) {
          onCreated();
        }

        // Reset form
        setFormData({
          patientId: '',
          patientName: '',
          patientDOB: '',
          patientPhone: '',
          insurance: '',
          medication: '',
          strength: '',
          quantity: '',
          refills: '',
          daysSupply: '',
          directions: '',
          prescriberId: '',
          prescriberName: '',
          prescriberNPI: '',
          prescriberPhone: '',
          rxDate: '',
          rxNumber: '',
          priority: '',
          entryMethod: '',
          notes: '',
          drugId: ''
        });
      })
      .catch(() => {
        toast.error('Network error while adding prescription.');
      })
      .finally(() => setSubmitting(false));
  };

  // helper for red border on invalid fields
  const errorClass =
    'border-red-500 focus-visible:ring-red-500 focus-visible:ring-1';

  const errorTextClass = 'text-xs text-red-500 mt-1';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">New Prescription Entry</h1>
        <p className="text-muted-foreground">
          Enter walk-in, phone-in, or paper prescriptions
        </p>
      </div>

      {loadingLookups && (
        <p className="text-sm text-muted-foreground mb-4">
          Loading patients, medications, and prescribers...
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2/3: Patient + Medication + Prescriber cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Patient Selector + DOB (auto-filled) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Patient dropdown */}
                <div className="space-y-2">
                  <Label>
                    Patient Name or ID <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.patientId}
                    onValueChange={value => {
                      handleInputChange('patientId', value);
                      const p = patients.find(
                        x => x.patientId.toString() === value
                      );
                      if (p) {
                        handleInputChange(
                          'patientName',
                          `${p.firstName} ${p.lastName}`
                        );
                        handleInputChange('patientDOB', p.dob || '');
                        // 👇 auto-fill phone from patient record
                        handleInputChange('patientPhone', p.phone || '');
                        // optional: also store insurance text in formData if you ever want it
                        handleInputChange(
                          'insurance',
                          p.insuranceProvider || ''
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      id="patient-search"
                      className={errors.patientId ? errorClass : ''}
                    >
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem
                          key={p.patientId}
                          value={p.patientId.toString()}
                        >
                          {p.lastName}, {p.firstName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.patientId && (
                    <p className={errorTextClass}>{errors.patientId}</p>
                  )}
                </div>

                {/* DOB input (auto-filled but still editable) */}
                <div className="space-y-2">
                  <Label htmlFor="patient-dob">Date of Birth</Label>
                  <Input
                    id="patient-dob"
                    type="date"
                    value={formData.patientDOB}
                    onChange={e =>
                      handleInputChange('patientDOB', e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Phone + Insurance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-phone">Phone Number</Label>
                  <Input
                    id="patient-phone"
                    placeholder="(615) 555-0123"
                    value={formData.patientPhone}
                    onChange={e =>
                      handleInputChange('patientPhone', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance">
                    Insurance Provider{' '}
                    <span className="ml-1 text-xs text-muted-foreground">
                      (Auto-filled from patient record)
                    </span>
                  </Label>
                  <Input
                    id="insurance"
                    value={insuranceDisplay}
                    disabled
                    readOnly
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medication Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="size-5" />
                Medication Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Medication + Strength */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Medication select (from /api/drugs) */}
                <div className="space-y-2">
                  <Label htmlFor="medication">
                    Medication Name <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.drugId}
                    onValueChange={value => {
                      handleInputChange('drugId', value);
                      const d = drugs.find(
                        x => x.drugId.toString() === value
                      );
                      if (d) {
                        handleInputChange('medication', d.name || '');
                        handleInputChange('strength', d.strength || '');
                      }
                    }}
                  >
                    <SelectTrigger
                      id="medication"
                      className={errors.drugId ? errorClass : ''}
                    >
                      <SelectValue placeholder="Select medication" />
                    </SelectTrigger>
                    <SelectContent>
                      {drugs.map(d => (
                        <SelectItem
                          key={d.drugId}
                          value={d.drugId.toString()}
                        >
                          {d.name}
                          {d.strength ? ` ${d.strength}` : ''}
                          {d.form ? ` • ${d.form}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.drugId && (
                    <p className={errorTextClass}>{errors.drugId}</p>
                  )}
                </div>

                {/* Strength (auto-filled but still editable) */}
                <div className="space-y-2">
                  <Label htmlFor="strength">Strength/Dosage</Label>
                  <Input
                    id="strength"
                    placeholder="e.g., 10mg, 500mg"
                    value={formData.strength}
                    onChange={e =>
                      handleInputChange('strength', e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Quantity / Refills / Days Supply */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="30"
                    value={formData.quantity}
                    onChange={e =>
                      handleInputChange('quantity', e.target.value)
                    }
                    className={errors.quantity ? errorClass : ''}
                  />
                  {errors.quantity && (
                    <p className={errorTextClass}>{errors.quantity}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refills">Refills</Label>
                  <Input
                    id="refills"
                    type="number"
                    placeholder="0"
                    value={formData.refills}
                    onChange={e =>
                      handleInputChange('refills', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="days-supply">Days Supply</Label>
                  <Input
                    id="days-supply"
                    type="number"
                    placeholder="30"
                    value={formData.daysSupply}
                    onChange={e =>
                      handleInputChange('daysSupply', e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Directions */}
              <div className="space-y-2">
                <Label htmlFor="directions">Directions for Use (SIG)</Label>
                <Textarea
                  id="directions"
                  placeholder="Take 1 tablet by mouth once daily"
                  rows={3}
                  value={formData.directions}
                  onChange={e =>
                    handleInputChange('directions', e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Prescriber Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Prescriber Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prescriber select + NPI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prescriber-name">
                    Prescriber Name <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.prescriberId}
                    onValueChange={value => {
                      handleInputChange('prescriberId', value);
                      const pr = prescribers.find(
                        x => x.prescriberId.toString() === value
                      );
                      if (pr) {
                        handleInputChange('prescriberName', pr.name || '');
                      }
                    }}
                  >
                    <SelectTrigger
                      id="prescriber-name"
                      className={errors.prescriberId ? errorClass : ''}
                    >
                      <SelectValue placeholder="Select prescriber" />
                    </SelectTrigger>
                    <SelectContent>
                      {prescribers.map(pr => (
                        <SelectItem
                          key={pr.prescriberId}
                          value={pr.prescriberId.toString()}
                        >
                          {pr.name}
                          {pr.specialty ? ` • ${pr.specialty}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.prescriberId && (
                    <p className={errorTextClass}>{errors.prescriberId}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prescriber-npi">NPI Number</Label>
                  <Input
                    id="prescriber-npi"
                    placeholder="1234567890"
                    value={formData.prescriberNPI}
                    onChange={e =>
                      handleInputChange('prescriberNPI', e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Phone + RX Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prescriber-phone">Prescriber Phone</Label>
                  <Input
                    id="prescriber-phone"
                    placeholder="(615) 555-0199"
                    value={formData.prescriberPhone}
                    onChange={e =>
                      handleInputChange('prescriberPhone', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rx-date">Prescription Date</Label>
                  <Input
                    id="rx-date"
                    type="date"
                    value={formData.rxDate}
                    onChange={e =>
                      handleInputChange('rxDate', e.target.value)
                    }
                  />
                </div>
              </div>

              {/* RX Number (optional, just stored in form for now) */}
              <div className="space-y-2">
                <Label htmlFor="rx-number">
                  Prescription Number (Optional)
                </Label>
                <Input
                  id="rx-number"
                  placeholder="RX-1005"
                  value={formData.rxNumber}
                  onChange={e =>
                    handleInputChange('rxNumber', e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT 1/3: Priority, Notes, Actions */}
        <div className="space-y-6">
          {/* Priority & Entry Method */}
          <Card>
            <CardHeader>
              <CardTitle>Priority & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="priority">
                  Priority Level <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={value =>
                    handleInputChange('priority', value)
                  }
                >
                  <SelectTrigger
                    id="priority"
                    className={errors.priority ? errorClass : ''}
                  >
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="routine">Routine</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className={errorTextClass}>{errors.priority}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-method">
                  Entry Method <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.entryMethod}
                  onValueChange={value =>
                    handleInputChange('entryMethod', value)
                  }
                >
                  <SelectTrigger
                    id="entry-method"
                    className={errors.entryMethod ? errorClass : ''}
                  >
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paper">Paper Prescription</SelectItem>
                    <SelectItem value="phone">Phone-In</SelectItem>
                    <SelectItem value="fax">Fax</SelectItem>
                    <SelectItem value="walkin">Walk-In</SelectItem>
                    <SelectItem value="electronic">Electronic</SelectItem>
                  </SelectContent>
                </Select>
                {errors.entryMethod && (
                  <p className={errorTextClass}>{errors.entryMethod}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter any additional notes or special instructions..."
                rows={6}
                value={formData.notes}
                onChange={e =>
                  handleInputChange('notes', e.target.value)
                }
              />
            </CardContent>
          </Card>

          {/* Actions (no Save as Draft) */}
          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={handleAddToQueue}
              disabled={submitting}
            >
              <PlusCircle className="size-5 mr-2" />
              {submitting ? 'Adding...' : 'Add to Queue'}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                // Simple cancel = clear form
                setFormData({
                  patientId: '',
                  patientName: '',
                  patientDOB: '',
                  patientPhone: '',
                  insurance: '',
                  medication: '',
                  strength: '',
                  quantity: '',
                  refills: '',
                  daysSupply: '',
                  directions: '',
                  prescriberId: '',
                  prescriberName: '',
                  prescriberNPI: '',
                  prescriberPhone: '',
                  rxDate: '',
                  rxNumber: '',
                  priority: '',
                  entryMethod: '',
                  notes: '',
                  drugId: ''
                });
                setErrors({});
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}