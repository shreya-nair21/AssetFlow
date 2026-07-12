import { useState, useEffect } from 'react';
import { api, getCurrentUser } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Plus, DoorOpen, Car, Monitor } from 'lucide-react';

export default function ResourceBooking() {
  const currentUser = getCurrentUser();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [resourceName, setResourceName] = useState('Conference Room Alpha');
  const [resourceType, setResourceType] = useState('ROOM');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Available resources fallback list
  const fallbackList = [
    { name: 'Conference Room Alpha', type: 'ROOM', icon: DoorOpen },
    { name: 'Executive Meeting Room B', type: 'ROOM', icon: DoorOpen },
    { name: 'Tesla Model 3 (Logistics)', type: 'VEHICLE', icon: Car },
    { name: 'Epson Pro Projector 4K', type: 'EQUIPMENT', icon: Monitor },
    { name: 'Portable AV Screen B', type: 'EQUIPMENT', icon: Monitor },
  ];

  const [resources, setResources] = useState<any[]>(fallbackList);

  useEffect(() => {
    fetchBookings();
    fetchResources();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await api.get('/bookings');
      setBookings(data);
      setLoading(false);
    } catch {
      toast.error('Failed to load resource schedules');
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const data = await api.get('/assets?isBookable=true');
      if (data && data.assets && data.assets.length > 0) {
        const mapped = data.assets.map((asset: any) => {
          let type = 'EQUIPMENT';
          let icon = Monitor;
          const catName = asset.category?.name?.toUpperCase() || '';
          if (catName.includes('ROOM')) {
            type = 'ROOM';
            icon = DoorOpen;
          } else if (catName.includes('VEHICLE') || catName.includes('CAR')) {
            type = 'VEHICLE';
            icon = Car;
          }
          return { name: asset.name, type, icon };
        });
        setResources(mapped);
        setResourceName(mapped[0].name);
        setResourceType(mapped[0].type);
      }
    } catch {
      // Fallback already set
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceName || !startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      toast.error('Start time must be before the end time');
      return;
    }

    // Client-side conflict checker
    const localConflict = bookings.find((b) => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      return (
        b.resourceName === resourceName &&
        b.status !== 'CANCELLED' &&
        bStart < end &&
        bEnd > start
      );
    });

    if (localConflict) {
      toast.error(`Schedule conflict! Already reserved by ${localConflict.user.name} from ${new Date(localConflict.startDate).toLocaleTimeString()} to ${new Date(localConflict.endDate).toLocaleTimeString()}`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/bookings', {
        resourceName,
        resourceType,
        startDate,
        endDate,
      });

      toast.success(`Reserved "${resourceName}" successfully!`);
      setStartDate('');
      setEndDate('');
      fetchBookings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking reservation?')) return;
    try {
      await api.put(`/bookings/${bookingId}/cancel`, {});
      toast.success('Reservation cancelled successfully');
      fetchBookings();
    } catch {
      toast.error('Failed to cancel reservation');
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'ROOM': return <DoorOpen className="size-5 text-blue-500" />;
      case 'VEHICLE': return <Car className="size-5 text-green-500" />;
      case 'EQUIPMENT': return <Monitor className="size-5 text-indigo-500" />;
      default: return <CalendarIcon className="size-5" />;
    }
  };

  if (loading) return <div className="text-center p-8">Loading shared schedules...</div>;

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Resource Scheduler</h1>
        <p className="text-muted-foreground text-sm font-medium">Reserve shared meeting rooms, transit vehicles, and media equipment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Book Resource Form */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader>
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <Plus className="size-5" />
              <span>Reserve Shared Resource</span>
            </CardTitle>
            <CardDescription className="text-xs">Schedule a timeslot. Overlap protection is fully automated.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBooking} className="flex flex-col gap-4">
              {/* Resource Name Select */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="resName" className="text-xs font-semibold">Select Resource</Label>
                <select
                  id="resName"
                  value={resourceName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setResourceName(val);
                    const selected = resources.find(r => r.name === val);
                    if (selected) setResourceType(selected.type);
                  }}
                  required
                  className="px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {resources.map((res) => (
                    <option key={res.name} value={res.name}>{res.name} ({res.type})</option>
                  ))}
                </select>
              </div>

              {/* Start Date Time */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="start" className="text-xs font-semibold">Start Date & Time</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e: any) => setStartDate(e.target.value)}
                  required
                />
              </div>

              {/* End Date Time */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="end" className="text-xs font-semibold">End Date & Time</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e: any) => setEndDate(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={submitting} className="bg-primary hover:opacity-90 text-white font-semibold h-11 mt-2">
                {submitting ? 'Confirming...' : 'Reserve Timeslot'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Bookings Scheduler Board */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-md font-bold flex items-center gap-2">
                <CalendarIcon className="size-5 text-muted-foreground" />
                <span>Scheduler Timeline Calendar</span>
              </CardTitle>
              <CardDescription className="text-xs">Active bookings listed chronologically</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {bookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-semibold">No resource schedules reserved.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Reserved By</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-xs flex items-center gap-2">
                        {getResourceIcon(b.resourceType)}
                        <span>{b.resourceName}</span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{b.user.name}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(b.startDate).toLocaleDateString()} {new Date(b.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(b.endDate).toLocaleDateString()} {new Date(b.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={b.status === 'APPROVED' ? 'secondary' : b.status === 'CANCELLED' ? 'outline' : 'outline'} className="text-[10px]">
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {b.status !== 'CANCELLED' && (b.userId === currentUser.id || currentUser.role === 'ADMIN') ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelBooking(b.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-[11px] h-8"
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 italic">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
