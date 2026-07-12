import { useState, useEffect } from 'react';
import { api, getCurrentUser } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, UserCog } from 'lucide-react';

export default function Employees() {
  const currentUser = getCurrentUser();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // States to track editing modes
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [empData, deptData] = await Promise.all([
        api.get('/setup/employees'),
        api.get('/setup/departments'),
      ]);
      setEmployees(empData);
      setDepartments(deptData);
      setLoading(false);
    } catch {
      toast.error('Failed to load employee list');
      setLoading(false);
    }
  };

  const handleEditClick = (emp: any) => {
    setEditingUserId(emp.id);
    setEditRole(emp.role);
    setEditDeptId(emp.departmentId || '');
  };

  const handleSave = async (userId: string) => {
    setUpdating(true);
    try {
      // 1. Save role if it changed and user is admin
      const originalEmp = employees.find(e => e.id === userId);
      if (currentUser.role === 'ADMIN' && originalEmp.role !== editRole) {
        await api.put(`/setup/employees/${userId}/role`, { role: editRole });
      }

      // 2. Save department
      if (originalEmp.departmentId !== (editDeptId || null)) {
        await api.put(`/setup/employees/${userId}/department`, { departmentId: editDeptId || null });
      }

      toast.success('Employee profile updated successfully');
      setEditingUserId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update employee details');
    } finally {
      setUpdating(false);
    }
  };

  // Filter employees by search query
  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      (emp.department?.name || 'unassigned').toLowerCase().includes(query) ||
      emp.role.toLowerCase().includes(query)
    );
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive';
      case 'ASSET_MANAGER': return 'secondary';
      case 'DEPT_HEAD': return 'outline';
      case 'EMPLOYEE':
      default: return 'outline';
    }
  };

  if (loading) return <div className="text-center p-8">Querying corporate registry...</div>;

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Employee Directory</h1>
          <p className="text-muted-foreground text-sm font-medium">Browse company personnel, allocate departments, and manage roles</p>
        </div>
      </div>

      {/* Directory Table Card */}
      <Card className="border-border shadow-md">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" />
              <span>Staff Members List</span>
            </CardTitle>
            <CardDescription className="text-xs">Total verified staff: {employees.length}</CardDescription>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, department, role..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>System Privilege Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => {
                const isEditing = editingUserId === emp.id;

                return (
                  <TableRow key={emp.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold text-xs">{emp.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{emp.email}</TableCell>
                    
                    {/* Department Cell */}
                    <TableCell className="text-xs">
                      {isEditing ? (
                        <select
                          value={editDeptId}
                          onChange={(e: any) => setEditDeptId(e.target.value)}
                          className="px-2 py-1 bg-background border border-input rounded text-xs focus:outline-none"
                        >
                          <option value="">-- Unassigned --</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      ) : (
                        emp.department?.name || <span className="italic text-muted-foreground/60">Unassigned</span>
                      )}
                    </TableCell>

                    {/* Role Cell */}
                    <TableCell>
                      {isEditing && currentUser.role === 'ADMIN' ? (
                        <select
                          value={editRole}
                          onChange={(e: any) => setEditRole(e.target.value)}
                          className="px-2 py-1 bg-background border border-input rounded text-xs focus:outline-none"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="ASSET_MANAGER">ASSET MANAGER</option>
                          <option value="DEPT_HEAD">DEPT HEAD</option>
                          <option value="EMPLOYEE">EMPLOYEE</option>
                        </select>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(emp.role)} className="text-[10px] tracking-wide font-bold">
                          {emp.role.replace('_', ' ')}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Actions Cell */}
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={updating}
                            onClick={() => handleSave(emp.id)}
                            className="bg-green-600 hover:bg-green-500 text-white text-[11px] h-8 px-3"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingUserId(null)}
                            className="text-[11px] h-8 px-3 border border-input"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        // Only allow edits if user is Admin, or if they are Asset Manager and it's department edits
                        (currentUser.role === 'ADMIN' || (currentUser.role === 'ASSET_MANAGER' && emp.role === 'EMPLOYEE')) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(emp)}
                            className="h-8 gap-1.5 hover:text-accent"
                          >
                            <UserCog className="size-4" />
                            <span className="text-[11px]">Configure</span>
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
