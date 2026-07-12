import { useState, useEffect } from 'react';
import { api, getCurrentUser } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ClipboardCheck, Plus, Search, ChevronRight } from 'lucide-react';

export default function AuditManager() {
  const currentUser = getCurrentUser();
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLaunchDialog, setShowLaunchDialog] = useState(false);

  // Verification states
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [verifyStatus, setVerifyStatus] = useState<'VERIFIED' | 'MISSING' | 'DAMAGED'>('VERIFIED');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [savingVerify, setSavingVerify] = useState(false);

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      const data = await api.get('/audits/cycles');
      setCycles(data);
      setLoading(false);
    } catch {
      toast.error('Failed to query system audits');
      setLoading(false);
    }
  };

  const fetchCycleItems = async (cycle: any) => {
    try {
      const data = await api.get(`/audits/cycles/${cycle.id}/items`);
      setSelectedCycle(cycle);
      setAuditItems(data);
    } catch {
      toast.error('Failed to load audit items');
    }
  };

  const handleLaunchCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) return;

    setSubmitting(true);
    try {
      await api.post('/audits/cycles', {
        title,
        description,
        startDate,
        endDate,
      });

      toast.success('Audit cycle launched! Items generated.');
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setShowLaunchDialog(false);
      fetchCycles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start audit cycle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSavingVerify(true);
    try {
      await api.post(`/audits/items/${selectedItem.id}/verify`, {
        status: verifyStatus,
        notes: verifyNotes,
      });

      toast.success('Asset verification logged');
      setSelectedItem(null);
      setVerifyNotes('');
      // Refresh items
      fetchCycleItems(selectedCycle);
    } catch {
      toast.error('Failed to log verification');
    } finally {
      setSavingVerify(false);
    }
  };

  const handleCloseCycle = async (cycleId: string) => {
    if (!confirm('Close this audit cycle? This compiles discrepancy statistics.')) return;
    try {
      await api.post(`/audits/cycles/${cycleId}/close`, {});
      toast.success('Audit cycle completed and closed');
      // Reset details view
      setSelectedCycle(null);
      setAuditItems([]);
      fetchCycles();
    } catch {
      toast.error('Failed to close audit run');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED': return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none font-bold">Verified</Badge>;
      case 'MISSING': return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-none font-bold animate-pulse">Missing</Badge>;
      case 'DAMAGED': return <Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/5 font-bold">Damaged</Badge>;
      case 'PENDING':
      default: return <Badge variant="outline" className="text-slate-400">Pending</Badge>;
    }
  };

  // Filter audit items by search query
  const filteredItems = auditItems.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.asset.name.toLowerCase().includes(query) ||
      item.asset.assetTag.toLowerCase().includes(query) ||
      item.asset.category.name.toLowerCase().includes(query) ||
      item.status.toLowerCase().includes(query)
    );
  });

  if (loading) return <div className="text-center p-8">Loading asset audits registry...</div>;

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Audit Cycles</h1>
          <p className="text-muted-foreground text-sm font-medium">Verify physical assets inventory integrity and log discrepancies</p>
        </div>

        {/* Launch Audit Run (ADMIN only) */}
        {isAdmin && (
          <Dialog open={showLaunchDialog} onOpenChange={setShowLaunchDialog}>
            <DialogTrigger render={
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 px-5 gap-2">
                <Plus className="size-5 text-white" />
                <span>Launch Audit Run</span>
              </Button>
            } />
            <DialogContent className="max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Start Compliance Audit</DialogTitle>
                <DialogDescription className="text-xs">Initializes verification records for all active system hardware</DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleLaunchCycle} className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auditTitle" className="text-xs font-semibold">Audit Title</Label>
                  <Input
                    id="auditTitle"
                    placeholder="e.g. Q3 2026 Hardware Audit"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auditDesc" className="text-xs font-semibold">Description</Label>
                  <Input
                    id="auditDesc"
                    placeholder="Brief description of instructions"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auditStart" className="text-xs font-semibold">Start Date</Label>
                  <Input
                    id="auditStart"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auditEnd" className="text-xs font-semibold">Compliance Deadline Date</Label>
                  <Input
                    id="auditEnd"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 mt-2">
                  {submitting ? 'Launching Cycle...' : 'Start Cycle & Generate Items'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Audit Cycles List */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader>
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <ClipboardCheck className="size-5 text-muted-foreground" />
              <span>Audit Run Records</span>
            </CardTitle>
            <CardDescription className="text-xs font-medium">History of launched verification cycles</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {cycles.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-semibold">No audit cycles generated.</div>
            ) : (
              <div className="flex flex-col">
                {cycles.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => fetchCycleItems(c)}
                    className={`p-4 border-b border-border text-left hover:bg-muted/30 transition-colors flex items-center justify-between ${selectedCycle?.id === c.id ? 'bg-muted/50' : ''}`}
                  >
                    <div className="space-y-1 pr-3 flex-1 min-w-0">
                      <p className="font-bold text-xs truncate text-foreground">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Deadline: {new Date(c.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Badge variant={c.status === 'ACTIVE' ? 'secondary' : 'outline'} className="text-[9px] uppercase tracking-wide font-bold">
                        {c.status}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground/60" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Selected Cycle Items Directory */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedCycle ? (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-md font-bold">{selectedCycle.title}</CardTitle>
                    {selectedCycle.status === 'ACTIVE' && isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCloseCycle(selectedCycle.id)}
                        className="text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-600 h-8"
                      >
                        Close & Summary
                      </Button>
                    )}
                  </div>
                  <CardDescription className="text-xs">Verification checks list. Items: {auditItems.length}</CardDescription>
                </div>

                {/* Items Search */}
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, barcode, state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-xs">{item.asset.assetTag}</TableCell>
                        <TableCell className="font-semibold text-xs truncate max-w-44">{item.asset.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.asset.category.name}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          {selectedCycle.status === 'ACTIVE' && (
                            <Dialog open={selectedItem?.id === item.id} onOpenChange={(open: boolean) => !open && setSelectedItem(null)}>
                              <DialogTrigger render={
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setSelectedItem(item); setVerifyStatus(item.status === 'PENDING' ? 'VERIFIED' : item.status); setVerifyNotes(item.notes || ''); }}
                                  className="h-8 text-[11px] font-bold text-blue-600 hover:text-blue-500"
                                >
                                  Verify
                                </Button>
                              } />
                              <DialogContent className="max-w-md bg-card border-border">
                                <DialogHeader>
                                  <DialogTitle className="text-sm font-bold">Verify Asset: {item.asset.name}</DialogTitle>
                                  <DialogDescription className="text-xs">Log physical checkout state for {item.asset.assetTag}</DialogDescription>
                                </DialogHeader>
                                
                                <form onSubmit={handleVerifyItem} className="flex flex-col gap-4 mt-2">
                                  <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="auditStatus" className="text-xs font-semibold">Verification State</Label>
                                    <select
                                      id="auditStatus"
                                      value={verifyStatus}
                                      onChange={(e) => setVerifyStatus(e.target.value as any)}
                                      className="px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none"
                                    >
                                      <option value="VERIFIED">VERIFIED - Present & good</option>
                                      <option value="MISSING">MISSING - Disappeared / Lost</option>
                                      <option value="DAMAGED">DAMAGED - Broken / Needs repair</option>
                                    </select>
                                  </div>

                                  <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="auditNotes" className="text-xs font-semibold">Auditor Log Notes</Label>
                                    <Input
                                      id="auditNotes"
                                      placeholder="e.g. Scratched chassis, verified at cubicle 4A"
                                      value={verifyNotes}
                                      onChange={(e) => setVerifyNotes(e.target.value)}
                                    />
                                  </div>

                                  <Button type="submit" disabled={savingVerify} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-10 mt-2">
                                    {savingVerify ? 'Logging...' : 'Save Verification'}
                                  </Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border p-8 text-center flex flex-col items-center justify-center gap-3">
              <ClipboardCheck className="size-12 text-muted-foreground/35 animate-bounce" />
              <div>
                <h3 className="font-bold text-sm text-foreground">No Audit Cycle Selected</h3>
                <p className="text-xs text-muted-foreground/80 mt-1 max-w-sm">Select an audit cycle from the records list to load verification items.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
