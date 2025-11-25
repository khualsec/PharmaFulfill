import { Link } from 'react-router-dom';
import Navigation from './Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { User, Briefcase } from 'lucide-react';

export default function SignUpSelector() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl mb-4">Join PharmaFulfill</h1>
          <p className="text-xl text-muted-foreground">
            Create your account to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <User className="size-16 text-primary mx-auto mb-4" />
              <CardTitle>Patient Account</CardTitle>
              <CardDescription>
                Sign up to manage your prescriptions and refills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="w-full" asChild>
                <Link to="/signup/patient">Create Patient Account</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Briefcase className="size-16 text-primary mx-auto mb-4" />
              <CardTitle>Staff Account</CardTitle>
              <CardDescription>
                Request access as Pharmacist or Technician
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="w-full" asChild>
                <Link to="/signup/staff">Request Staff Access</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}