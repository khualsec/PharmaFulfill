import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Bell } from 'lucide-react';

export default function PatientNotifications() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Notifications</h1>
        <p className="text-muted-foreground">
          Stay updated with prescription alerts and pharmacy messages
        </p>
      </div>

      {/* Placeholder since feature is not implemented yet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            The notifications system is not enabled yet.  
            This feature will appear in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}