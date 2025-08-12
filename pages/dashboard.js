import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ContactManager from '../components/ContactManager';
import GroupManager from '../components/GroupManager';
import EmailEditor from '../components/EmailEditor';
import PrivateRoute from '../components/PrivateRoute';

function Dashboard() {
    const [contacts, setContacts] = useState([]);
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [activeTab, setActiveTab] = useState('contacts');

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            const response = await fetch('/api/contacts');
            if (response.ok) {
                const data = await response.json();
                setContacts(data);
            }
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
        }
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
        // You can add success notification here
    };

    const tabs = [
        { id: 'contacts', name: 'Individual Contacts', count: selectedContacts.length },
        { id: 'groups', name: 'Groups', count: selectedRecipients.length },
    ];

    return (
        <Layout>
            <div className="px-4 py-6 sm:px-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Contact/Group Selection */}
                    <div className="space-y-6">
                        {/* Tab Navigation */}
                        <div className="bg-white shadow rounded-lg">
                            <div className="border-b border-gray-200">
                                <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`${activeTab === tab.id
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                                        >
                                            {tab.name}
                                            {tab.count > 0 && (
                                                <span className={`${activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-900'
                                                    } ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium`}>
                                                    {tab.count}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="p-0">
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
                        </div>
                    </div>

                    {/* Right Column - Email Editor */}
                    <div>
                        <EmailEditor
                            recipients={selectedRecipients}
                            onSend={handleEmailSent}
                        />
                    </div>
                </div>
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
