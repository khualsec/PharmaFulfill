import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MapPin, Phone, Clock, Navigation } from 'lucide-react';

const pharmacyLocations = [
  {
    id: 1,
    name: 'PharmaFulfill Downtown',
    address: '123 Main St, Nashville, TN 37201',
    phone: '(615) 555-0101',
    hours: 'Mon-Fri: 8AM-8PM, Sat-Sun: 9AM-6PM',
    distance: '2.3 miles'
  },
  {
    id: 2,
    name: 'PharmaFulfill West End',
    address: '456 West End Ave, Nashville, TN 37203',
    phone: '(615) 555-0102',
    hours: 'Mon-Fri: 9AM-9PM, Sat-Sun: 10AM-7PM',
    distance: '4.1 miles'
  },
  {
    id: 3,
    name: 'PharmaFulfill Green Hills',
    address: '789 Hillsboro Pike, Nashville, TN 37215',
    phone: '(615) 555-0103',
    hours: 'Mon-Sun: 8AM-10PM',
    distance: '5.8 miles'
  },
  {
    id: 4,
    name: 'PharmaFulfill East Nashville',
    address: '321 Gallatin Ave, Nashville, TN 37206',
    phone: '(615) 555-0104',
    hours: 'Mon-Fri: 8AM-7PM, Sat-Sun: 9AM-5PM',
    distance: '6.2 miles'
  }
];

export default function FindPharmacy() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Find Pharmacy</h1>
        <p className="text-muted-foreground">
          Locate PharmaFulfill stores near you
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input 
              placeholder="Enter your ZIP code or city..."
              className="flex-1"
            />
            <Button>
              <Navigation className="size-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {pharmacyLocations.map((location) => (
          <Card key={location.id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{location.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Distance: {location.distance}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="size-4 mt-0.5 text-muted-foreground" />
                    <span>{location.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <span>{location.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-muted-foreground" />
                    <span>{location.hours}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm">
                    Get Directions
                  </Button>
                  <Button size="sm" variant="outline">
                    Set as Preferred
                  </Button>
                  <Button size="sm" variant="outline">
                    Call Store
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
