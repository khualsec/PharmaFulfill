import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { User, Mail, Phone, MapPin, Calendar, Shield } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

interface PatientProfile {
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

interface StoredUser {
  id: number;
  name: string;
  email: string;
  role: 'Patient' | 'Pharmacist' | 'Tech' | 'Admin';
}

function getStoredUser(): StoredUser | null {
  const keys = ['pharma-user', 'user'];

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.role) return parsed;
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

export default function MyProfile() {
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // password form state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    setStoredUser(u);

    if (u.role === 'Patient') {
      api
        .get<PatientProfile>(`/api/patients/${u.id}`)
        .then((res) => {
          if (res.ok && res.data) setPatientProfile(res.data);
          else setError('Unable to load profile.');
        })
        .catch(() => setError('Unable to load profile.'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const isPatient = storedUser?.role === 'Patient';
  const p = patientProfile;

  if (loading) return <p>Loading…</p>;
  if (!storedUser) return <p className="text-destructive">{error}</p>;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storedUser) return;

    if (!currentPwd || !newPwd || !confirmPwd) {
      toast('Please fill in all password fields.');
      return;
    }

    if (newPwd !== confirmPwd) {
      toast('New password and confirmation do not match.');
      return;
    }

    if (newPwd.length < 8) {
      toast('New password must be at least 8 characters.');
      return;
    }

    try {
      setChangingPwd(true);
      const res = await api.post('/api/auth/change-password', {
        userId: storedUser.id,
        role: storedUser.role,
        currentPassword: currentPwd,
        newPassword: newPwd,
      });

      if (res.ok) {
        toast('Password updated successfully.');
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
      } else {
        const msg = (res as any).error || 'Unable to change password.';
        toast(msg);
      }
    } catch {
      toast('Network error. Please try again.');
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">My Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={
                      isPatient ? p?.firstName || '' : storedUser.name.split(' ')[0]
                    }
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={
                      isPatient
                        ? p?.lastName || ''
                        : storedUser.name.split(' ').slice(1).join(' ')
                    }
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={isPatient ? p?.email || '' : storedUser.email || ''}
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  <Input value={isPatient ? p?.phone || '' : ''} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <Input type="date" value={isPatient && p?.dob ? p.dob : ''} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address (patients only) */}
          {isPatient && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="size-5" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input value={p?.address || ''} disabled />
              </CardContent>
            </Card>
          )}

          {/* Security – fully functional password change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleChangePassword}>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={changingPwd}>
                  {changingPwd ? 'Updating…' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right side summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPatient && p ? (
                <>
                  <div>
                    <Label>Age</Label>
                    <p className="font-semibold">{p.age ?? '—'}</p>
                  </div>
                  <div>
                    <Label>Total Prescriptions</Label>
                    <p className="font-semibold">{p.totalPrescriptions ?? 0}</p>
                  </div>
                  <div>
                    <Label>Active Prescriptions</Label>
                    <p className="font-semibold">{p.activePrescriptions ?? 0}</p>
                  </div>
                  <div>
                    <Label>Last Visit</Label>
                    <p className="font-semibold">
                      {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Role</Label>
                    <p className="font-semibold">{storedUser.role}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <p className="font-semibold text-green-600">Active</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {isPatient && p && (
            <Card>
              <CardHeader>
                <CardTitle>Insurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Provider</Label>
                  <p className="font-semibold">{p.insuranceProvider || '—'}</p>
                </div>
                <div>
                  <Label>Plan</Label>
                  <p className="font-semibold">{p.insurancePlan || '—'}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}