import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Clock, Package } from "lucide-react";

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

interface MyPrescriptionsProps {
  prescriptions: Prescription[];
  loading: boolean;
  reload: () => void;
  onViewDetails: (id: number) => void;
  onRequestRefill: (id: number) => void;
}

export default function MyPrescriptions({
  prescriptions,
  loading,
  reload,
  onViewDetails,
  onRequestRefill,
}: MyPrescriptionsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">My Prescriptions</h2>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Prescriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading prescriptions...
            </p>
          ) : prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You do not have any prescriptions yet.
            </p>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((rx) => {
                const remaining =
                  Math.max((rx.refillsTotal ?? 0) - (rx.refillsUsed ?? 0), 0);
                return (
                  <div key={rx.rxId} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {rx.drugName} {rx.strength} {rx.form}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Prescribed by {rx.prescriberName}
                        </p>
                      </div>
                      <Badge
                        variant={rx.status === "Ready" ? "default" : "secondary"}
                        className={rx.status === 'Ready' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                      >
                        {rx.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="size-4" />
                        {remaining} refills left
                      </span>
                      {rx.lastFillDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-4" />
                          Last filled: {rx.lastFillDate.slice(0, 10)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={remaining <= 0}
                        onClick={() => onRequestRefill(rx.rxId)}
                      >
                        Request Refill
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewDetails(rx.rxId)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}