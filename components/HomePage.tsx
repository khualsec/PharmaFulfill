import { Link } from "react-router-dom";
import Navigation from "./Navigation";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Package,
  Users,
  FileText,
  Send,
  CreditCard,
  BarChart3,
  MapPin,
} from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Medication Management",
    description:
      "Track inventory, expiry dates, and stock levels for all medications in real-time.",
  },
  {
    icon: Users,
    title: "Patient Records",
    description:
      "Securely manage patient profiles, prescription history, and medication allergies.",
  },
  {
    icon: FileText,
    title: "Prescription Processing",
    description:
      "Efficiently process and fulfill prescriptions from doctors with digital workflows.",
  },
  {
    icon: Send,
    title: "Digital Prescriptions",
    description:
      "Doctors can submit prescriptions electronically for faster processing.",
  },
  {
    icon: CreditCard,
    title: "Sales & Billing",
    description:
      "Streamlined point-of-sale system with insurance claim processing.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Generate comprehensive reports on sales, inventory, and patient trends.",
  },
  {
    icon: MapPin,
    title: "Store Availability Lookup",
    description:
      "Check medication availability across multiple pharmacy locations in real-time.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl mb-6">
            Welcome to PharmaFulfill
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Your complete pharmacy database management solution.
            Streamline operations, improve patient care, and
            optimize your pharmacy workflow.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl text-center mb-12">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <feature.icon className="size-12 text-primary mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}