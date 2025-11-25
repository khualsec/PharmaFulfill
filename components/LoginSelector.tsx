import { Link } from 'react-router-dom';
import Navigation from './Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { User, ShieldCheck } from 'lucide-react';

export default function LoginSelector() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl mb-4">Welcome Back to PharmaFulfill</h1>
          <p className="text-xl text-muted-foreground">
            Please select your login type to continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <User className="size-16 text-primary mx-auto mb-4" />
              <CardTitle>Patient / Pharmacist</CardTitle>
              <CardDescription>
                Login with your email and password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="w-full" asChild>
                <Link to="/login/patient-pharmacist">Continue</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <ShieldCheck className="size-16 text-primary mx-auto mb-4" />
              <CardTitle>Technician / Admin</CardTitle>
              <CardDescription>
                Login with your email/username and password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="w-full" asChild>
                <Link to="/login/tech-admin">Continue</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
