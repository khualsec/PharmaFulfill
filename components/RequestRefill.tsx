// components/RequestRefill.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { ArrowLeft, Package, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface Prescription {
  rxId: number;
  drugName: string;
  strength: string | null;
  form: string | null;
  refillsTotal: number | null;
  refillsUsed: number | null;
  lastFillDate: string | null;
  prescriberName: string | null;
}

interface StoreOption {
  storeId: number;
  name: string;
  address: string;
}

interface RequestRefillProps {
  prescription: Prescription;
  onBack: () => void;
}

export default function RequestRefill({
  prescription,
  onBack,
}: RequestRefillProps) {
  const { user } = useAuth();

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [pickupStoreId, setPickupStoreId] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("pickup");
  const [pickupDate, setPickupDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState<{
    requestId: number;
    requestedOn: string;
  } | null>(null);

  // Load store list from backend
  useEffect(() => {
    const loadStores = async () => {
      const res = await api.get<StoreOption[]>("/api/stores");
      if (res.ok && Array.isArray(res.data)) {
        setStores(res.data);
        if (res.data.length > 0) {
          setPickupStoreId(String(res.data[0].storeId));
        }
      } else {
        console.warn("Failed to load stores", res);
      }
    };
    loadStores();
  }, []);

  const remainingRefills = Math.max(
    (prescription.refillsTotal ?? 0) - (prescription.refillsUsed ?? 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return; // should not happen, guarded by ProtectedRoute

    setSubmitting(true);
    setSubmittedInfo(null);

    const res = await api.post("/api/refill-requests", {
      rxId: prescription.rxId,
      patientId: user.id,
      notes,
      // pickupDate, pickupStoreId, deliveryMethod could be
      // sent later once the backend is ready to store them.
    });

    setSubmitting(false);

    if (res.ok) {
      const data = res.data as any;
      setSubmittedInfo({
        requestId: data.requestId,
        requestedOn: data.requestedOn,
      });
    }
  };

  const medicationLabel = [
    prescription.drugName,
    prescription.strength || "",
    prescription.form || "",
  ]
    .join(" ")
    .trim();

  const rxNumberLabel = `RX-${prescription.rxId}`;

  return (
    <div>
      <Button variant="ghost" className="mb-4" onClick={onBack}>
        <ArrowLeft className="size-4 mr-2" />
        Back to Prescriptions
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl mb-2">Request Refill</h1>
        <p className="text-muted-foreground">
          Submit a refill request for your prescription
        </p>
      </div>

      {submittedInfo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Refill Requested</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Your refill request has been submitted.</p>
            <p>
              <span className="font-semibold">Request ID:</span>{" "}
              {submittedInfo.requestId}
            </p>
            <p>
              <span className="font-semibold">Time:</span>{" "}
              {new Date(submittedInfo.requestedOn).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Refill Request Form</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="medication">Medication</Label>
                  <Input id="medication" value={medicationLabel} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rxNumber">Prescription Number</Label>
                  <Input id="rxNumber" value={rxNumberLabel} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickupDate">Preferred Pickup Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <Input
                      id="pickupDate"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pharmacy">Pickup Location</Label>
                  <Select
                    value={pickupStoreId}
                    onValueChange={(value) => setPickupStoreId(value)}
                  >
                    <SelectTrigger id="pharmacy">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem
                          key={store.storeId}
                          value={String(store.storeId)}
                        >
                          {store.name} - {store.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryMethod">Delivery Method</Label>
                  <Select
                    value={deliveryMethod}
                    onValueChange={(value) => setDeliveryMethod(value)}
                  >
                    <SelectTrigger id="deliveryMethod">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">In-Store Pickup</SelectItem>
                      <SelectItem value="delivery">
                        Home Delivery (+$5.00)
                      </SelectItem>
                      <SelectItem value="drivethrough">
                        Drive-Through Pickup
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special instructions or questions..."
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Refill Request"}
                  </Button>
                  <Button variant="outline" onClick={onBack} type="button">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-5" />
                Prescription Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Medication</p>
                <p className="font-semibold">{medicationLabel}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prescriber</p>
                <p className="font-semibold">
                  {prescription.prescriberName || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Refills Remaining
                </p>
                <p className="font-semibold">{remainingRefills}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Filled</p>
                <p className="font-semibold">
                  {prescription.lastFillDate
                    ? prescription.lastFillDate.slice(0, 10)
                    : "Not yet filled"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Processing Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                Refill requests are typically processed within:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>2–4 hours for in-stock medications</li>
                <li>24–48 hours if ordering is required</li>
                <li>We will notify you when your order is ready</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Contact our pharmacy team if you have questions about your
                refill.
              </p>
              <Button variant="outline" className="w-full">
                Call Pharmacy
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}