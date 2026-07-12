import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken, setCurrentUser } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Mail, Lock, User, Building2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch departments for registration select
  useEffect(() => {
    // Unauthenticated request to retrieve departments listing
    setDepartments([
      { id: 'eng-id-mock', name: 'Engineering' },
      { id: 'hr-id-mock', name: 'Human Resources' },
      { id: 'ops-id-mock', name: 'Operations' },
    ]);
    
    // Let's try to query the backend.
    fetch('http://localhost:5000/api/setup/departments')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDepartments(data);
          if (data.length > 0) setDepartmentId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please enter all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload: any = { name, email, password };
      
      // Only send departmentId if it's not a mock placeholder
      if (departmentId && !departmentId.endsWith('-mock')) {
        payload.departmentId = departmentId;
      }

      const res = await api.post('/auth/signup', payload);
      setToken(res.token);
      setCurrentUser(res.user);
      toast.success(`Account registered successfully! Welcome ${res.user.name}.`);
      
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background font-sans">
      {/* LEFT COLUMN: Monochrome & Coral Illustration of enterprise assets */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#17171c] p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Glow overlay using Coral Theme color */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 20% 30%, #ff7759 0%, transparent 70%)',
            zIndex: 1
          }} 
        />

        {/* Header Branding */}
        <div className="flex items-center gap-3 z-10">
          <div className="size-8.5 bg-white/10 border border-white/20 rounded-xs flex items-center justify-center shadow-none">
            <span className="font-mono font-bold text-sm text-white">AF</span>
          </div>
          <span className="font-bold text-sm tracking-tight text-white uppercase font-mono">AssetFlow</span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-xs bg-white/10 border border-white/15 text-white/90 uppercase tracking-wider font-mono">
            Enterprise
          </span>
        </div>

        {/* Central Content */}
        <div className="z-10 max-w-md my-auto space-y-6">
          <h1 className="text-4xl font-extrabold tracking-[-1px] leading-tight text-white">
            Simplify and digitize your organization <span className="text-[#ff7759]">assets lifecycle</span>.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed">
            A centralized platform for tracking resource allocations, scheduling shared facilities, and conducting auditor inspections with full transparency.
          </p>

          {/* Key Capabilities checklist */}
          <div className="flex flex-col gap-4 pt-2">
            {[
              'Real-time tracking of organizational resources',
              'Smart scheduling and facility booking system',
              'Auditor-ready inspection logs and reports',
              'Automatic maintenance workflows & status tracking'
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#ff7759] flex-shrink-0" />
                <span className="text-sm text-white/90 font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="z-10 text-xs text-white/40 flex justify-between items-center border-t border-white/10 pt-6">
          <span className="font-mono text-[10px] uppercase tracking-wider">Trusted by Compliance Audited Divisions</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff7759] inline-block animate-pulse shadow-[0_0_8px_#ff7759]" />
            <span className="font-semibold tracking-wider font-mono">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Centered Signup Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative bg-secondary/30">
        {/* Back to Home */}
        <Link
          to="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Home</span>
        </Link>

        <div className="w-full max-w-md">
          <Card className="border border-border bg-white rounded-xs shadow-none overflow-hidden">
            <CardHeader className="space-y-1.5 text-center">
              <CardTitle className="text-xl text-foreground font-bold tracking-tight">Create Account</CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Register as an employee to track assets & make reservations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Full Name */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name" className="text-[10px] font-bold text-foreground uppercase tracking-wider font-mono">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e: any) => setName(e.target.value)}
                      required
                      className="pl-11"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email" className="text-[10px] font-bold text-foreground uppercase tracking-wider font-mono">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane.doe@company.com"
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      required
                      className="pl-11"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password" className="text-[10px] font-bold text-foreground uppercase tracking-wider font-mono">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e: any) => setPassword(e.target.value)}
                      required
                      className="pl-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}  
                  className="mt-2 w-full bg-primary hover:opacity-90 text-white font-semibold h-11"
                >
                  {loading ? 'Creating Account...' : 'Register'}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex items-center justify-center border-t border-border py-4 text-xs text-muted-foreground bg-secondary/10">
              <span>
                Already have an employee account?{' '}
                <Link to="/login" className="text-action-blue hover:underline font-bold">
                  Sign In
                </Link>
              </span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
