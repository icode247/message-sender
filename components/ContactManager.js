import { useState, useEffect, useRef } from 'react';
import { Upload, UserPlus, Trash2, Download, Search } from 'lucide-react';
import Papa from 'papaparse';

export default function ContactManager({ onSelectionChange }) {
    const [contacts, setContacts] = useState([]);
    const [filteredContacts, setFilteredContacts] = useState([]);
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newContact, setNewContact] = useState({ email: '', name: '' });
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        // Filter contacts based on search term
        const filtered = contacts.filter(contact =>
            contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredContacts(filtered);
    }, [contacts, searchTerm]);

    useEffect(() => {
        // Notify parent component of selection changes
        if (onSelectionChange) {
            onSelectionChange(selectedContacts);
        }
    }, [selectedContacts, onSelectionChange]);

    const fetchContacts = async () => {
        try {
            const response = await fetch('/api/contacts');
            if (response.ok) {
                const data = await response.json();
                setContacts(data);
            }
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                try {
                    const csvData = Papa.unparse(results.data);
                    const response = await fetch('/api/emails/import', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ csvData }),
                    });

                    const result = await response.json();

                    if (response.ok) {
                        alert(`Imported ${result.imported} contacts successfully!`);
                        if (result.errors > 0) {
                            console.log('Import errors:', result.errorMessages);
                        }
                        fetchContacts();
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    alert('Failed to import contacts: ' + error.message);
                }
            },
            error: (error) => {
                alert('Failed to parse CSV file: ' + error.message);
            }
        });
    };

    const handleAddContact = async (e) => {
        e.preventDefault();

        if (!newContact.email.trim()) {
            alert('Email is required');
            return;
        }

        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newContact),
            });

            if (response.ok) {
                setNewContact({ email: '', name: '' });
                setShowAddForm(false);
                fetchContacts();
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error) {
            alert('Failed to add contact: ' + error.message);
        }
    };

    const handleDeleteContact = async (contactId) => {
        if (!confirm('Are you sure you want to delete this contact?')) return;

        try {
            const response = await fetch(`/api/contacts?id=${contactId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchContacts();
                setSelectedContacts(selectedContacts.filter(c => c.id !== contactId));
            } else {
                throw new Error('Failed to delete contact');
            }
        } catch (error) {
            alert('Failed to delete contact: ' + error.message);
        }
    };

    const handleContactSelection = (contact, isSelected) => {
        if (isSelected) {
            setSelectedContacts([...selectedContacts, contact]);
        } else {
            setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
        }
    };

    const handleSelectAll = () => {
        if (selectedContacts.length === filteredContacts.length) {
            setSelectedContacts([]);
        } else {
            setSelectedContacts([...filteredContacts]);
        }
    };

    const exportContacts = () => {
        const csv = Papa.unparse(contacts.map(c => ({
            email: c.email,
            name: c.name || '',
        })));

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'contacts.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                    Contacts ({filteredContacts.length})
                </h2>

                <div className="flex space-x-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Import CSV
                    </button>

                    <button
                        onClick={exportContacts}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </button>

                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Contact
                    </button>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
            />

            {/* Search */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Selection info */}
            {selectedContacts.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                        {selectedContacts.length} contact(s) selected
                    </p>
                </div>
            )}

            {/* Add Contact Form */}
            {showAddForm && (
                <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                    <form onSubmit={handleAddContact}>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={newContact.email}
                                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex space-x-3">
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                            >
                                Add Contact
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Contacts Table */}
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="checkbox"
                                    checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredContacts.map((contact) => (
                            <tr key={contact.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedContacts.some(c => c.id === contact.id)}
                                        onChange={(e) => handleContactSelection(contact, e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {contact.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {contact.name || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <button
                                        onClick={() => handleDeleteContact(contact.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredContacts.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-sm text-gray-500">
                            {searchTerm ? 'No contacts found matching your search.' : 'No contacts yet. Add some contacts to get started.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}