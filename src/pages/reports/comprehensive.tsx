import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

// Minimal UI primitives to avoid missing component imports
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <Head>
      <title>Comprehensive Reports - CASA Case Management</title>
    </Head>
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage="/reports/comprehensive" />
      {children}
    </div>
  </>
);

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white rounded-lg shadow">{children}</div>
);

const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`border-b px-6 py-4 ${className}`}>{children}</div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`font-semibold ${className}`}>{children}</div>
);

const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-6">{children}</div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
  <button className={`px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 ${className}`} {...props}>
    {children}
  </button>
);

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-full bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 ${className}`}>
    {children}
  </span>
);

interface ReportData {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  totalVolunteers: number;
  activeVolunteers: number;
  totalContacts: number;
  totalHomeVisits: number;
  totalDocuments: number;
  casesByStatus: Array<{ status: string; count: number }>;
  casesByMonth: Array<{ month: string; count: number }>;
  volunteerWorkload: Array<{ volunteer: string; cases: number }>;
  contactTypes: Array<{ type: string; count: number }>;
}

const ComprehensiveReports: React.FC = () => {
  const { user, organization } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30'); // days

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, we'll create mock data since the backend doesn't have comprehensive reports yet
      const mockData: ReportData = {
        totalCases: 15,
        activeCases: 12,
        closedCases: 3,
        totalVolunteers: 8,
        activeVolunteers: 6,
        totalContacts: 45,
        totalHomeVisits: 23,
        totalDocuments: 67,
        casesByStatus: [
          { status: 'Active', count: 12 },
          { status: 'Closed', count: 3 },
          { status: 'Pending Review', count: 2 },
        ],
        casesByMonth: [
          { month: 'Jan', count: 2 },
          { month: 'Feb', count: 3 },
          { month: 'Mar', count: 4 },
          { month: 'Apr', count: 3 },
          { month: 'May', count: 2 },
          { month: 'Jun', count: 1 },
        ],
        volunteerWorkload: [
          { volunteer: 'Sarah Johnson', cases: 3 },
          { volunteer: 'Mike Davis', cases: 2 },
          { volunteer: 'Lisa Chen', cases: 4 },
          { volunteer: 'Tom Wilson', cases: 1 },
          { volunteer: 'Emma Rodriguez', cases: 2 },
        ],
        contactTypes: [
          { type: 'Phone', count: 20 },
          { type: 'Email', count: 15 },
          { type: 'In Person', count: 10 },
        ],
      };

      setReportData(mockData);
    } catch (err: any) {
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;
    
    const csvContent = [
      'Metric,Value',
      `Total Cases,${reportData.totalCases}`,
      `Active Cases,${reportData.activeCases}`,
      `Closed Cases,${reportData.closedCases}`,
      `Total Volunteers,${reportData.totalVolunteers}`,
      `Active Volunteers,${reportData.activeVolunteers}`,
      `Total Contacts,${reportData.totalContacts}`,
      `Total Home Visits,${reportData.totalHomeVisits}`,
      `Total Documents,${reportData.totalDocuments}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprehensive-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading comprehensive reports...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold">Error Loading Reports</h2>
            <p className="text-red-600 mt-2">{error}</p>
            <Button onClick={loadReportData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Comprehensive Reports</h1>
            <p className="text-gray-600 mt-2">
              Overview of CASA program performance and statistics
            </p>
          </div>
          <div className="flex gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <Button onClick={exportReport} variant="outline">
              Export Report
            </Button>
          </div>
        </div>

        {reportData && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
                  <Badge variant="secondary">{reportData.totalCases}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalCases}</div>
                  <p className="text-xs text-muted-foreground">
                    {reportData.activeCases} active, {reportData.closedCases} closed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Volunteers</CardTitle>
                  <Badge variant="secondary">{reportData.activeVolunteers}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalVolunteers}</div>
                  <p className="text-xs text-muted-foreground">
                    {reportData.activeVolunteers} active volunteers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contacts</CardTitle>
                  <Badge variant="secondary">{reportData.totalContacts}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalContacts}</div>
                  <p className="text-xs text-muted-foreground">
                    Total contact interactions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Home Visits</CardTitle>
                  <Badge variant="secondary">{reportData.totalHomeVisits}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalHomeVisits}</div>
                  <p className="text-xs text-muted-foreground">
                    Completed home visits
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Cases by Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Cases by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.casesByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {reportData.casesByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Cases by Month */}
              <Card>
                <CardHeader>
                  <CardTitle>Cases by Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.casesByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Volunteer Workload */}
              <Card>
                <CardHeader>
                  <CardTitle>Volunteer Workload</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.volunteerWorkload}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="volunteer" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cases" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Contact Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.contactTypes}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {reportData.contactTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Summary Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Metric</th>
                        <th className="text-right py-2">Value</th>
                        <th className="text-right py-2">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">Active Cases</td>
                        <td className="text-right">{reportData.activeCases}</td>
                        <td className="text-right">
                          {((reportData.activeCases / reportData.totalCases) * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Closed Cases</td>
                        <td className="text-right">{reportData.closedCases}</td>
                        <td className="text-right">
                          {((reportData.closedCases / reportData.totalCases) * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Active Volunteers</td>
                        <td className="text-right">{reportData.activeVolunteers}</td>
                        <td className="text-right">
                          {((reportData.activeVolunteers / reportData.totalVolunteers) * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Documents per Case</td>
                        <td className="text-right">
                          {(reportData.totalDocuments / reportData.totalCases).toFixed(1)}
                        </td>
                        <td className="text-right">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ComprehensiveReports;
