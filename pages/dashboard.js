// import { useState, useEffect } from 'react';
// import Layout from '../components/Layout';
// import ContactManager from '../components/ContactManager';
// import GroupManager from '../components/GroupManager';
// import EmailEditor from '../components/EmailEditor';
// import PrivateRoute from '../components/PrivateRoute';

// function Dashboard() {
//     const [contacts, setContacts] = useState([]);
//     const [selectedContacts, setSelectedContacts] = useState([]);
//     const [selectedRecipients, setSelectedRecipients] = useState([]);
//     const [activeTab, setActiveTab] = useState('contacts');

//     useEffect(() => {
//         fetchContacts();
//     }, []);

//     const fetchContacts = async () => {
//         try {
//             const response = await fetch('/api/contacts');
//             if (response.ok) {
//                 const data = await response.json();
//                 setContacts(data);
//             }
//         } catch (error) {
//             console.error('Failed to fetch contacts:', error);
//         }
//     };

//     const handleContactSelection = (contacts) => {
//         setSelectedContacts(contacts);
//         setSelectedRecipients(contacts);
//     };

//     const handleGroupSelection = (groupContacts) => {
//         setSelectedRecipients(groupContacts);
//     };

//     const handleEmailSent = (result) => {
//         console.log('Email sent:', result);
//         // You can add success notification here
//     };

//     const tabs = [
//         { id: 'contacts', name: 'Individual Contacts', count: selectedContacts.length },
//         { id: 'groups', name: 'Groups', count: selectedRecipients.length },
//     ];

//     return (
//         <Layout>
//             <div className="px-4 py-6 sm:px-0">
//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                     {/* Left Column - Contact/Group Selection */}
//                     <div className="space-y-6">
//                         {/* Tab Navigation */}
//                         <div className="bg-white shadow rounded-lg">
//                             <div className="border-b border-gray-200">
//                                 <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
//                                     {tabs.map((tab) => (
//                                         <button
//                                             key={tab.id}
//                                             onClick={() => setActiveTab(tab.id)}
//                                             className={`${activeTab === tab.id
//                                                     ? 'border-blue-500 text-blue-600'
//                                                     : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//                                                 } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
//                                         >
//                                             {tab.name}
//                                             {tab.count > 0 && (
//                                                 <span className={`${activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-900'
//                                                     } ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium`}>
//                                                     {tab.count}
//                                                 </span>
//                                             )}
//                                         </button>
//                                     ))}
//                                 </nav>
//                             </div>

//                             <div className="p-0">
//                                 {activeTab === 'contacts' && (
//                                     <ContactManager onSelectionChange={handleContactSelection} />
//                                 )}
//                                 {activeTab === 'groups' && (
//                                     <GroupManager
//                                         contacts={contacts}
//                                         onGroupSelect={handleGroupSelection}
//                                     />
//                                 )}
//                             </div>
//                         </div>
//                     </div>

//                     {/* Right Column - Email Editor */}
//                     <div>
//                         <EmailEditor
//                             recipients={selectedRecipients}
//                             onSend={handleEmailSent}
//                         />
//                     </div>
//                 </div>
//             </div>
//         </Layout>
//     );
// }

// export default function DashboardPage() {
//     return (
//         <PrivateRoute>
//             <Dashboard />
//         </PrivateRoute>
//     );
// }



// pages/dashboard.js
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ContactManager from '../components/ContactManager';
import GroupManager from '../components/GroupManager';
import EmailEditor from '../components/EmailEditor';
import PrivateRoute from '../components/PrivateRoute';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import {
    Users, DollarSign, Briefcase, TrendingUp, TrendingDown,
    Calendar, MapPin, Building2, Clock, Target, AlertCircle,
    CheckCircle, XCircle, Mail, Settings, Download, Filter,
    Search, RefreshCw, CreditCard, UserCheck, FileText
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('30d');
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('analytics');

    // Data states
    const [subscriptions, setSubscriptions] = useState([]);
    const [users, setUsers] = useState([]);
    const [applications, setApplications] = useState([]);
    const [uninstallFeedback, setUninstallFeedback] = useState([]);

    // Email states (for email tab)
    const [contacts, setContacts] = useState([]);
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]);

    // Analytics states
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        activeSubscriptions: 0,
        totalUsers: 0,
        totalApplications: 0,
        successRate: 0,
        uninstallRate: 0
    });

    // Fetch Firebase data
    const fetchFirebaseData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch subscriptions
            const subscriptionsRef = collection(db, 'subscriptions');
            const subscriptionsSnap = await getDocs(subscriptionsRef);
            const subscriptionsData = subscriptionsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
                updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt)
            }));

            // Fetch users (only email and firstName)
            const usersRef = collection(db, 'users');
            const usersSnap = await getDocs(usersRef);
            const usersData = usersSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    email: data.email,
                    firstName: data.firstName || data.name?.split(' ')[0] || 'Unknown',
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                };
            });

            // Fetch applications
            const applicationsRef = collection(db, 'applications');
            const applicationsSnap = await getDocs(applicationsRef);
            const applicationsData = applicationsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                appliedAt: doc.data().appliedAt?.toDate ? doc.data().appliedAt.toDate() : new Date(doc.data().appliedAt)
            }));

            // Fetch uninstall feedback
            const uninstallRef = collection(db, 'uninstallFeedback');
            const uninstallSnap = await getDocs(uninstallRef);
            const uninstallData = uninstallSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
            }));

            setSubscriptions(subscriptionsData);
            setUsers(usersData);
            setApplications(applicationsData);
            setUninstallFeedback(uninstallData);

            // Calculate metrics
            const totalRevenue = subscriptionsData.reduce((sum, sub) => sum + (sub.amount || 0), 0);
            const activeSubscriptions = subscriptionsData.filter(sub => sub.status === 'active').length;
            const totalUsers = usersData.length;
            const totalApplications = applicationsData.length;
            const appliedApplications = applicationsData.filter(app => app.status === 'applied').length;
            const successRate = totalApplications > 0 ? (appliedApplications / totalApplications) * 100 : 0;
            const uninstallRate = totalUsers > 0 ? (uninstallData.length / totalUsers) * 100 : 0;

            setMetrics({
                totalRevenue,
                activeSubscriptions,
                totalUsers,
                totalApplications,
                successRate,
                uninstallRate
            });

        } catch (err) {
            console.error('Error fetching Firebase data:', err);
            setError('Failed to fetch data from Firebase');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Fetch contacts for email functionality
    const fetchContacts = async () => {
        try {
            // Convert users to contacts format for email functionality
            const contactsData = users.map(user => ({
                id: user.id,
                email: user.email,
                name: user.firstName
            }));
            setContacts(contactsData);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
        }
    };

    useEffect(() => {
        fetchFirebaseData();
    }, [timeRange]);

    useEffect(() => {
        if (users.length > 0) {
            fetchContacts();
        }
    }, [users]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchFirebaseData();
    };

    const handleContactSelection = (contacts) => {
        setSelectedContacts(contacts);
        setSelectedRecipients(contacts);
    };

    const handleGroupSelection = (groupContacts) => {
        setSelectedRecipients(groupContacts);
    };

    const handleEmailSent = (result) => {
        console.log('Email sent:', result);
    };

    // Prepare chart data
    const subscriptionsByPlan = subscriptions.reduce((acc, sub) => {
        acc[sub.planName] = (acc[sub.planName] || 0) + 1;
        return acc;
    }, {});

    const planChartData = Object.entries(subscriptionsByPlan).map(([plan, count]) => ({
        name: plan,
        value: count
    }));

    const applicationsByCompany = applications.reduce((acc, app) => {
        const company = app.company || 'Unknown';
        acc[company] = (acc[company] || 0) + 1;
        return acc;
    }, {});

    const companyChartData = Object.entries(applicationsByCompany)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([company, applications]) => ({
            company,
            applications
        }));

    const uninstallReasons = uninstallFeedback.reduce((acc, feedback) => {
        acc[feedback.reason] = (acc[feedback.reason] || 0) + 1;
        return acc;
    }, {});

    const uninstallChartData = Object.entries(uninstallReasons).map(([reason, count]) => ({
        reason: reason.replace('-', ' '),
        count
    }));

    const recentApplications = applications
        .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
        .slice(0, 5);

    const tabs = [
        { id: 'analytics', name: 'Analytics', icon: TrendingUp },
        { id: 'contacts', name: 'Individual Contacts', icon: Users, count: selectedContacts.length },
        { id: 'groups', name: 'Groups', icon: UserCheck, count: selectedRecipients.length },
    ];

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading FastApply Analytics...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="px-4 py-6 sm:px-0">
                {/* Tab Navigation */}
                <div className="bg-white shadow rounded-lg mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`${activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                                    >
                                        <Icon className="w-4 h-4 mr-2" />
                                        {tab.name}
                                        {tab.count > 0 && (
                                            <span className={`${activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-900'
                                                } ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        {/* Time Range and Refresh */}
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-gray-900">FastApply Analytics</h1>
                            <div className="flex items-center space-x-4">
                                <select
                                    value={timeRange}
                                    onChange={(e) => setTimeRange(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                                >
                                    <option value="7d">Last 7 days</option>
                                    <option value="30d">Last 30 days</option>
                                    <option value="90d">Last 90 days</option>
                                    <option value="1y">Last year</option>
                                </select>
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                <div className="flex">
                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                    <div className="ml-3">
                                        <p className="text-sm text-red-800">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="bg-white overflow-hidden shadow rounded-lg">
                                <div className="p-5">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <DollarSign className="h-6 w-6 text-green-600" />
                                        </div>
                                        <div className="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                                                <dd className="text-lg font-medium text-gray-900">${metrics.totalRevenue.toFixed(2)}</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white overflow-hidden shadow rounded-lg">
                                <div className="p-5">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <CreditCard className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt className="text-sm font-medium text-gray-500 truncate">Active Subscriptions</dt>
                                                <dd className="text-lg font-medium text-gray-900">{metrics.activeSubscriptions}</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white overflow-hidden shadow rounded-lg">
                                <div className="p-5">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <Users className="h-6 w-6 text-purple-600" />
                                        </div>
                                        <div className="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                                                <dd className="text-lg font-medium text-gray-900">{metrics.totalUsers}</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white overflow-hidden shadow rounded-lg">
                                <div className="p-5">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <Target className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div className="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt className="text-sm font-medium text-gray-500 truncate">Total Applications</dt>
                                                <dd className="text-lg font-medium text-gray-900">{metrics.totalApplications}</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Subscription Plans */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Plans</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={planChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {planChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Top Companies by Applications */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Companies by Applications</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={companyChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="company" angle={-45} textAnchor="end" height={80} />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="applications" fill="#3B82F6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Uninstall Reasons */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Uninstall Reasons</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={uninstallChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="reason" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#EF4444" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Recent Applications */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Applications</h3>
                                <div className="space-y-3">
                                    {recentApplications.map((app) => (
                                        <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{app.title}</p>
                                                <p className="text-sm text-gray-500">{app.company}</p>
                                                <p className="text-xs text-gray-400">
                                                    {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Unknown date'}
                                                </p>
                                            </div>
                                            <div className="flex items-center">
                                                {app.status === 'applied' ? (
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <Clock className="w-5 h-5 text-yellow-500" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {recentApplications.length === 0 && (
                                        <p className="text-center text-gray-500 py-8">No recent applications</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Data Tables */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Users Table */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Users</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Email
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Joined
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {users.slice(0, 5).map((user) => (
                                                <tr key={user.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {user.firstName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {user.email}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Subscriptions Table */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Subscriptions</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Plan
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Amount
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {subscriptions.slice(0, 5).map((sub) => (
                                                <tr key={sub.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {sub.planName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        ${sub.amount}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sub.status === 'active'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {sub.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Email Functionality Tabs */}
                {(activeTab === 'contacts' || activeTab === 'groups') && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Contact/Group Selection */}
                        <div className="space-y-6">
                            {activeTab === 'contacts' && (
                                <ContactManager onSelectionChange={handleContactSelection} />
                            )}
                            {activeTab === 'groups' && (
                                <GroupManager
                                    contacts={contacts}
                                    onGroupSelect={handleGroupSelection}
                                />
                            )}
                        </div>

                        {/* Right Column - Email Editor */}
                        <div>
                            <EmailEditor
                                recipients={selectedRecipients}
                                onSend={handleEmailSent}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default function DashboardPage() {
    return (
        <PrivateRoute>
            <Dashboard />
        </PrivateRoute>
    );
}
