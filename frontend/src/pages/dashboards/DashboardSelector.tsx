import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getCurrentUser } from '@/lib/api';
import { 
  Package, 
  UserCheck, 
  Wrench, 
  Calendar, 
  ArrowRightLeft, 
  AlertOctagon, 
  History,
  Plus,
  AlertTriangle,
  Building,
  Tags,
  Users
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardSelector() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    api.get('/analytics')
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 rounded-xs bg-secondary border border-border animate-pulse" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Aggregating ERP telemetry...</span>
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-center p-8">Failed to load system dashboard telemetry.</div>;

  const { counters, departmentStats, categoryStats, recentActivity, overdueList } = data;
  const role = user.role;

  // Colors for charts
  const PIE_COLORS = ['#17171c', '#003c33', '#ff7759', '#75758a', '#eeece7'];

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome header with stats */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome Back, {user.name}</h1>
        <p className="text-muted-foreground text-sm font-medium">
          Here is a system performance summary for the <span className="text-foreground font-bold">{user.role.replace('_', ' ')}</span> portal.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-none bg-card border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Available Assets</span>
              <p className="text-3xl font-bold tracking-tight text-foreground">{counters.availableAssets}</p>
            </div>
            <div className="size-10 rounded-xs bg-secondary text-foreground flex items-center justify-center border border-border">
              <Package className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none bg-card border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Allocated Assets</span>
              <p className="text-3xl font-bold tracking-tight text-foreground">{counters.allocatedAssets}</p>
            </div>
            <div className="size-10 rounded-xs bg-secondary text-foreground flex items-center justify-center border border-border">
              <UserCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none bg-card border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">In Maintenance</span>
              <p className="text-3xl font-bold tracking-tight text-foreground">{counters.maintenanceAssets}</p>
            </div>
            <div className="size-10 rounded-xs bg-secondary text-foreground flex items-center justify-center border border-border">
              <Wrench className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none bg-card border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Active Bookings</span>
              <p className="text-3xl font-bold tracking-tight text-foreground">{counters.activeBookings}</p>
            </div>
            <div className="size-10 rounded-xs bg-secondary text-foreground flex items-center justify-center border border-border">
              <Calendar className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row: Quick Actions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions Panel */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader>
            <CardTitle className="text-md font-bold">Quick Administration Actions</CardTitle>
            <CardDescription className="text-xs">Rapidly launch ERP tasks and workflows</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {role === 'ADMIN' && (
              <>
                <Link to="/setup/employees" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2.5 h-11 w-full")}>
                  <Users className="size-4.5" />
                  <span>Manage Employee Directory</span>
                </Link>
                <Link to="/setup/categories" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2.5 h-11 w-full")}>
                  <Tags className="size-4.5" />
                  <span>Configure Asset Categories</span>
                </Link>
                <Link to="/setup/departments" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2.5 h-11 w-full")}>
                  <Building className="size-4.5" />
                  <span>Configure Departments</span>
                </Link>
                <Link to="/audits" className={cn(buttonVariants(), "justify-start gap-2.5 h-11 w-full bg-primary hover:opacity-90 text-white")}>
                  <Plus className="size-4.5 text-white" />
                  <span>Start New Audit Cycle</span>
                </Link>
              </>
            )}

            {role === 'ASSET_MANAGER' && (
              <>
                <Link to="/assets" className={cn(buttonVariants(), "justify-start gap-2.5 h-11 w-full bg-primary hover:opacity-90 text-white")}>
                  <Plus className="size-4.5 text-white" />
                  <span>Register Physical Asset</span>
                </Link>
                <Link to="/allocations" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2.5 h-11 w-full")}>
                  <ArrowRightLeft className="size-4.5" />
                  <span>Process Allocation Transfer</span>
                </Link>
                <Link to="/maintenance" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2.5 h-11 w-full")}>
                  <Wrench className="size-4.5" />
                  <span>Assign Repair Technician</span>
                </Link>
              </>
            )}

            {role === 'DEPT_HEAD' && (
              <>
                <Link to="/bookings" className={cn(buttonVariants(), "justify-start gap-2.5 h-11 w-full bg-primary hover:opacity-90 text-white")}>
                  <Calendar className="size-4.5 text-white" />
                  <span>Reserve Department Resource</span>
                </Link>
                <Link to="/allocations" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2.5 h-11 w-full")}>
                  <ArrowRightLeft className="size-4.5" />
                  <span>Review Staff Transfers</span>
                </Link>
              </>
            )}

            {role === 'EMPLOYEE' && (
              <>
                <Link to="/bookings" className={cn(buttonVariants(), "justify-start gap-2.5 h-11 w-full bg-primary hover:opacity-90 text-white")}>
                  <Calendar className="size-4.5 text-white" />
                  <span>Book Conference Room</span>
                </Link>
                <Link to="/maintenance" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2.5 h-11 w-full")}>
                  <Wrench className="size-4.5" />
                  <span>Report Asset Damage</span>
                </Link>
                <Link to="/assets" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2.5 h-11 w-full")}>
                  <ArrowRightLeft className="size-4.5" />
                  <span>Initiate Transfer Request</span>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* System Overdue Returns Alerts */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-md font-bold flex items-center gap-2">
                  <AlertTriangle className="size-5 text-amber-500" />
                  <span>Pending Asset Returns / Overdue</span>
                </CardTitle>
                <CardDescription className="text-xs">Physical allocations exceeding return deadlines</CardDescription>
              </div>
              {counters.overdueReturns > 0 && (
                <Badge variant="destructive" className="animate-pulse">{counters.overdueReturns} Overdue</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {overdueList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
                <AlertOctagon className="size-8 text-muted-foreground/50" />
                <span className="text-xs font-semibold">No overdue asset returns found. Good compliance!</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Tag</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Expected Return</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueList.map((alloc: any) => (
                    <TableRow key={alloc.id} className="hover:bg-muted/30">
                      <TableCell className="font-bold text-xs">{alloc.asset.assetTag}</TableCell>
                      <TableCell className="font-medium text-xs truncate max-w-44">{alloc.asset.name}</TableCell>
                      <TableCell className="text-xs">{alloc.user.name}</TableCell>
                      <TableCell className="text-xs text-red-500 font-semibold">
                        {new Date(alloc.expectedReturnDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row: BI Reporting Charts (Admin/Manager only) */}
      {(role === 'ADMIN' || role === 'ASSET_MANAGER') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Department allocation utilization bar chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-md font-bold">Active Allocations by Department</CardTitle>
              <CardDescription className="text-xs">Quantity of checked-out assets per organization division</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9d9dd" />
                  <XAxis dataKey="name" stroke="#75758a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#75758a" fontSize={11} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="allocatedAssets" fill="#003c33" radius={[4, 4, 0, 0]} name="Allocated Assets" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Pie Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-md font-bold">Asset Category Distribution</CardTitle>
              <CardDescription className="text-xs">Classification breakdown of physical hardware</CardDescription>
            </CardHeader>
            <CardContent className="h-72 flex items-center justify-center">
              {categoryStats.length === 0 ? (
                <span className="text-xs text-muted-foreground font-semibold">No category statistics available.</span>
              ) : (
                <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryStats}
                          dataKey="assetCount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={false}
                        >
                           {categoryStats.map((_: any, index: number) => (
                             <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                           ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {categoryStats.map((entry: any, index: number) => (
                      <div key={entry.name} className="flex items-center gap-2.5">
                        <span 
                          className="size-3.5 rounded-full" 
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} 
                        />
                        <span className="text-xs font-bold text-foreground">{entry.name}</span>
                        <span className="text-xs text-muted-foreground">({entry.assetCount})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Row: Recent Activity Logs */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-md font-bold flex items-center gap-2">
            <History className="size-5 text-muted-foreground" />
            <span>Audit History & Activity Logs</span>
          </CardTitle>
          <CardDescription className="text-xs">Continuous ledger tracking asset state modifications</CardDescription>
        </CardHeader>
        <CardContent className="p-0 max-h-96 overflow-y-auto">
          {recentActivity.length === 0 ? (
            <div className="text-center p-8 text-xs text-muted-foreground font-semibold">No system activity logged yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Action Code</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((log: any) => {
                  let detailsObj = {};
                  try {
                    detailsObj = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                  } catch {}

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{log.user.name}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="border-accent/30 text-accent font-bold uppercase tracking-wider text-[9px] px-2 py-0.5">
                          {log.action.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-sm">
                        {JSON.stringify(detailsObj).replace(/[{}"]/g, ' ')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
