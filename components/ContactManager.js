import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, UserPlus, Trash2, Download, Search, Loader } from 'lucide-react';
import Papa from 'papaparse';

export default function ContactManager({ onSelectionChange }) {
    const [contacts, setContacts] = useState([]);
    const [displayedContacts, setDisplayedContacts] = useState([]);
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newContact, setNewContact] = useState({ email: '', name: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const fileInputRef = useRef(null);
    const observerTarget = useRef(null);

    // Pagination settings
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        // Reset pagination when search term changes
        setCurrentPage(1);
        setHasMore(true);
        filterAndPaginateContacts(1, searchTerm);
    }, [contacts, searchTerm]);

    useEffect(() => {
        // Notify parent component of selection changes
        if (onSelectionChange) {
            onSelectionChange(selectedContacts);
        }
    }, [selectedContacts, onSelectionChange]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    loadMoreContacts();
                }
            },
            { threshold: 1.0, rootMargin: '50px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, isLoadingMore]);

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

    const filterAndPaginateContacts = useCallback((page = 1, search = searchTerm) => {
        // Filter contacts based on search term
        const filtered = contacts.filter(contact =>
            contact.email.toLowerCase().includes(search.toLowerCase()) ||
            contact.name?.toLowerCase().includes(search.toLowerCase())
        );

        // Calculate pagination
        const startIndex = 0;
        const endIndex = page * ITEMS_PER_PAGE;
        const paginatedContacts = filtered.slice(startIndex, endIndex);

        setDisplayedContacts(paginatedContacts);
        setHasMore(endIndex < filtered.length);
    }, [contacts, searchTerm]);

    const loadMoreContacts = useCallback(() => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);

        // Simulate network delay for better UX
        setTimeout(() => {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            filterAndPaginateContacts(nextPage, searchTerm);
            setIsLoadingMore(false);
        }, 300);
    }, [currentPage, searchTerm, hasMore, isLoadingMore, filterAndPaginateContacts]);

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
        // Get all filtered contacts (not just displayed ones)
        const filtered = contacts.filter(contact =>
            contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (selectedContacts.length === filtered.length) {
            setSelectedContacts([]);
        } else {
            setSelectedContacts([...filtered]);
        }
    };

    const handleSelectAllDisplayed = () => {
        if (selectedContacts.length === displayedContacts.length) {
            setSelectedContacts([]);
        } else {
            setSelectedContacts([...displayedContacts]);
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

    const getFilteredContactsCount = () => {
        return contacts.filter(contact =>
            contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.name?.toLowerCase().includes(searchTerm.toLowerCase())
        ).length;
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
                    Contacts ({getFilteredContactsCount()})
                    {searchTerm && (
                        <span className="text-sm text-gray-500 ml-2">
                            (showing {displayedContacts.length})
                        </span>
                    )}
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
                <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={displayedContacts.length > 0 && selectedContacts.length === displayedContacts.length}
                                            onChange={handleSelectAllDisplayed}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={handleSelectAll}
                                            className="text-xs text-blue-600 hover:text-blue-800"
                                            title="Select all filtered contacts"
                                        >
                                            All
                                        </button>
                                    </div>
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
                            {displayedContacts.map((contact) => (
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

                    {/* Loading more indicator */}
                    {isLoadingMore && (
                        <div className="flex justify-center items-center py-4">
                            <Loader className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                            <span className="text-sm text-gray-600">Loading more contacts...</span>
                        </div>
                    )}

                    {/* Intersection Observer Target */}
                    {hasMore && !isLoadingMore && displayedContacts.length > 0 && (
                        <div ref={observerTarget} className="h-4 flex justify-center items-center">
                            <span className="text-xs text-gray-400">Scroll to load more</span>
                        </div>
                    )}

                    {/* End of results indicator */}
                    {!hasMore && displayedContacts.length > ITEMS_PER_PAGE && (
                        <div className="flex justify-center items-center py-4">
                            <span className="text-sm text-gray-500">
                                End of results ({displayedContacts.length} contacts shown)
                            </span>
                        </div>
                    )}
                </div>

                {displayedContacts.length === 0 && (
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