import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function TechDailyReports() {
  const todayStats = {
    verified: 34,
    rejected: 1,
    avgTime: '2.3m',
    accuracy: '97.1%',
  };

  const recentActivity = [
    {
      id: 1,
      time: '14:32',
      action: 'Verified',
      rxId: 'RX-1050',
      medication: 'Atorvastatin 10mg',
      status: 'approved',
    },
    {
      id: 2,
      time: '14:28',
      action: 'Verified',
      rxId: 'RX-1049',
      medication: 'Lisinopril 20mg',
      status: 'approved',
    },
    {
      id: 3,
      time: '14:15',
      action: 'Rejected',
      rxId: 'RX-1048',
      medication: 'Metformin 500mg',
      status: 'rejected',
      reason: 'Incorrect quantity',
    },
    {
      id: 4,
      time: '14:10',
      action: 'Verified',
      rxId: 'RX-1047',
      medication: 'Omeprazole 20mg',
      status: 'approved',
    },
    {
      id: 5,
      time: '14:05',
      action: 'Verified',
      rxId: 'RX-1046',
      medication: 'Amlodipine 5mg',
      status: 'approved',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Daily Reports</h1>
        <p className="text-muted-foreground">
          View your daily verification activity and performance metrics
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              Verified Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-600">{todayStats.verified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="size-4" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-red-600">{todayStats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="size-4" />
              Avg. Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{todayStats.avgTime}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              Accuracy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-600">{todayStats.accuracy}</div>
          </CardContent>
        </Card>
      </div>

      {/* Activity + weekly performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{activity.time}</span>
                        {activity.status === 'approved' ? (
                          <CheckCircle2 className="size-4 text-green-600" />
                        ) : (
                          <XCircle className="size-4 text-red-600" />
                        )}
                        <span
                          className={
                            activity.status === 'approved'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {activity.action}
                        </span>
                      </div>
                      <p className="font-semibold">{activity.rxId}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.medication}
                      </p>
                      {activity.reason && (
                        <p className="text-sm text-red-600 mt-1">
                          Reason: {activity.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Total Verified</span>
                <span className="font-semibold">187</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-green-600"
                  style={{ width: '85%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Accuracy Rate</span>
                <span className="font-semibold">98.2%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-green-600"
                  style={{ width: '98.2%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">On-Time Completion</span>
                <span className="font-semibold">95.5%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-green-600"
                  style={{ width: '95.5%' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}