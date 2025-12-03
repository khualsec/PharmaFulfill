import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

// ----- Types from backend -----
interface InventoryItem {
  storeId?: number;
  drugId?: number;
  name?: string;
  ndc?: string;
  storeName?: string;
  stockQty?: number;
  expiresOn?: string | null;
  unitPrice?: number | null;
}

interface AdminInventoryProps {
  inventory: InventoryItem[];
  reload: () => void;
}

interface Store {
  storeId: number;
  name: string;
  address: string;
}

// Local UI row (includes link back to backend IDs)
interface InventoryRow {
  id: number; // local row id for React
  backendStoreId?: number;
  backendDrugId?: number;
  drug: string;
  ndc: string;
  stock: number;
  reorderLevel: number;
  expiryDate: string;
  store: string;
  price: string;
}

// Helper: store-specific badge colors
function getStoreBadgeClass(storeName: string) {
  const name = (storeName || "").toLowerCase();

  if (name.includes("downtown")) {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (name.includes("west")) {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  if (name.includes("green")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (name.includes("main")) {
    return "bg-violet-100 text-violet-800 border-violet-200";
  }

  // default style
  return "bg-slate-100 text-slate-800 border-slate-200";
}

export default function AdminInventory({
  inventory,
  reload,
}: AdminInventoryProps) {
  const [rows, setRows] = useState<InventoryRow[]>([]);

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<InventoryRow | null>(null);
  const [formData, setFormData] = useState({
    drug: "",
    ndc: "",
    stock: "",
    reorderLevel: "",
    expiryDate: "",
    store: "",
    price: "",
  });

  // 🔍 Search term state
  const [searchTerm, setSearchTerm] = useState("");

  // ----- Load stores from backend -----
  useEffect(() => {
    const fetchStores = async () => {
      const res = await api.get<Store[]>("/api/stores");
      if (res.ok && Array.isArray(res.data)) {
        setStores(res.data);
        // If nothing selected yet, default to first store
        if (!selectedStoreId && res.data.length > 0) {
          setSelectedStoreId(res.data[0].storeId);
        }
      } else {
        console.error("Failed to load stores", res);
      }
    };

    void fetchStores();
    // we only need to load once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
useEffect(() => {
  console.log("AdminInventory inventory prop:", inventory);

  const mapped: InventoryRow[] = inventory.map((item, index) => {
    // Be extra safe in case backend ever sends string
    const raw = (item as any).unitPrice;
    const priceNumber =
      typeof raw === "number"
        ? raw
        : raw != null
        ? Number(raw) || 0
        : 0;

    return {
      id: index + 1,
      backendStoreId: item.storeId,
      backendDrugId: item.drugId,
      drug: item.name ?? "Unknown Medication",
      ndc: item.ndc ?? "",
      stock: item.stockQty ?? 0,
      reorderLevel: 50,
      expiryDate: item.expiresOn ? item.expiresOn.slice(0, 10) : "",
      store: item.storeName ?? "Main",
      price: `$${priceNumber.toFixed(2)}`,
    };
  });

  setRows(mapped);
}, [inventory]);


  const lowStockItems = rows.filter((item) => item.stock < item.reorderLevel);
  const totalValue = rows.reduce(
    (acc, item) =>
      acc + item.stock * (parseFloat(item.price.replace("$", "")) || 0),
    0
  );

  // 🔍 Apply search filter (UI only)
  const filteredRows = rows.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();

    return (
      row.drug.toLowerCase().includes(term) ||
      row.ndc.toLowerCase().includes(term) ||
      row.store.toLowerCase().includes(term)
    );
  });

  const resetForm = () => {
    setFormData({
      drug: "",
      ndc: "",
      stock: "",
      reorderLevel: "",
      expiryDate: "",
      store: "",
      price: "",
    });
    setFormError(null);
    // for Add dialog we’ll let selectedStoreId persist; for Edit we set it from the row
  };

  const findStoreLabel = (storeId?: number) => {
    if (!storeId) return "";
    const store = stores.find((s) => s.storeId === storeId);
    if (!store) return "";
    return store.name;
  };

  // ----- ADD -----
  const handleAddMedication = async () => {
    if (!formData.drug || !formData.ndc || !formData.stock) {
      toast.error("Please fill in at least name, NDC, and stock");
      return;
    }

    if (!selectedStoreId) {
      setFormError("Please select a store location.");
      toast.error("Store location is required");
      return;
    }

    const stockQty = parseInt(formData.stock, 10) || 0;
    const reorderLevel = parseInt(formData.reorderLevel || "50", 10);

    const payload = {
      name: formData.drug,
      ndc: formData.ndc,
      storeId: selectedStoreId,
      stockQty,
      reorderLevel,
      expiresOn: formData.expiryDate || null,
      price: formData.price
        ? Number(formData.price.replace(/^\$/, "")) || 0
        : 0,
};


    const res = await api.post("/api/inventory", payload, {
      successMessage: "Medication added to inventory",
    });

    if (!res.ok) {
      return;
    }

    setAddDialogOpen(false);
    resetForm();
    await reload();
  };

  // ----- EDIT -----
  const handleEditMedication = async () => {
    if (!selectedItem) return;

    if (!formData.drug || !formData.ndc || !formData.stock) {
      toast.error("Please fill in at least name, NDC, and stock");
      return;
    }

    const stockQty = parseInt(formData.stock, 10) || 0;
    const reorderLevel = parseInt(formData.reorderLevel || "50", 10);

    // If we don’t have backend IDs, just update UI (but warn)
    if (!selectedItem.backendStoreId || !selectedItem.backendDrugId) {
      toast.warning("This item has no backend IDs; updating local view only.");
      setRows((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                drug: formData.drug,
                ndc: formData.ndc,
                stock: stockQty,
                reorderLevel,
                expiryDate: formData.expiryDate,
                store:
                  findStoreLabel(selectedStoreId ?? selectedItem.backendStoreId) ||
                  formData.store ||
                  "Main",
                price: formData.price.startsWith("$")
                  ? formData.price
                  : formData.price
                  ? `$${formData.price}`
                  : "$0.00",
              }
            : item
        )
      );
      setEditDialogOpen(false);
      resetForm();
      setSelectedItem(null);
      return;
    }

    const effectiveStoreId =
      selectedStoreId ?? selectedItem.backendStoreId ?? null;

    if (!effectiveStoreId) {
      setFormError("Please select a store location.");
      toast.error("Store location is required");
      return;
    }

    const url = `/api/inventory/${selectedItem.backendStoreId}/${selectedItem.backendDrugId}`;

    const payload = {
      name: formData.drug,
      ndc: formData.ndc,
      storeId: effectiveStoreId,
      stockQty,
      reorderLevel,
      expiresOn: formData.expiryDate || null,
      price: formData.price ? Number(formData.price) || 0 : 0,
    };

    const res = await api.put(url, payload, {
      successMessage: "Medication updated successfully",
    });

    if (!res.ok) {
      return;
    }

    setEditDialogOpen(false);
    resetForm();
    setSelectedItem(null);
    await reload();
  };

  // ----- DELETE -----
  const handleDeleteMedication = async () => {
    if (!selectedItem) return;

    if (!selectedItem.backendStoreId || !selectedItem.backendDrugId) {
      toast.warning("This item has no backend IDs; deleting from local view only.");
      setRows((prev) => prev.filter((item) => item.id !== selectedItem.id));
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      return;
    }

    const url = `/api/inventory/${selectedItem.backendStoreId}/${selectedItem.backendDrugId}`;

    const res = await api.delete(url, {
      successMessage: "Medication deleted",
    });

    if (!res.ok) {
      return;
    }

    setDeleteDialogOpen(false);
    setSelectedItem(null);
    await reload();
  };

  const openEditDialog = (item: InventoryRow) => {
    setSelectedItem(item);
    setFormError(null);

    // Try to align selectedStoreId with backendStoreId; fall back to match by name; else keep previous
    let newSelectedStoreId: number | null = selectedStoreId;

    if (item.backendStoreId) {
      newSelectedStoreId = item.backendStoreId;
    } else if (item.store) {
      const match = stores.find(
        (s) => s.name.toLowerCase() === item.store.toLowerCase()
      );
      if (match) newSelectedStoreId = match.storeId;
    }

    setSelectedStoreId(newSelectedStoreId ?? selectedStoreId ?? null);

    setFormData({
      drug: item.drug,
      ndc: item.ndc,
      stock: item.stock.toString(),
      reorderLevel: item.reorderLevel.toString(),
      expiryDate: item.expiryDate,
      store: item.store,
      price: item.price.startsWith("$") ? item.price.slice(1) : item.price,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (item: InventoryRow) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  return (
    <div>
      {/* Header + actions */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage medications across all store locations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reload}>
            Refresh
          </Button>
          <Button
            onClick={() => {
              setFormError(null);
              setAddDialogOpen(true);
            }}
          >
            <Plus className="size-4 mr-2" />
            Add Medication
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{rows.length}</div>
            {searchTerm && (
              <p className="mt-1 text-xs text-muted-foreground">
                Showing {filteredRows.length} matching item
                {filteredRows.length === 1 ? "" : "s"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-red-600">{lowStockItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Store Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {new Set(rows.map((r) => r.store)).size || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by medication name, NDC, or store..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory list */}
      <div className="space-y-3">
        {filteredRows.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Package className="size-4 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{item.drug}</h3>
                    {/* Store badge up top for quick visual ID */}
                    <Badge
                      variant="outline"
                      className={getStoreBadgeClass(item.store)}
                    >
                      {item.store || "Unknown Store"}
                    </Badge>
                    {item.stock < item.reorderLevel && (
                      <Badge variant="destructive">
                        <AlertTriangle className="size-3 mr-1" />
                        Low Stock
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">NDC</p>
                      <p className="font-medium">{item.ndc}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stock</p>
                      <p className="font-medium">{item.stock} units</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reorder Level</p>
                      <p className="font-medium">{item.reorderLevel} units</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className="font-medium">{item.expiryDate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <Badge
                        variant="outline"
                        className={getStoreBadgeClass(item.store)}
                      >
                        {item.store || "Unknown Store"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium">{item.price}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(item)}
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => openDeleteDialog(item)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredRows.length === 0 && (
          <p className="text-sm text-muted-foreground px-1 pb-4">
            No medications match your search.
          </p>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Medication</DialogTitle>
            <DialogDescription>
              Add a new medication to inventory (saves to backend)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medication Name</Label>
              <Input
                placeholder="e.g., Atorvastatin 10mg"
                value={formData.drug}
                onChange={(e) =>
                  setFormData({ ...formData, drug: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NDC</Label>
                <Input
                  placeholder="123456789012"
                  value={formData.ndc}
                  onChange={(e) =>
                    setFormData({ ...formData, ndc: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  placeholder="250"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={formData.reorderLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reorderLevel: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  placeholder="12.50"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expiryDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Store Location</Label>
                <select
                  className="block w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={selectedStoreId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedStoreId(value ? Number(value) : null);
                    setFormError(null);
                  }}
                >
                  <option value="">Select a store...</option>
                  {stores.map((store) => (
                    <option key={store.storeId} value={store.storeId}>
                      {store.name} — {store.address}
                    </option>
                  ))}
                </select>
                {formError && (
                  <p className="mt-1 text-xs text-red-600">{formError}</p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddMedication}>
              Add Medication
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Medication</DialogTitle>
            <DialogDescription>
              Update medication details (saves to backend)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medication Name</Label>
              <Input
                value={formData.drug}
                onChange={(e) =>
                  setFormData({ ...formData, drug: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NDC</Label>
                <Input
                  value={formData.ndc}
                  onChange={(e) =>
                    setFormData({ ...formData, ndc: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  value={formData.reorderLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reorderLevel: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expiryDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Store Location</Label>
                <select
                  className="block w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={selectedStoreId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedStoreId(value ? Number(value) : null);
                    setFormError(null);
                  }}
                >
                  <option value="">Select a store...</option>
                  {stores.map((store) => (
                    <option key={store.storeId} value={store.storeId}>
                      {store.name} — {store.address}
                    </option>
                  ))}
                </select>
                {formError && (
                  <p className="mt-1 text-xs text-red-600">{formError}</p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                resetForm();
                setSelectedItem(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleEditMedication}>
              Update Medication
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Medication</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this medication from inventory?
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold">{selectedItem.drug}</p>
              <p className="text-sm text-muted-foreground">
                NDC: {selectedItem.ndc}
              </p>
            </div>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedItem(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDeleteMedication}>
              Delete Medication
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
