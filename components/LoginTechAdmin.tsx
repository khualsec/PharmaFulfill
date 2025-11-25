// components/LoginTechAdmin.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Navigation from "./Navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ShieldCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type StaffRole = "Tech" | "Admin";

export default function LoginTechAdmin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("Tech");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const ok = await login(identifier, password, role);
      if (!ok) return;

      if (role === "Tech") {
        navigate("/dashboard/tech");
      } else {
        navigate("/dashboard/admin");
      }
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <ShieldCheck className="size-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl mb-2">Welcome Back, Staff!</h1>
            <p className="text-muted-foreground">
              Access your PharmaFulfill staff dashboard
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Technician / Admin Login</CardTitle>
              <CardDescription>Enter your credentials to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Login As</Label>
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as StaffRole)}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tech">Technician</SelectItem>
                      <SelectItem value="Admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or Username</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="admin@pharmafulfill.test or khual"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Need staff access?{" "}
                  <Link to="/signup/staff" className="text-primary hover:underline">
                    Request account
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  <Link to="/login" className="text-primary hover:underline">
                    ← Back to login options
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}