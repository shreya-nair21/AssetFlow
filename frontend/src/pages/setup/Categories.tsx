import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Tags, Trash } from 'lucide-react';

interface DynamicFieldDef {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required: boolean;
}

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dynamicFields, setDynamicFields] = useState<DynamicFieldDef[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Field builder states
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'boolean'>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await api.get('/setup/categories');
      setCategories(data);
      setLoading(false);
    } catch {
      toast.error('Failed to query categories');
      setLoading(false);
    }
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    
    // Check duplication
    if (dynamicFields.some(f => f.name.toLowerCase() === newFieldName.trim().toLowerCase())) {
      toast.error('Field name already exists');
      return;
    }

    const field: DynamicFieldDef = {
      name: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired,
    };

    setDynamicFields([...dynamicFields, field]);
    setNewFieldName('');
    setNewFieldRequired(false);
  };

  const handleRemoveField = (index: number) => {
    setDynamicFields(dynamicFields.filter((_, i) => i !== index));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const payload = {
        name,
        description,
        dynamicFields,
      };

      await api.post('/setup/categories', payload);
      toast.success(`Category "${name}" successfully registered`);
      setName('');
      setDescription('');
      setDynamicFields([]);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to register category');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center p-8">Loading asset classifications...</div>;

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Asset Classifications</h1>
        <p className="text-muted-foreground text-sm font-medium">Create asset categories and configure dynamic parameters schema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Category Form */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader>
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <Plus className="size-5" />
              <span>Create New Category</span>
            </CardTitle>
            <CardDescription className="text-xs">Configure spec templates for assets of this class</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCategory} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="catName" className="text-xs font-semibold">Category Name</Label>
                <Input
                  id="catName"
                  placeholder="e.g. Workstations, Projectors"
                  value={name}
                  onChange={(e: any) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="catDesc" className="text-xs font-semibold">Description</Label>
                <Input
                  id="catDesc"
                  placeholder="Summary details"
                  value={description}
                  onChange={(e: any) => setDescription(e.target.value)}
                />
              </div>

              {/* Dynamic Field Builder */}
              <div className="border border-border/80 rounded-xl p-4 bg-muted/20 flex flex-col gap-3">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Dynamic Fields Schema</Label>
                
                {/* Dynamic Fields List */}
                {dynamicFields.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground/80 italic">No custom fields defined. Items will only use default properties.</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {dynamicFields.map((field, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1.5 text-[10px] pl-2.5 py-1">
                        <span>{field.name} ({field.type})</span>
                        {field.required && <span className="text-red-500 font-bold">*</span>}
                        <button type="button" onClick={() => handleRemoveField(idx)}>
                          <Trash className="size-3 text-red-500 hover:scale-110" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Builder inputs */}
                <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-border/50">
                  <Input
                    placeholder="Field name (e.g. RAM)"
                    value={newFieldName}
                    onChange={(e: any) => setNewFieldName(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={newFieldType}
                      onChange={(e: any) => setNewFieldType(e.target.value as any)}
                      className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded text-xs focus:outline-none"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                    </select>

                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newFieldRequired}
                        onChange={(e: any) => setNewFieldRequired(e.target.checked)}
                        className="rounded border-input text-blue-600 focus:ring-0"
                      />
                      <span className="text-xs font-medium">Required</span>
                    </label>
                  </div>
                  <Button type="button" onClick={handleAddField} className="h-8 text-xs bg-slate-800 text-slate-100 hover:bg-slate-700">
                    Add Spec Parameter
                  </Button>
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 mt-2">
                {submitting ? 'Registering...' : 'Register Category'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Categories Directory Table */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <Tags className="size-5 text-muted-foreground" />
              <span>Asset Category Registry</span>
            </CardTitle>
            <CardDescription className="text-xs">Category classes active: {categories.length}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Custom Attributes Schema</TableHead>
                  <TableHead className="text-center">Asset Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => {
                  let fieldsList: DynamicFieldDef[] = [];
                  try {
                    fieldsList = typeof cat.dynamicFields === 'string' ? JSON.parse(cat.dynamicFields) : cat.dynamicFields;
                  } catch {}

                  return (
                    <TableRow key={cat.id} className="hover:bg-muted/30">
                      <TableCell className="font-bold text-xs">{cat.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-44">{cat.description || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {fieldsList.length === 0 ? (
                            <span className="text-[10px] text-muted-foreground/60 italic">No custom specs</span>
                          ) : (
                            fieldsList.map((f, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] border-border text-muted-foreground px-2 py-0.5">
                                {f.name} ({f.type}){f.required && '*'}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs">{cat._count.assets}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
