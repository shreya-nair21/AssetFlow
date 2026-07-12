import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getCurrentUser } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Package, Search, Plus, Filter, ArrowRight } from 'lucide-react';

export default function AssetInventory() {
  const user = getCurrentUser();
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [condition, setCondition] = useState('');

  // Register asset form states
  const [name, setName] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [regCategoryId, setRegCategoryId] = useState('');
  const [cost, setCost] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [regCondition, setRegCondition] = useState('GOOD');
  const [location, setLocation] = useState('');
  const [isBookable, setIsBookable] = useState(false);
  
  // Dynamic fields state
  const [categoryFields, setCategoryFields] = useState<any[]>([]);
  const [customFieldsValues, setCustomFieldsValues] = useState<Record<string, any>>({});

  const [registering, setRegistering] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [categoryId, status, condition]);

  const fetchData = async () => {
    try {
      // Build query string
      let query = `/assets?categoryId=${categoryId}&status=${status}&condition=${condition}`;
      if (search) query += `&search=${search}`;

      const [assetsData, catsData] = await Promise.all([
        api.get(query),
        api.get('/setup/categories'),
      ]);
      setAssets(assetsData.assets);
      setCategories(catsData);
      setLoading(false);
    } catch {
      toast.error('Failed to load asset index');
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  // Watch selected category in registration to render dynamic fields
  useEffect(() => {
    if (regCategoryId) {
      const selectedCat = categories.find(c => c.id === regCategoryId);
      if (selectedCat) {
        try {
          const fields = typeof selectedCat.dynamicFields === 'string' ? JSON.parse(selectedCat.dynamicFields) : selectedCat.dynamicFields;
          setCategoryFields(fields || []);
          
          // Pre-populate empty custom values
          const initialValues: Record<string, any> = {};
          fields.forEach((f: any) => {
            if (f.type === 'boolean') initialValues[f.name] = false;
            else if (f.type === 'number') initialValues[f.name] = 0;
            else initialValues[f.name] = '';
          });
          setCustomFieldsValues(initialValues);
        } catch {
          setCategoryFields([]);
        }
      }
    } else {
      setCategoryFields([]);
    }
  }, [regCategoryId, categories]);

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCustomFieldsValues(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !assetTag || !regCategoryId || !cost || !acquisitionDate || !location) {
      toast.error('Please enter all required specifications');
      return;
    }

    setRegistering(true);
    try {
      const payload = {
        name,
        assetTag,
        serialNumber,
        categoryId: regCategoryId,
        cost: parseFloat(cost),
        acquisitionDate,
        condition: regCondition,
        location,
        customFields: customFieldsValues,
        isBookable,
      };

      await api.post('/assets', payload);
      toast.success(`Asset "${name}" successfully registered`);
      
      // Reset form
      setName('');
      setAssetTag('');
      setSerialNumber('');
      setRegCategoryId('');
      setCost('');
      setAcquisitionDate('');
      setRegCondition('GOOD');
      setLocation('');
      setIsBookable(false);
      setCustomFieldsValues({});
      setShowRegisterDialog(false);
      
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Asset registration failed');
    } finally {
      setRegistering(false);
    }
  };

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

  const getConditionBadge = (cond: string) => {
    switch (cond) {
      case 'NEW': return <Badge variant="outline" className="text-green-500 border-green-500/20">New</Badge>;
      case 'GOOD': return <Badge variant="outline" className="text-blue-500 border-blue-500/20">Good</Badge>;
      case 'FAIR': return <Badge variant="outline" className="text-amber-500 border-amber-500/20">Fair</Badge>;
      case 'POOR': return <Badge variant="destructive">Poor</Badge>;
      default: return <Badge variant="outline">{cond}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Asset Inventory</h1>
          <p className="text-muted-foreground text-sm font-medium">Browse, query, and edit the corporate physical hardware directory</p>
        </div>

        {/* Add Asset trigger dialog (ASSET_MANAGER / ADMIN only) */}
        {(user.role === 'ADMIN' || user.role === 'ASSET_MANAGER') && (
          <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
            <DialogTrigger render={
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 px-5 gap-2">
                <Plus className="size-5 text-white" />
                <span>Add Asset</span>
              </Button>
            } />
            <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Register Physical Asset</DialogTitle>
                <DialogDescription className="text-xs">Provide details to track this equipment in the ledger</DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleRegisterAsset} className="flex flex-col gap-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold">Asset Name</Label>
                    <Input id="name" placeholder="e.g. Dell Monitor 27-inch" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>

                  {/* Asset Tag */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tag" className="text-xs font-semibold">Asset Tag (Barcode)</Label>
                    <Input id="tag" placeholder="e.g. AST-MON-923" value={assetTag} onChange={(e) => setAssetTag(e.target.value)} required />
                  </div>

                  {/* Serial Number */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="serial" className="text-xs font-semibold">Serial Number</Label>
                    <Input id="serial" placeholder="Serial Key" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
                  </div>

                  {/* Category Selection */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="regCat" className="text-xs font-semibold">Category Type</Label>
                    <select
                      id="regCat"
                      value={regCategoryId}
                      onChange={(e) => setRegCategoryId(e.target.value)}
                      required
                      className="px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none"
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Acquisition Date */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="acqDate" className="text-xs font-semibold">Acquisition Date</Label>
                    <Input id="acqDate" type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} required />
                  </div>

                  {/* Cost */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cost" className="text-xs font-semibold">Unit Cost (USD)</Label>
                    <Input id="cost" type="number" step="0.01" placeholder="999.00" value={cost} onChange={(e) => setCost(e.target.value)} required />
                  </div>

                  {/* Condition */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="regCondition" className="text-xs font-semibold">Physical Condition</Label>
                    <select
                      id="regCondition"
                      value={regCondition}
                      onChange={(e) => setRegCondition(e.target.value)}
                      className="px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none"
                    >
                      <option value="NEW">New / Boxed</option>
                      <option value="GOOD">Good / Tested</option>
                      <option value="FAIR">Fair / Functional</option>
                      <option value="POOR">Poor / Damaged</option>
                    </select>
                  </div>

                  {/* Location */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="loc" className="text-xs font-semibold">Initial Location</Label>
                    <Input id="loc" placeholder="HQ - Storage Room 2" value={location} onChange={(e) => setLocation(e.target.value)} required />
                  </div>

                  {/* Bookable Option */}
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      id="isBookable"
                      type="checkbox"
                      checked={isBookable}
                      onChange={(e: any) => setIsBookable(e.target.checked)}
                      className="size-4 rounded border-input text-primary focus:ring-ring"
                    />
                    <Label htmlFor="isBookable" className="text-xs font-semibold cursor-pointer select-none">
                      Bookable / Shared Resource
                    </Label>
                  </div>
                </div>

                {/* DYNAMIC ATTRIBUTES AREA */}
                {categoryFields.length > 0 && (
                  <div className="border border-border/50 rounded-xl p-4 bg-muted/10 mt-2 flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dynamic Category Specs</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {categoryFields.map((field) => (
                        <div key={field.name} className="flex flex-col gap-1.5">
                          <Label htmlFor={`dyn-${field.name}`} className="text-xs font-semibold">
                            {field.name} {field.required && <span className="text-red-500 font-bold">*</span>}
                          </Label>

                          {field.type === 'text' && (
                            <Input
                              id={`dyn-${field.name}`}
                              placeholder={`Enter ${field.name}`}
                              value={customFieldsValues[field.name] || ''}
                              onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                              required={field.required}
                            />
                          )}

                          {field.type === 'number' && (
                            <Input
                              id={`dyn-${field.name}`}
                              type="number"
                              placeholder="0"
                              value={customFieldsValues[field.name] || ''}
                              onChange={(e) => handleCustomFieldChange(field.name, parseFloat(e.target.value) || 0)}
                              required={field.required}
                            />
                          )}

                          {field.type === 'date' && (
                            <Input
                              id={`dyn-${field.name}`}
                              type="date"
                              value={customFieldsValues[field.name] || ''}
                              onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                              required={field.required}
                            />
                          )}

                          {field.type === 'boolean' && (
                            <label className="flex items-center gap-2 cursor-pointer h-10 select-none">
                              <input
                                id={`dyn-${field.name}`}
                                type="checkbox"
                                checked={!!customFieldsValues[field.name]}
                                onChange={(e) => handleCustomFieldChange(field.name, e.target.checked)}
                                className="rounded border-input text-blue-600 focus:ring-0"
                              />
                              <span className="text-xs font-medium">Verify True</span>
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={registering} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 h-11 mt-4">
                  {registering ? 'Processing Registration...' : 'Register Equipment'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Query filters row */}
      <Card className="border-border">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search tag, model, serial code, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 text-xs w-full"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <Filter className="size-4 text-muted-foreground mr-1 hidden sm:block" />
            
            {/* Category selection */}
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-2.5 py-1.5 bg-background border border-input rounded-md text-xs focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Status selection */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-background border border-input rounded-md text-xs focus:outline-none"
            >
              <option value="">All States</option>
              <option value="AVAILABLE">Available</option>
              <option value="ALLOCATED">Allocated</option>
              <option value="UNDER_MAINTENANCE">Maintenance</option>
              <option value="LOST">Lost</option>
              <option value="RETIRED">Retired</option>
            </select>

            {/* Condition selection */}
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="px-2.5 py-1.5 bg-background border border-input rounded-md text-xs focus:outline-none"
            >
              <option value="">All Conditions</option>
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>

            <Button type="button" onClick={fetchData} className="h-8.5 text-xs bg-slate-800 text-slate-100 hover:bg-slate-700">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading asset inventory...</div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
              <Package className="size-10 text-muted-foreground/40 animate-pulse" />
              <span className="text-sm font-semibold">No assets found matching parameters.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold text-xs">{asset.assetTag}</TableCell>
                    <TableCell className="font-semibold text-xs flex items-center gap-1.5 flex-wrap">
                      <span>{asset.name}</span>
                      {asset.isBookable && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 border-green-500/30 text-green-600 bg-green-500/5 uppercase font-mono">
                          Bookable
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{asset.category.name}</TableCell>
                    <TableCell className="text-xs">{asset.location}</TableCell>
                    <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link to={`/assets/${asset.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 hover:text-accent gap-1 text-[11px] font-bold inline-flex")}>
                        <span>Details</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
