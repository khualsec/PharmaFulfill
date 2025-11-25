import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Clock, Package, Search, Filter } from 'lucide-react';
import api from '../lib/api';

interface PrescriptionQueueProps {
  onViewDetails: (id: number) => void;
  onStartFilling: (id: number) => void;
  refreshKey?: number;
}

interface QueueItem {
  id: number;
  rxId: string;
  patient: string;
  medication: string;
  quantity: number | null;
  priority: string;
  timeInQueue: string;
  prescriber?: string | null;
  insurance?: string | null;
  status: string; // "Pending" | "In Progress"
}

interface QueueResponse {
  items: QueueItem[];
}

export default function PrescriptionQueue({
  onViewDetails,
  onStartFilling,
  refreshKey = 0
}: PrescriptionQueueProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<QueueResponse>('/api/pharmacist/queue', { silent: true })
      .then((res) => {
        if (res.ok && res.data && Array.isArray(res.data.items)) {
          setItems(res.data.items);
        } else {
          setItems([]);
        }
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const urgentCount = useMemo(
    () => items.filter((q) => q.priority.toLowerCase() === 'urgent').length,
    [items]
  );

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter(
      (item) =>
        item.rxId.toLowerCase().includes(term) ||
        item.patient.toLowerCase().includes(term) ||
        item.medication.toLowerCase().includes(term)
    );
  }, [items, search]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Prescription Queue</h1>
        <p className="text-muted-foreground">
          Process prescriptions waiting to be filled
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">In Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {loading ? '—' : items.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Urgent Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-red-600">
              {loading ? '—' : urgentCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Avg. Wait Time</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Can be wired later if you compute it on the backend */}
            <div className="text-3xl">—</div>
          </CardContent>
        </Card>
      </div>

      {/* Search / filter bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by Rx ID, patient name, or medication..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="size-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Loading queue...
        </p>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const primaryButtonLabel =
              item.status === 'In Progress' ? 'Resume Filling' : 'Start Filling';

            return (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{item.rxId}</h3>
                          <Badge
                            variant={
                              item.priority.toLowerCase() === 'urgent'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {item.priority}
                          </Badge>
                          {/* Small status chip */}
                          <Badge variant="outline">
                            {item.status}
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
                        <p className="font-medium">
                          {item.quantity != null ? `${item.quantity} units` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Prescriber</p>
                        <p className="font-medium">
                          {item.prescriber || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Insurance</p>
                        <p className="font-medium">
                          {item.insurance || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => onStartFilling(item.id)}
                      >
                        <Package className="size-4 mr-2" />
                        {primaryButtonLabel}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewDetails(item.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No prescriptions found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}