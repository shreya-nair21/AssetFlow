import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getCurrentUser } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, 
  History, 
  QrCode,
  MapPin,
  CircleDollarSign,
  ClipboardList
} from 'lucide-react';

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const currentUser = getCurrentUser();
  
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Editing forms
  const [isEditing, setIsEditing] = useState(false);
  const [editLocation, setEditLocation] = useState('');
  const [editCondition, setEditCondition] = useState('');
  const [editIsBookable, setEditIsBookable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAssetDetails();
  }, [id]);

  const fetchAssetDetails = async () => {
    try {
      const data = await api.get(`/assets/${id}`);
      setAsset(data);
      setEditLocation(data.location);
      setEditCondition(data.condition);
      setEditIsBookable(data.isBookable);
      setLoading(false);
    } catch {
      toast.error('Failed to load asset specs');
      setLoading(false);
    }
  };

  // Draw mock QR Code on HTML Canvas
  useEffect(() => {
    if (asset && qrCanvasRef.current) {
      const ctx = qrCanvasRef.current.getContext('2d');
      if (ctx) {
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 160, 160);

        // Draw outer borders
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4;
        ctx.strokeRect(8, 8, 144, 144);

        // Draw typical QR corner anchor boxes
        ctx.fillStyle = '#0f172a';
        // Top-Left
        ctx.fillRect(16, 16, 40, 40);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(24, 24, 24, 24);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(30, 30, 12, 12);

        // Top-Right
        ctx.fillRect(104, 16, 40, 40);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(112, 24, 24, 24);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(118, 30, 12, 12);

        // Bottom-Left
        ctx.fillRect(16, 104, 40, 40);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(24, 112, 24, 24);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(30, 118, 12, 12);

        // Fill middle with pixel blocks based on tag hash for uniqueness
        const hash = asset.assetTag.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        ctx.fillStyle = '#0f172a';
        for (let x = 64; x < 96; x += 8) {
          for (let y = 16; y < 144; y += 8) {
            const seed = Math.sin(hash + x * y) * 1000;
            if (seed - Math.floor(seed) > 0.45) {
              ctx.fillRect(x, y, 8, 8);
            }
          }
        }
        for (let x = 16; x < 64; x += 8) {
          for (let y = 64; y < 96; y += 8) {
            const seed = Math.sin(hash + x * y) * 1000;
            if (seed - Math.floor(seed) > 0.45) {
              ctx.fillRect(x, y, 8, 8);
            }
          }
        }
        for (let x = 96; x < 144; x += 8) {
          for (let y = 64; y < 144; y += 8) {
            const seed = Math.sin(hash + x * y) * 1000;
            if (seed - Math.floor(seed) > 0.4) {
              ctx.fillRect(x, y, 8, 8);
            }
          }
        }
      }
    }
  }, [asset]);

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/assets/${id}`, {
        location: editLocation,
        condition: editCondition,
        isBookable: editIsBookable,
      });
      toast.success('Specifications updated');
      setIsEditing(false);
      fetchAssetDetails();
    } catch {
      toast.error('Failed to update asset data');
    } finally {
      setSaving(false);
    }
  };

  const handleRetireAsset = async () => {
    if (!confirm('Are you sure you want to retire this asset? This action will set its status to RETIRED.')) return;
    try {
      await api.delete(`/assets/${id}`);
      toast.success('Asset retired');
      fetchAssetDetails();
    } catch (err: any) {
      toast.error(err.message || 'Retire failed');
    }
  };

  if (loading) return <div className="text-center p-8">Loading asset ledger records...</div>;
  if (!asset) return <div className="text-center p-8">Asset not found.</div>;

  // Active allocation
  const activeAllocation = asset.allocations.find((a: any) => a.status === 'ACTIVE');

  // Parse custom parameters
  let customFields: Record<string, any> = {};
  try {
    customFields = typeof asset.customFields === 'string' ? JSON.parse(asset.customFields) : asset.customFields;
  } catch {}

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none">Available</Badge>;
      case 'ALLOCATED': return <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/5">Allocated</Badge>;
      case 'UNDER_MAINTENANCE': return <Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/5">Maintenance</Badge>;
      case 'LOST': return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-none">Lost</Badge>;
      case 'RETIRED': return <Badge variant="outline" className="text-slate-400 border-slate-300">Retired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Header back button */}
      <div className="flex items-center gap-4">
        <Link to="/assets" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "size-9 p-0 rounded-full border-border inline-flex items-center justify-center")}>
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
            {asset.isBookable && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-green-500/30 text-green-600 bg-green-500/5 uppercase font-mono">
                Bookable
              </Badge>
            )}
            {getStatusBadge(asset.status)}
          </div>
          <span className="text-xs text-muted-foreground font-semibold">Asset Tag: <span className="text-foreground">{asset.assetTag}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Specifications panel */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex justify-between items-center">
                <CardTitle className="text-md font-bold">Physical Details</CardTitle>
                {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSET_MANAGER') && !isEditing && (
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    Configure Specs
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isEditing ? (
                <form onSubmit={handleUpdateDetails} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="editLoc" className="text-xs font-semibold">Location</Label>
                      <Input
                        id="editLoc"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="editCond" className="text-xs font-semibold">Condition</Label>
                      <select
                        id="editCond"
                        value={editCondition}
                        onChange={(e) => setEditCondition(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none"
                      >
                        <option value="NEW">New</option>
                        <option value="GOOD">Good</option>
                        <option value="FAIR">Fair</option>
                        <option value="POOR">Poor</option>
                      </select>
                    </div>
                  </div>

                  {/* Bookable checkbox field */}
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      id="editIsBookable"
                      type="checkbox"
                      checked={editIsBookable}
                      onChange={(e: any) => setEditIsBookable(e.target.checked)}
                      className="size-4 rounded border-input text-primary focus:ring-ring"
                    />
                    <Label htmlFor="editIsBookable" className="text-xs font-semibold cursor-pointer select-none">
                      Bookable / Shared Resource
                    </Label>
                  </div>

                  <div className="flex justify-end gap-2.5 mt-2">
                    <Button type="submit" disabled={saving} className="bg-primary hover:opacity-90 text-white font-semibold">
                      {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {/* Serial */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Serial Key</span>
                    <span className="text-sm font-semibold">{asset.serialNumber || 'N/A'}</span>
                  </div>
                  {/* Category */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Category Type</span>
                    <span className="text-sm font-semibold">{asset.category.name}</span>
                  </div>
                  {/* Cost */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Cost</span>
                    <span className="text-sm font-semibold flex items-center gap-1">
                      <CircleDollarSign className="size-4 text-muted-foreground" />
                      <span>${asset.cost.toFixed(2)}</span>
                    </span>
                  </div>
                  {/* Shared / Bookable */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Shared / Bookable</span>
                    <span className="text-sm font-semibold">
                      {asset.isBookable ? (
                        <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 text-xs inline-block">Yes (Bookable)</span>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs block pt-0.5">No (Assigned Only)</span>
                      )}
                    </span>
                  </div>
                  {/* Acquisition Date */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Acquisition Date</span>
                    <span className="text-sm font-semibold">{new Date(asset.acquisitionDate).toLocaleDateString()}</span>
                  </div>
                  {/* Location */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Current Location</span>
                    <span className="text-sm font-semibold flex items-center gap-1">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span>{asset.location}</span>
                    </span>
                  </div>
                  {/* Condition */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Condition</span>
                    <span className="text-sm font-semibold">{asset.condition}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* DYNAMIC CATEGORY FIELD ATTRIBUTES */}
          {Object.keys(customFields).length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-md font-bold">Dynamic Specifications</CardTitle>
                <CardDescription className="text-xs">Custom attribute details registered for this category</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
                {Object.entries(customFields).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{key}</span>
                    <span className="text-sm font-semibold">{val === true ? 'Yes' : val === false ? 'No' : String(val)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Lifecycle history timeline ledger */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-md font-bold flex items-center gap-2">
                <History className="size-5 text-muted-foreground" />
                <span>Asset History Log</span>
              </CardTitle>
              <CardDescription className="text-xs">Lifecycle events logged in chronological order</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Combine allocation logs, maintenance logs, and audits into a single list */}
              {asset.allocations.length === 0 && asset.maintenanceRequests.length === 0 && asset.transfers.length === 0 ? (
                <div className="text-center p-4 text-xs text-muted-foreground italic font-semibold">No historical events recorded for this asset.</div>
              ) : (
                <div className="relative border-l border-border pl-6 ml-2 flex flex-col gap-6">
                  {/* Allocations Timeline */}
                  {asset.allocations.map((alloc: any) => (
                    <div key={alloc.id} className="relative">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[31px] top-0.5 size-4 rounded-full border-2 border-background bg-blue-500 flex items-center justify-center" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Asset Allocation</span>
                        <p className="text-xs font-semibold text-foreground">
                          Allocated to <span className="font-bold text-accent">{alloc.user.name}</span> by {alloc.allocatedBy.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Assigned: {new Date(alloc.createdAt).toLocaleDateString()}
                          {alloc.actualReturnDate && ` | Returned: ${new Date(alloc.actualReturnDate).toLocaleDateString()}`}
                        </p>
                        {alloc.conditionNotesOut && (
                          <p className="text-[10px] italic text-muted-foreground/80 mt-1">"Notes: {alloc.conditionNotesOut}"</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Maintenance Timeline */}
                  {asset.maintenanceRequests.map((req: any) => (
                    <div key={req.id} className="relative">
                      <span className="absolute -left-[31px] top-0.5 size-4 rounded-full border-2 border-background bg-orange-500 flex items-center justify-center" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Maintenance Ticket</span>
                        <p className="text-xs font-semibold text-foreground">
                          {req.title} (<span className="font-bold uppercase text-[9px] text-orange-600">{req.status}</span>)
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Reported: {new Date(req.createdAt).toLocaleDateString()} | Cost: ${req.cost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Transfer Timeline */}
                  {asset.transfers.map((t: any) => (
                    <div key={t.id} className="relative">
                      <span className="absolute -left-[31px] top-0.5 size-4 rounded-full border-2 border-background bg-indigo-500 flex items-center justify-center" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Transfer Request</span>
                        <p className="text-xs font-semibold text-foreground">
                          Transferred from {t.fromUser.name} to {t.toUser.name} ({t.status})
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Approved: {new Date(t.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar panels (QR Code / Actions) */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          {/* QR Code Card */}
          <Card className="border-border flex flex-col items-center p-6 text-center">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-1.5 text-foreground justify-center">
              <QrCode className="size-5 text-muted-foreground" />
              <span>Asset System Tag ID</span>
            </h3>
            
            {/* HTML Canvas QR code */}
            <div className="border border-border/80 p-3 bg-white rounded-xl shadow-inner mb-4">
              <canvas ref={qrCanvasRef} width={160} height={160} className="size-40" />
            </div>

            <span className="font-mono text-xs font-bold bg-muted px-2.5 py-1.5 rounded-lg border border-border text-foreground">
              {asset.assetTag}
            </span>
          </Card>

          {/* Quick Actions Panel */}
          {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSET_MANAGER') && (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ClipboardList className="size-4 text-muted-foreground" />
                  <span>Administrative Control</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col gap-3">
                {asset.status === 'AVAILABLE' && (
                  <Link to="/allocations" className={cn(buttonVariants(), "w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold hover:text-white justify-center")}>Allocate Equipment</Link>
                )}

                {asset.status === 'ALLOCATED' && activeAllocation && (
                  <Link to="/allocations" className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>Process Check-In Return</Link>
                )}

                <Link to="/maintenance" className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>Open Maintenance Request</Link>

                {asset.status !== 'RETIRED' && (
                  <Button onClick={handleRetireAsset} variant="outline" className="w-full text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-600">
                    Retire & Dispose Equipment
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Employee Actions Panel */}
          {currentUser.role === 'EMPLOYEE' && activeAllocation && activeAllocation.userId === currentUser.id && (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold">My Allocation Controls</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col gap-3">
                <Link to="/maintenance" className={cn(buttonVariants(), "w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold hover:text-white justify-center")}>Raise Repairs Request</Link>
                <Link to="/assets" className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>Request Transfer to Colleague</Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
