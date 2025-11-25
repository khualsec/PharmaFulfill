import { useState, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navigation from './Navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Briefcase } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

// Only Pharmacist + Tech can request access.
// Admin will be hard-coded in the DB.
type StaffRole = 'Pharmacist' | 'Tech';

export default function SignUpStaff() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    role: 'Pharmacist' as StaffRole,
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRoleChange = (value: StaffRole) => {
    setFormData(prev => ({
      ...prev,
      role: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    // signup() will treat this as a staff signup (no "dob" field)
    const success = await signup(formData);
    setLoading(false);

    if (success) {
      // Redirect based on chosen staff role
      if (formData.role === 'Pharmacist') {
        // Pharmacist logs in on patient/pharmacist login screen
        navigate('/login/patient-pharmacist');
      } else {
        // Tech logs in on tech/admin login screen
        navigate('/login/tech-admin');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Briefcase className="size-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl mb-2">Request Staff Access</h1>
            <p className="text-muted-foreground">
              Submit your information to request access as a technician or pharmacist.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Staff Access Request</CardTitle>
              <CardDescription>
                An admin will review your request before access is granted.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Lebron James"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={value => handleRoleChange(value as StaffRole)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                      <SelectItem value="Tech">Technician</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="khual@example.com"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create a password"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Retype password"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading
                    ? 'Submitting request...'
                    : 'Submit staff access request'}
                </Button>

                <div className="mt-4 text-center space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Already approved as staff?{' '}
                    <Link
                      to="/login/tech-admin"
                      className="text-primary hover:underline"
                    >
                      Log in here
                    </Link>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <Link to="/signup" className="text-primary hover:underline">
                      ← Back to signup options
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}