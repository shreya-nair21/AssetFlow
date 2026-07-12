import { useState, useEffect } from 'react';
import { api, getCurrentUser } from '@/lib/api';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CheckCircle, Hammer, ChevronRight, UserCog } from 'lucide-react';

export default function MaintenanceDashboard() {
  const currentUser = getCurrentUser();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Request Form states
  const [assetId, setAssetId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  // Manage states
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [techId, setTechId] = useState('');
  const [cost, setCost] = useState('');
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reqsData, assetsData, empsData] = await Promise.all([
        api.get('/maintenance'),
        api.get('/assets?limit=500'),
        api.get('/setup/employees'),
      ]);
      setRequests(reqsData);
      setAssets(assetsData.assets);
      // Technicians are employees in ops or any employee for assignment in this prototype
      setTechnicians(empsData.filter((e: any) => e.status === 'ACTIVE'));
      setLoading(false);
    } catch {
      toast.error('Failed to load maintenance records');
      setLoading(false);
    }
  };

  const handleRaiseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !title || !description) return;

    setSubmitting(true);
    try {
      await api.post('/maintenance', {
        assetId,
        title,
        description,
        priority,
      });

      toast.success('Maintenance ticket raised successfully');
      setAssetId('');
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setShowRequestDialog(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit maintenance ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (requestId: string, status: string, additional: any = {}) => {
    setActioning(true);
    try {
      await api.post(`/maintenance/${requestId}/action`, {
        status,
        ...additional,
      });
      toast.success(`Ticket status updated to ${status}`);
      setEditingRequestId(null);
      setTechId('');
      setCost('');
      fetchData();
    } catch {
      toast.error('Failed to process maintenance action');
    } finally {
      setActioning(false);
    }
  };

  const getPriorityBadge = (pri: string) => {
    switch (pri) {
      case 'CRITICAL': return <Badge variant="destructive" className="text-[9px] font-extrabold uppercase">Critical</Badge>;
      case 'HIGH': return <Badge variant="outline" className="text-red-500 border-red-500/20 bg-red-500/5 text-[9px] font-extrabold uppercase">High</Badge>;
      case 'MEDIUM': return <Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/5 text-[9px] font-extrabold uppercase">Medium</Badge>;
      case 'LOW':
      default: return <Badge variant="secondary" className="text-[9px] font-bold uppercase">Low</Badge>;
    }
  };

  const columns = [
    { title: 'Pending Approval', status: 'PENDING', bg: 'bg-slate-50 border-slate-200' },
    { title: 'Approved', status: 'APPROVED', bg: 'bg-blue-50/20 border-blue-100' },
    { title: 'Technician Assigned', status: 'TECHNICIAN_ASSIGNED', bg: 'bg-indigo-50/20 border-indigo-100' },
    { title: 'In Progress', status: 'IN_PROGRESS', bg: 'bg-amber-50/20 border-amber-100' },
    { title: 'Resolved', status: 'RESOLVED', bg: 'bg-green-50/20 border-green-100' },
  ];

  if (loading) return <div className="text-center p-8">Loading Kanban workflow boards...</div>;

  const isManager = currentUser.role === 'ADMIN' || currentUser.role === 'ASSET_MANAGER';

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Maintenance Kanban</h1>
          <p className="text-muted-foreground text-sm font-medium">Log repair tickets, manage budgets, assign technician contractors, and track repair tasks</p>
        </div>

        {/* Raise Request trigger */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 px-5 gap-2">
              <Plus className="size-5 text-white" />
              <span>Raise Damage Ticket</span>
            </Button>
          } />
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Submit Damage Report</DialogTitle>
              <DialogDescription className="text-xs">Report hardware breakdown to alert system technicians</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRaiseRequest} className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reqAsset" className="text-xs font-semibold">Select Damaged Equipment</Label>
                <select
                  id="reqAsset"
                  value={assetId}
                  onChange={(e: any) => setAssetId(e.target.value)}
                  required
                  className="px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none"
                >
                  <option value="">-- Choose Equipment --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reqTitle" className="text-xs font-semibold">Issue Summary (Title)</Label>
                <Input
                  id="reqTitle"
                  placeholder="e.g. Screen flickering, Keyboard keys stuck"
                  value={title}
                  onChange={(e: any) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reqDesc" className="text-xs font-semibold">Describe the defect in detail</Label>
                <Input
                  id="reqDesc"
                  placeholder="Details of what happens and when"
                  value={description}
                  onChange={(e: any) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reqPri" className="text-xs font-semibold">Severity Priority</Label>
                <select
                  id="reqPri"
                  value={priority}
                  onChange={(e: any) => setPriority(e.target.value)}
                  className="px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none"
                >
                  <option value="LOW">Low - General maintenance</option>
                  <option value="MEDIUM">Medium - Performance impaired</option>
                  <option value="HIGH">High - Work disrupted</option>
                  <option value="CRITICAL">Critical - Completely broken</option>
                </select>
              </div>

              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 mt-2">
                {submitting ? 'Submitting Report...' : 'Log Ticket'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Columns Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto min-h-[60vh] pb-4">
        {columns.map((col) => {
          const colRequests = requests.filter(r => r.status === col.status);

          return (
            <div key={col.status} className={`flex flex-col gap-4 p-4 border border-dashed rounded-2xl min-w-[220px] ${col.bg}`}>
              <div className="flex items-center justify-between border-b border-border/10 pb-2">
                <h3 className="font-bold text-xs text-foreground tracking-tight">{col.title}</h3>
                <Badge variant="secondary" className="text-[10px] size-5 flex items-center justify-center rounded-full font-bold">
                  {colRequests.length}
                </Badge>
              </div>

              {/* Request Cards stack */}
              <div className="flex flex-col gap-3 overflow-y-auto flex-1 max-h-[65vh]">
                {colRequests.map((req) => (
                  <Card key={req.id} className="border-border shadow hover:shadow-md transition-shadow bg-card p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-bold text-muted-foreground">{req.asset.assetTag}</span>
                      {getPriorityBadge(req.priority)}
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-xs leading-tight text-foreground">{req.title}</h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{req.description}</p>
                    </div>

                    <div className="text-[9px] text-muted-foreground/60 border-t border-border/50 pt-2 flex flex-col gap-1">
                      <span className="font-medium">Equipment: {req.asset.name}</span>
                      <span>Reporter: {req.reporter.name}</span>
                      {req.technician && <span>Tech: {req.technician.name}</span>}
                      {req.cost > 0 && <span className="font-semibold text-foreground">Estimated Cost: ${req.cost.toFixed(2)}</span>}
                    </div>

                    {/* Quick status action controls */}
                    {isManager && (
                      <div className="border-t border-border/50 pt-2 flex flex-col gap-2">
                        {req.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => handleAction(req.id, 'APPROVED')}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] h-7"
                          >
                            <ChevronRight className="size-3.5 mr-1" />
                            <span>Approve Ticket</span>
                          </Button>
                        )}

                        {req.status === 'APPROVED' && (
                          <div className="flex flex-col gap-1.5">
                            {editingRequestId === req.id ? (
                              <div className="flex flex-col gap-2">
                                <select
                                  value={techId}
                                  onChange={(e: any) => setTechId(e.target.value)}
                                  className="w-full px-2 py-1 bg-background border border-input rounded text-[10px] focus:outline-none"
                                >
                                  <option value="">Select Tech</option>
                                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <Input
                                  type="number"
                                  placeholder="Est cost"
                                  value={cost}
                                  onChange={(e: any) => setCost(e.target.value)}
                                  className="h-7 text-[10px]"
                                />
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleAction(req.id, 'TECHNICIAN_ASSIGNED', { technicianId: techId, cost })}
                                    className="flex-1 bg-indigo-600 text-white hover:bg-indigo-500 text-[9px] h-7"
                                    disabled={!techId || actioning}
                                  >
                                    Assign
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingRequestId(null)}
                                    className="text-[9px] h-7"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setEditingRequestId(req.id); setTechId(req.technicianId || ''); setCost(req.cost || ''); }}
                                className="w-full text-[10px] h-7 gap-1"
                              >
                                <UserCog className="size-3.5" />
                                <span>Assign Tech</span>
                              </Button>
                            )}
                          </div>
                        )}

                        {req.status === 'TECHNICIAN_ASSIGNED' && (
                          <Button
                            size="sm"
                            onClick={() => handleAction(req.id, 'IN_PROGRESS')}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-white text-[10px] h-7"
                          >
                            <Hammer className="size-3.5 mr-1" />
                            <span>Start Repair Work</span>
                          </Button>
                        )}

                        {req.status === 'IN_PROGRESS' && (
                          <Button
                            size="sm"
                            onClick={() => handleAction(req.id, 'RESOLVED')}
                            className="w-full bg-green-600 hover:bg-green-500 text-white text-[10px] h-7"
                          >
                            <CheckCircle className="size-3.5 mr-1" />
                            <span>Mark Resolved</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
