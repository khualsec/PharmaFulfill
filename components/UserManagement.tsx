import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  Filter,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

type Role = 'Patient' | 'Pharmacist' | 'Tech' | 'Admin';

interface BackendUser {
  id: number;
  userType: 'Patient' | 'Staff';
  name: string;
  role: Role;
  email: string;
  phone?: string | null;
  dob?: string | null;
  staffId?: string | null;
  status: string;
  joined?: string | null;
}

export default function UserManagement() {
  // User list + loading
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BackendUser | null>(null);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    role: 'Patient' as Role,
    staffId: '',
    password: '',
    confirmPassword: '',
  });

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Filters/search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'All' | Role>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>(
    'All'
  );

  // Fetch users from backend
  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get<BackendUser[]>('/api/users');
      if (res.ok && Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        toast.error('Failed to load users from backend');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Derived filters and counts
  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q);

    const matchesRole = filterRole === 'All' || user.role === filterRole;
    const matchesStatus = filterStatus === 'All' || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const roleCount = {
    Patient: users.filter((u) => u.role === 'Patient').length,
    Pharmacist: users.filter((u) => u.role === 'Pharmacist').length,
    Tech: users.filter((u) => u.role === 'Tech').length,
    Admin: users.filter((u) => u.role === 'Admin').length,
  };

  const hasActiveFilters =
    filterRole !== 'All' || filterStatus !== 'All' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setFilterRole('All');
    setFilterStatus('All');
    setSearchQuery('');
    toast.success('Filters cleared');
  };

  // Utility: split full name into first/last
  const splitName = (fullName: string) => {
    const t = fullName.trim();
    if (!t) return { firstName: 'Unknown', lastName: 'User' };
    const parts = t.split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  };

  // Add new user (patient signup or staff request)
  const handleAddUser = async () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.role === 'Patient' && !formData.dob) {
      toast.error('Date of birth is required for patients');
      return;
    }

    if (formData.role === 'Admin') {
      toast.error('Admin accounts cannot be created here.');
      return;
    }

    try {
      if (formData.role === 'Patient') {
        const { firstName, lastName } = splitName(formData.name);

        const res = await api.post(
          '/api/auth/signup/patient',
          {
            firstName,
            lastName,
            dob: formData.dob,
            email: formData.email,
            password: formData.password,
            phone: formData.phone || undefined,
          },
          {
            successMessage:
              'Patient account created! They must verify via email before logging in.',
          }
        );

        if (!res.ok) {
          toast.error((res.data as any)?.error || 'Patient signup failed');
          return;
        }
      } else {
        const res = await api.post(
          '/api/auth/signup/staff-request',
          {
            fullName: formData.name,
            role: formData.role,
            email: formData.email,
            password: formData.password,
          },
          {
            successMessage:
              'Staff access request submitted! Wait for admin approval.',
          }
        );

        if (!res.ok) {
          toast.error((res.data as any)?.error || 'Staff signup failed');
          return;
        }
      }

      await loadUsers();
      setAddDialogOpen(false);
      toast.success(`User ${formData.name} added successfully`);

      setFormData({
        name: '',
        email: '',
        phone: '',
        dob: '',
        role: 'Patient',
        staffId: '',
        password: '',
        confirmPassword: '',
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      console.error(err);
      toast.error('Network error while creating user');
    }
  };

  // Edit existing user profile + optional password change
  const handleEditUser = async () => {
    if (!selectedUser) return;

    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Update basic profile fields
      const payload = {
        userType: selectedUser.userType,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        dob: formData.dob || null,
        staffId: formData.role === 'Patient' ? null : formData.staffId || null,
      };

      const res = await api.put(`/api/users/${selectedUser.id}`, payload);
      if (!res.ok) {
        toast.error((res.data as any)?.error || 'Failed to update user');
        return;
      }

      // Update password if provided
      if (formData.password.trim() !== '') {
        if (formData.password.trim().length < 8) {
          toast.error('New password must be at least 8 characters');
          return;
        }

        const passRes = await api.put(
          `/api/users/${selectedUser.id}/password`,
          {
            userType: selectedUser.userType,
            newPassword: formData.password.trim(),
          }
        );

        if (!passRes.ok) {
          toast.error(
            (passRes.data as any)?.error || 'Failed to update password'
          );
          return;
        }
      }

      await loadUsers();
      toast.success(`User ${formData.name} updated successfully`);

      setEditDialogOpen(false);
      setSelectedUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        dob: '',
        role: 'Patient',
        staffId: '',
        password: '',
        confirmPassword: '',
      });
      setShowPassword(false);
    } catch (err) {
      console.error(err);
      toast.error('Network error while updating user');
    }
  };

  // Delete user (patient or staff)
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const res = await api.del(`/api/users/${selectedUser.id}`, {
        userType: selectedUser.userType,
      });

      if (!res.ok) {
        toast.error((res.data as any)?.error || 'Failed to delete user');
        return;
      }

      await loadUsers();
      toast.success(`User ${selectedUser.name} deleted successfully`);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      toast.error('Network error while deleting user');
    }
  };

  // Open dialogs with current user data
  const openEditDialog = (user: BackendUser) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      dob: user.dob || '',
      role: user.role,
      staffId: user.staffId || '',
      password: '',
      confirmPassword: '',
    });
    setShowPassword(false);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: BackendUser) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  // Main UI
  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage all users including patients and staff members
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add New User
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{roleCount.Patient}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {roleCount.Pharmacist + roleCount.Tech + roleCount.Admin}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-600">23</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or role..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Select
                value={filterRole}
                onValueChange={(value) =>
                  setFilterRole(value as 'All' | Role)
                }
              >
                <SelectTrigger className="w-[150px]">
                  <Filter className="size-4 mr-2" />
                  <SelectValue placeholder="Role">
                    {filterRole === 'All' ? 'All Roles' : filterRole}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Roles</SelectItem>
                  <SelectItem value="Patient">Patient</SelectItem>
                  <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="Tech">Tech</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterStatus}
                onValueChange={(value) =>
                  setFilterStatus(value as 'All' | 'Active' | 'Inactive')
                }
              >
                <SelectTrigger className="w-[150px]">
                  <Filter className="size-4 mr-2" />
                  <SelectValue placeholder="Status">
                    {filterStatus === 'All' ? 'All Status' : filterStatus}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="outline" size="icon" onClick={clearFilters}>
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {filteredUsers.length !== users.length && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {users.length} users
              </p>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          )}

          {loading && (
            <p className="mt-3 text-sm text-muted-foreground">
              Loading users…
            </p>
          )}
        </CardContent>
      </Card>

      {/* User list */}
      {filteredUsers.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="size-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              No users found matching your filters
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <Card key={`${user.userType}-${user.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="size-4 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      <Badge
                        variant={
                          user.role === 'Admin'
                            ? 'default'
                            : user.role === 'Pharmacist'
                            ? 'secondary'
                            : user.role === 'Tech'
                            ? 'outline'
                            : 'secondary'
                        }
                      >
                        {user.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-600"
                      >
                        {user.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{user.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">
                          {user.phone || 'Not set'}
                        </p>
                      </div>
                      {user.staffId && (
                        <div>
                          <p className="text-muted-foreground">Staff ID</p>
                          <p className="font-medium">{user.staffId}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Joined</p>
                        <p className="font-medium">
                          {user.joined || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => openDeleteDialog(user)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ADD USER DIALOG */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Enter user name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            {/* Email */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="Enter user email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            {/* Phone */}
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="Enter user phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            {/* DOB */}
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                placeholder="Enter date of birth"
                value={formData.dob}
                onChange={(e) =>
                  setFormData({ ...formData, dob: e.target.value })
                }
              />
            </div>
            {/* Role */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as Role })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role">
                    {formData.role}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Patient">Patient</SelectItem>
                  <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="Tech">Tech</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Staff ID (for staff roles) */}
            {formData.role !== 'Patient' && (
              <div className="space-y-2">
                <Label>Staff ID</Label>
                <Input
                  placeholder="Enter staff ID (e.g., khual123)"
                  value={formData.staffId}
                  onChange={(e) =>
                    setFormData({ ...formData, staffId: e.target.value })
                  }
                />
              </div>
            )}
            {/* Password */}
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </div>
            {/* Confirm Password */}
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" className="ml-2" onClick={handleAddUser}>
              Add User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Edit user details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Enter user name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            {/* Email */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="Enter user email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            {/* Phone */}
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="Enter user phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            {/* DOB */}
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                placeholder="Enter date of birth"
                value={formData.dob}
                onChange={(e) =>
                  setFormData({ ...formData, dob: e.target.value })
                }
              />
            </div>
            {/* Role (locked) */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} disabled>
                <SelectTrigger>
                  <SelectValue>{formData.role}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Patient">Patient</SelectItem>
                  <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="Tech">Tech</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Role cannot be changed after user creation
              </p>
            </div>
            {/* Staff ID */}
            {formData.role !== 'Patient' && (
              <div className="space-y-2">
                <Label>Staff ID</Label>
                <Input
                  placeholder="Enter staff ID (e.g., PH-001, TC-001)"
                  value={formData.staffId}
                  onChange={(e) =>
                    setFormData({ ...formData, staffId: e.target.value })
                  }
                />
              </div>
            )}
            {/* New password (optional) */}
            <div className="space-y-2">
              <Label>New Password (optional)</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the current password.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" className="ml-2" onClick={handleEditUser}>
              Update User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE USER DIALOG */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="ml-2 text-destructive"
              onClick={handleDeleteUser}
            >
              Delete User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}