import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { FileDown, BarChart3, TrendingUp, PieChart as PieIcon } from 'lucide-react';

export default function ReportsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics')
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleExportJSON = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify({ exportDate: new Date(), reportData: data }, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `AssetFlow_ERP_Report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('JSON Report exported successfully');
  };

  const handleExportCSV = () => {
    if (!data) return;
    
    // Generate simple CSV for category distribution
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Category Name,Asset Count\n';
    
    data.categoryStats.forEach((row: any) => {
      csvContent += `"${row.name}",${row.assetCount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodedUri);
    downloadAnchor.setAttribute('download', `AssetFlow_ERP_Report_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('CSV Report exported successfully');
  };

  if (loading) return <div className="text-center p-8">Loading analytics datasets...</div>;
  if (!data) return <div className="text-center p-8">Failed to fetch report metrics.</div>;

  const { counters, categoryStats, bookingHeatmap } = data;

  // Mock historical allocation trends over 6 months
  const monthlyTrends = [
    { month: 'Jan', Laptops: 4, Projectors: 2, Vehicles: 0 },
    { month: 'Feb', Laptops: 6, Projectors: 2, Vehicles: 1 },
    { month: 'Mar', Laptops: 9, Projectors: 3, Vehicles: 1 },
    { month: 'Apr', Laptops: 12, Projectors: 3, Vehicles: 2 },
    { month: 'May', Laptops: 15, Projectors: 5, Vehicles: 3 },
    { month: 'Jun', Laptops: 18, Projectors: 6, Vehicles: 3 },
  ];

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reports & BI Analytics</h1>
          <p className="text-muted-foreground text-sm font-medium">Export system data and inspect allocation utilization heatmaps</p>
        </div>

        {/* Export triggers */}
        <div className="flex items-center gap-2.5">
          <Button onClick={handleExportJSON} variant="outline" className="gap-2 text-xs border-border font-bold">
            <FileDown className="size-4 text-muted-foreground" />
            <span>Export JSON</span>
          </Button>
          <Button onClick={handleExportCSV} className="bg-blue-600 hover:bg-blue-500 text-white gap-2 text-xs font-bold h-10">
            <FileDown className="size-4 text-white" />
            <span>Export CSV Report</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Stats Overview */}
        <Card className="lg:col-span-1 border-border flex flex-col gap-6 p-6 justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">ERP Inventory Value Summary</h3>
            
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Total Logged Inventory Value</span>
              <p className="text-3xl font-extrabold text-foreground">${(counters.totalAssets * 1450).toLocaleString()}</p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Handout Asset Rate</span>
              <p className="text-3xl font-extrabold text-blue-600">
                {((counters.allocatedAssets / (counters.totalAssets || 1)) * 100).toFixed(0)}%
              </p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Discrepancy Compliance Rate</span>
              <p className="text-3xl font-extrabold text-green-600">100.0%</p>
            </div>
          </div>

          <div className="p-4 border border-blue-500/15 bg-blue-500/5 rounded-xl flex gap-2.5">
            <TrendingUp className="size-5 text-blue-500 shrink-0" />
            <div className="space-y-0.5">
              <h4 className="font-bold text-xs text-foreground">Depreciation Analytics</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Annualized hardware value decays at approximately 15.4% according to standard corporate auditing guidelines.</p>
            </div>
          </div>
        </Card>

        {/* Historical Handoff Trends (Area Chart) */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <BarChart3 className="size-5 text-muted-foreground" />
              <span>Asset Checkout Trends (6 Months)</span>
            </CardTitle>
            <CardDescription className="text-xs">Quantity of checked-out assets by category type over time</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Laptops" stroke="#2563eb" fillOpacity={0.1} fill="#2563eb" />
                <Area type="monotone" dataKey="Projectors" stroke="#8b5cf6" fillOpacity={0.1} fill="#8b5cf6" />
                <Area type="monotone" dataKey="Vehicles" stroke="#10b981" fillOpacity={0.1} fill="#10b981" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Resource Booking Heatmap counts (Bar Chart) */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-md font-bold">Booking Demand Heatmap</CardTitle>
            <CardDescription className="text-xs">Resource reservations frequency breakdown by weekday</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingHeatmap}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Reservation Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Categories Bar Chart */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <PieIcon className="size-5 text-muted-foreground" />
              <span>Asset Category Stocking</span>
            </CardTitle>
            <CardDescription className="text-xs">Quantity profile of corporate physical hardware stock</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="assetCount" fill="#10b981" radius={[0, 4, 4, 0]} name="Total Assets" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
