import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type VerificationItem = {
  id: number; // RxID
  rxId: string;
  patient: string;
  medication: string;
  quantity: number;
  priority: string;
  timeInQueue: string;
  prescriber: string;
  insurance: string | null;
  status: string;
};

type ChecklistState = {
  [itemId: number]: {
    [key: string]: boolean;
  };
};

const checklistKeys = [
  'correctMedication',
  'accurateQuantity',
  'properLabeling',
  'patientInstructions',
  'ndcVerification',
  'expirationDate',
] as const;

const checklistLabels: Record<(typeof checklistKeys)[number], string> = {
  correctMedication: 'Correct medication selected',
  accurateQuantity: 'Accurate quantity dispensed',
  properLabeling: 'Proper labeling applied',
  patientInstructions: 'Patient instructions included',
  ndcVerification: 'NDC verification complete',
  expirationDate: 'Expiration date checked',
};

type PrescriptionDetails = {
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
  instructions: string | null;
  quantity: number;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    dob: string | null;
    phone: string | null;
    address: string | null;
    insuranceId: number | null;
  };
  drug: {
    drugId: number;
    name: string;
    strength: string | null;
    form: string | null;
    ndc: string | null;
  };
  prescriber: {
    prescriberId: number;
    name: string;
    licenseNo: string | null;
    specialty: string | null;
  };
  fillHistory: {
    fillId: number;
    dateFilled: string | null;
    qtyDispensed: number | null;
    stage: string | null;
  }[];
};

export default function VerificationQueue() {
  const { user } = useAuth();

  const [queueState, setQueueState] = useState<VerificationItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<ChecklistState>({});
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState('');
  const [verifiedToday, setVerifiedToday] = useState(0);
  const [issuesFound, setIssuesFound] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<PrescriptionDetails | null>(null);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        setLoadingQueue(true);
        const res = await api.get<{ items: VerificationItem[] }>(
          '/api/pharmacist/pending-verification',
          { silent: true }
        );

        if (res.ok && res.data && Array.isArray(res.data.items)) {
          setQueueState(res.data.items);
        } else {
          setQueueState([]);
          toast.error('Failed to load verification queue.');
        }
      } catch {
        setQueueState([]);
        toast.error('Network error while loading verification queue.');
      } finally {
        setLoadingQueue(false);
      }
    };

    fetchQueue();
  }, []);

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        You must be logged in to view the verification queue.
      </p>
    );
  }

  if (user.role !== 'Tech' && user.role !== 'Pharmacist') {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have access to the verification queue.
      </p>
    );
  }

  const staffId = user.id;

  const handleCheckboxChange = (
    itemId: number,
    key: (typeof checklistKeys)[number],
    checked: boolean
  ) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [key]: checked,
      },
    }));
  };

  const isAllChecked = (itemId: number) => {
    const checks = checkedItems[itemId] || {};
    return checklistKeys.every((key) => checks[key] === true);
  };

  const handleApprove = async (item: VerificationItem) => {
    if (!isAllChecked(item.id)) {
      toast.error(
        'Please complete all verification checklist items before approving.'
      );
      return;
    }

    try {
      const res = await api.post<{ success: boolean; message?: string }>(
        `/api/tech/verification/${item.id}/approve`,
        {
          staffId,
        }
      );

      if (!res.ok || !res.data?.success) {
        toast.error(res.data?.message || 'Failed to approve prescription.');
        return;
      }

      setQueueState((prev) => prev.filter((i) => i.id !== item.id));
      setVerifiedToday((prev) => prev + 1);
      toast.success(
        res.data.message || `${item.rxId} approved and marked ready.`
      );
    } catch {
      toast.error('Network error while approving prescription.');
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;

    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }

    try {
      const res = await api.post<{ success: boolean; message?: string }>(
        `/api/tech/verification/${selectedItem.id}/reject`,
        {
          staffId,
          reason: rejectReason.trim(),
        }
      );

      if (!res.ok || !res.data?.success) {
        toast.error(res.data?.message || 'Failed to reject prescription.');
        return;
      }

      setQueueState((prev) => prev.filter((i) => i.id !== selectedItem.id));
      setIssuesFound((prev) => prev + 1);
      toast.error(
        res.data.message ||
          `${selectedItem.rxId} rejected: ${rejectReason.trim()}`
      );

      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedItem(null);
    } catch {
      toast.error('Network error while rejecting prescription.');
    }
  };

  const handleViewDetails = async (item: VerificationItem) => {
    setSelectedItem(item);
    setDetailsDialogOpen(true);
    setDetails(null);
    setDetailsLoading(true);

    try {
      const res = await api.get<PrescriptionDetails>(
        `/api/pharmacist/prescriptions/${item.id}`,
        { silent: true }
      );

      if (res.ok && res.data) {
        setDetails(res.data);
      } else {
        setDetails(null);
        toast.error('Failed to load prescription details.');
      }
    } catch {
      setDetails(null);
      toast.error('Network error while loading prescription details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRejectClick = (item: VerificationItem) => {
    setSelectedItem(item);
    setRejectDialogOpen(true);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Verification Queue</h1>
        <p className="text-muted-foreground">
          Verify prescriptions filled by pharmacists to ensure quality and
          accuracy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{queueState.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Verified Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-600">{verifiedToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Issues Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-destructive">{issuesFound}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Avg. Verification Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">2.3m</div>
          </CardContent>
        </Card>
      </div>

      {loadingQueue && (
        <p className="text-sm text-muted-foreground mb-4">
          Loading verification queue…
        </p>
      )}

      {!loadingQueue && queueState.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No prescriptions currently pending verification.
        </p>
      )}

      <div className="space-y-4">
        {queueState.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{item.rxId}</h3>
                      <Badge className="bg-yellow-600 hover:bg-yellow-700">
                        <Clock className="size-3 mr-1" />
                        Pending Verification
                      </Badge>
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Medication</p>
                    <p className="font-medium">{item.medication}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-medium">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Prescriber</p>
                    <p className="font-medium">{item.prescriber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Insurance</p>
                    <p className="font-medium">
                      {item.insurance || 'Not on file'}
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 rounded p-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    Verification Checklist:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {checklistKeys.map((key) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          checked={checkedItems[item.id]?.[key] || false}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(
                              item.id,
                              key,
                              checked === true
                            )
                          }
                        />
                        <span>{checklistLabels[key]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(item)}
                  >
                    <CheckCircle2 className="size-4 mr-2" />
                    Approve &amp; Mark Ready
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRejectClick(item)}
                  >
                    <XCircle className="size-4 mr-2" />
                    Reject with Reason
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(item)}
                  >
                    <FileCheck className="size-4 mr-2" />
                    View Full Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Prescription</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting the prescription.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason here..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleReject}>
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
            <DialogDescription>
              Detailed information about the prescription.
            </DialogDescription>
          </DialogHeader>

          {detailsLoading && (
            <p className="text-sm text-muted-foreground">
              Loading prescription details…
            </p>
          )}

          {!detailsLoading && selectedItem && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{selectedItem.rxId}</h3>
                    <Badge className="bg-yellow-600 hover:bg-yellow-700">
                      <Clock className="size-3 mr-1" />
                      Pending Verification
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Patient:{' '}
                    {details
                      ? `${details.patient.lastName} ${details.patient.firstName}`
                      : selectedItem.patient}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="size-4" />
                  {selectedItem.timeInQueue}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Medication</p>
                  <p className="font-medium">
                    {details ? details.drug.name : selectedItem.medication}
                  </p>
                  {details?.drug.ndc && (
                    <p className="text-xs text-muted-foreground">
                      NDC: {details.drug.ndc}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium">
                    {details ? details.quantity : selectedItem.quantity}
                  </p>
                  {details?.daysSupply && (
                    <p className="text-xs text-muted-foreground">
                      Days supply: {details.daysSupply}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Prescriber</p>
                  <p className="font-medium">
                    {details ? details.prescriber.name : selectedItem.prescriber}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {details ? details.status : selectedItem.status}
                  </p>
                </div>
              </div>

              {details && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Date Issued</p>
                      <p className="font-medium">
                        {details.dateIssued || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Fill</p>
                      <p className="font-medium">
                        {details.lastFillDate || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Priority</p>
                      <p className="font-medium">
                        {details.priority
                          ? details.priority.toString()
                          : 'Normal'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-sm mb-1">
                      Directions
                    </p>
                    <p className="text-sm">
                      {details.dosage || 'No dosage instructions recorded.'}
                    </p>
                    {details.instructions && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Notes: {details.instructions}
                      </p>
                    )}
                  </div>

                  {details.fillHistory.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">
                        Fill History
                      </p>
                      <div className="space-y-2 text-sm">
                        {details.fillHistory.map((f) => (
                          <div
                            key={f.fillId}
                            className="flex items-center justify-between border rounded px-3 py-2"
                          >
                            <div>
                              <p className="font-medium">
                                {f.dateFilled || 'Unknown date'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Stage: {f.stage || 'Unknown'}
                              </p>
                            </div>
                            <p className="text-sm">
                              Qty: {f.qtyDispensed ?? 0}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="bg-muted/50 rounded p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="size-4" />
                  Verification Checklist:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {checklistKeys.map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={checkedItems[selectedItem.id]?.[key] || false}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(
                            selectedItem.id,
                            key,
                            checked === true
                          )
                        }
                      />
                      <span>{checklistLabels[key]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selectedItem)}
                >
                  <CheckCircle2 className="size-4 mr-2" />
                  Approve &amp; Mark Ready
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRejectClick(selectedItem)}
                >
                  <XCircle className="size-4 mr-2" />
                  Reject with Reason
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}