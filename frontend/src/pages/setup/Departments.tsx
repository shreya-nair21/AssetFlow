import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';

export default function Departments() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [name, setName] = useState('');
  const [headId, setHeadId] = useState('');
  const [parentId, setParentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deptsData, empsData] = await Promise.all([
        api.get('/setup/departments'),
        api.get('/setup/employees'),
      ]);
      setDepartments(deptsData);
      setEmployees(empsData.filter((e: any) => e.role === 'DEPT_HEAD' || e.role === 'ADMIN'));
      setLoading(false);
    } catch {
      toast.error('Failed to query organization details');
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const res = await api.post('/setup/departments', { 
        name, 
        headId: headId || null, 
        parentId: parentId || null 
      });
      toast.success(`Department "${res.name}" created!`);
      setName('');
      setHeadId('');
      setParentId('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.put(`/setup/departments/${id}`, { status: newStatus });
      toast.success('Department status updated');
      fetchData();
    } catch {
      toast.error('Failed to toggle department state');
    }
  };

  if (loading) return <div className="text-center p-8">Loading organization matrix...</div>;

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Organization Departments</h1>
          <p className="text-muted-foreground text-sm font-medium">Manage corporate departments and assign executive heads</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Department Form */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader>
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <Plus className="size-5" />
              <span>Create New Department</span>
            </CardTitle>
            <CardDescription className="text-xs">Establish a new branch within the company</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deptName" className="text-xs font-semibold">Department Name</Label>
                <Input
                  id="deptName"
                  placeholder="e.g. Legal & Compliance"
                  value={name}
                  onChange={(e: any) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deptHead" className="text-xs font-semibold">Department Head (Optional)</Label>
                <select
                  id="deptHead"
                  value={headId}
                  onChange={(e: any) => setHeadId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- No Head Assigned --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="parentDept" className="text-xs font-semibold">Parent Department (Optional)</Label>
                <select
                  id="parentDept"
                  value={parentId}
                  onChange={(e: any) => setParentId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- Top-level Department --</option>
                  {departments.filter((d: any) => d.status === 'ACTIVE').map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <Button type="submit" disabled={submitting} className="w-full bg-primary hover:opacity-90 text-white font-semibold h-10 mt-2">
                {submitting ? 'Creating...' : 'Create Department'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Departments List Table */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <Building2 className="size-5 text-muted-foreground" />
              <span>Active Department Directory</span>
            </CardTitle>
            <CardDescription className="text-xs">Total departments registered: {departments.length}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Parent Department</TableHead>
                  <TableHead>Head of Dept</TableHead>
                  <TableHead className="text-center">Staff Count</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold text-xs">{dept.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {dept.parentDepartment ? (
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border">
                          {dept.parentDepartment.name}
                        </span>
                      ) : (
                        <span className="italic text-muted-foreground/40">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {dept.head ? dept.head.name : <span className="italic text-muted-foreground/60">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs">{dept._count.members}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={dept.status === 'ACTIVE' ? 'secondary' : 'outline'} className="text-[10px]">
                        {dept.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(dept.id, dept.status)}
                        title={dept.status === 'ACTIVE' ? 'Deactivate Department' : 'Activate Department'}
                      >
                        {dept.status === 'ACTIVE' ? (
                          <ToggleRight className="size-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="size-5 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
