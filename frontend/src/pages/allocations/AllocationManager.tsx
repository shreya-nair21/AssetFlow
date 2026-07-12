import { useState, useEffect } from 'react';
import { api, getCurrentUser } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Share2, Plus, ArrowRightLeft, UserCheck } from 'lucide-react';

export default function AllocationManager() {
  const currentUser = getCurrentUser();
  const [allocations, setAllocations] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [assetId, setAssetId] = useState('');
  const [userId, setUserId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [conditionNotesOut, setConditionNotesOut] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Transfer request states
  const [transferAssetId, setTransferAssetId] = useState('');
  const [transferToUserId, setTransferToUserId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [requestingTransfer, setRequestingTransfer] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assetsData, empsData, transData] = await Promise.all([
        api.get('/assets?limit=500'), // load all assets
        api.get('/setup/employees'),
        api.get('/allocations/transfers'),
      ]);

      const activeAllocations = assetsData.assets
        .filter((a: any) => a.status === 'ALLOCATED')
        .flatMap((a: any) => a.allocations.filter((al: any) => al.status === 'ACTIVE').map((al: any) => ({ ...al, asset: a })));

      setAllocations(activeAllocations);
      setAssets(assetsData.assets.filter((a: any) => a.status === 'AVAILABLE'));
      setEmployees(empsData.filter((e: any) => e.status === 'ACTIVE'));
      setTransfers(transData);
      setLoading(false);
    } catch {
      toast.error('Failed to query resource allocation ledger');
      setLoading(false);
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !userId) return;

    setSubmitting(true);
    try {
      await api.post('/allocations', {
        assetId,
        userId,
        expectedReturnDate: expectedReturnDate || null,
        conditionNotesOut,
      });

      toast.success('Asset allocated successfully');
      setAssetId('');
      setUserId('');
      setExpectedReturnDate('');
      setConditionNotesOut('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to allocate asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (allocationId: string) => {
    if (!confirm('Process check-in return for this asset? This resets asset status to AVAILABLE.')) return;
    try {
      await api.post(`/allocations/${allocationId}/return`, {
        conditionNotesIn: 'Returned in good condition.',
        assetCondition: 'GOOD',
      });
      toast.success('Asset returned successfully');
      fetchData();
    } catch {
      toast.error('Failed to process return');
    }
  };

  const handleTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAssetId || !transferToUserId) return;

    setRequestingTransfer(true);
    try {
      await api.post('/allocations/transfer-request', {
        assetId: transferAssetId,
        toUserId: transferToUserId,
        notes: transferNotes,
      });
      toast.success('Transfer request submitted for authorization');
      setTransferAssetId('');
      setTransferToUserId('');
      setTransferNotes('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit transfer request');
    } finally {
      setRequestingTransfer(false);
    }
  };

  const handleTransferAction = async (transferId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.post(`/allocations/transfers/${transferId}/action`, { action });
      toast.success(`Transfer request ${action.toLowerCase()}d`);
      fetchData();
    } catch {
      toast.error('Failed to process transfer authorization');
    }
  };

  if (loading) return <div className="text-center p-8">Loading allocations index...</div>;

  const isManager = currentUser.role === 'ADMIN' || currentUser.role === 'ASSET_MANAGER';

  // Find employee's assigned assets to populate transfer source select
  const myAllocations = allocations.filter((al: any) => al.userId === currentUser.id);

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Allocations & Transfers</h1>
        <p className="text-muted-foreground text-sm font-medium">Coordinate equipment assignments and authorize peer-to-peer transfers</p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted border border-border">
          <TabsTrigger value="active">Active Allocations</TabsTrigger>
          <TabsTrigger value="transfers">Transfer Requests</TabsTrigger>
          <TabsTrigger value="actions">Allocate / Request</TabsTrigger>
        </TabsList>

        {/* Tab 1: Active Allocations */}
        <TabsContent value="active" className="mt-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-md font-bold flex items-center gap-2">
                <UserCheck className="size-5 text-muted-foreground" />
                <span>Current Asset Handouts</span>
              </CardTitle>
              <CardDescription className="text-xs">Physical inventory currently in employee possession</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {allocations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-semibold">No active allocations currently logged.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Assigned Employee</TableHead>
                      <TableHead>Date Checked Out</TableHead>
                      <TableHead>Expected Return</TableHead>
                      {isManager && <TableHead className="text-right">Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((alloc) => (
                      <TableRow key={alloc.id} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-xs">{alloc.asset.assetTag}</TableCell>
                        <TableCell className="font-semibold text-xs truncate max-w-44">{alloc.asset.name}</TableCell>
                        <TableCell className="text-xs">{alloc.user.name}</TableCell>
                        <TableCell className="text-xs">{new Date(alloc.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs font-semibold">
                          {alloc.expectedReturnDate ? (
                            new Date(alloc.expectedReturnDate).toLocaleDateString()
                          ) : (
                            <span className="text-muted-foreground/60 italic">Permanent</span>
                          )}
                        </TableCell>
                        {isManager && (
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleReturn(alloc.id)}
                              className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] h-8"
                            >
                              Check-In
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Transfer Requests */}
        <TabsContent value="transfers" className="mt-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-md font-bold flex items-center gap-2">
                <ArrowRightLeft className="size-5 text-muted-foreground" />
                <span>Transfer Authorizations Queue</span>
              </CardTitle>
              <CardDescription className="text-xs">Employee-initiated handoff approvals</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transfers.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-semibold">No pending transfer authorization requests.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>From Employee</TableHead>
                      <TableHead>To Employee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-xs">{t.asset.assetTag}</TableCell>
                        <TableCell className="font-semibold text-xs truncate max-w-44">{t.asset.name}</TableCell>
                        <TableCell className="text-xs">{t.fromUser.name}</TableCell>
                        <TableCell className="text-xs">{t.toUser.name}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === 'APPROVED' ? 'secondary' : t.status === 'PENDING' ? 'outline' : 'destructive'} className="text-[10px] font-bold">
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {t.status === 'PENDING' && (isManager || currentUser.role === 'DEPT_HEAD') ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleTransferAction(t.id, 'APPROVE')}
                                className="bg-green-600 hover:bg-green-500 text-white text-[11px] h-8 px-3"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTransferAction(t.id, 'REJECT')}
                                className="text-red-500 border-red-500/20 hover:bg-red-500/10 text-[11px] h-8 px-3"
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Allocate (Managers) / Request (Employees) Form */}
        <TabsContent value="actions" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Manager Handout Form */}
            {isManager && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-md font-bold flex items-center gap-2">
                    <Plus className="size-5" />
                    <span>Allocate Available Asset</span>
                  </CardTitle>
                  <CardDescription className="text-xs">Hand out a physical item to an employee</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAllocate} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="asset" className="text-xs font-semibold">Select Equipment (Available Only)</Label>
                      <select
                        id="asset"
                        value={assetId}
                        onChange={(e) => setAssetId(e.target.value)}
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
                      <Label htmlFor="employee" className="text-xs font-semibold">Select Employee</Label>
                      <select
                        id="employee"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        required
                        className="px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none"
                      >
                        <option value="">-- Choose Employee --</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="retDate" className="text-xs font-semibold">Expected Return Date (Optional)</Label>
                      <Input
                        id="retDate"
                        type="date"
                        value={expectedReturnDate}
                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="notes" className="text-xs font-semibold">Condition Notes Out</Label>
                      <Input
                        id="notes"
                        placeholder="Pristine condition, power cable included"
                        value={conditionNotesOut}
                        onChange={(e) => setConditionNotesOut(e.target.value)}
                      />
                    </div>

                    <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 mt-2">
                      {submitting ? 'Allocating...' : 'Handout Asset'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Employee Handoff/Transfer Request Form */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-md font-bold flex items-center gap-2">
                  <Share2 className="size-5" />
                  <span>Request Peer-to-Peer Handoff</span>
                </CardTitle>
                <CardDescription className="text-xs">Hand over one of your assigned items to a coworker</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTransferRequest} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="txAsset" className="text-xs font-semibold">Select Your Assigned Asset</Label>
                    <select
                      id="txAsset"
                      value={transferAssetId}
                      onChange={(e) => setTransferAssetId(e.target.value)}
                      required
                      className="px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none"
                    >
                      <option value="">-- Choose Equipment --</option>
                      {currentUser.role === 'ADMIN' || currentUser.role === 'ASSET_MANAGER' ? (
                        // Managers can select ANY allocated asset to transfer
                        allocations.map((al) => (
                          <option key={al.asset.id} value={al.asset.id}>
                            {al.asset.name} (Held by: {al.user.name})
                          </option>
                        ))
                      ) : (
                        // Employees can only select assets allocated to them
                        myAllocations.map((al) => (
                          <option key={al.asset.id} value={al.asset.id}>
                            {al.asset.name} ({al.asset.assetTag})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="txTo" className="text-xs font-semibold">Handoff Recipient Employee</Label>
                    <select
                      id="txTo"
                      value={transferToUserId}
                      onChange={(e) => setTransferToUserId(e.target.value)}
                      required
                      className="px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none"
                    >
                      <option value="">-- Choose Colleague --</option>
                      {employees.filter(e => e.id !== currentUser.id).map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="txNotes" className="text-xs font-semibold">Transfer Justification Notes</Label>
                    <Input
                      id="txNotes"
                      placeholder="Jane needs this workstation for the upcoming project sprint."
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                    />
                  </div>

                  <Button type="submit" disabled={requestingTransfer} className="bg-slate-800 text-slate-100 hover:bg-slate-700 font-semibold h-11 mt-2">
                    {requestingTransfer ? 'Submitting request...' : 'Submit Transfer Handoff'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
