import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Plus, Trash2, Edit, Check, X, Search, Loader, Upload, FileText } from 'lucide-react';
import Papa from 'papaparse';

export default function GroupManager({ onGroupSelect }) {
    const [groups, setGroups] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [displayedContacts, setDisplayedContacts] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [newGroup, setNewGroup] = useState({
        name: '',
        description: '',
        contactIds: []
    });
    const [error, setError] = useState('');
    const [contactSearchTerm, setContactSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreContacts, setHasMoreContacts] = useState(true);
    const [importMethod, setImportMethod] = useState('select');
    const [csvContacts, setCsvContacts] = useState([]);
    const [csvFile, setCsvFile] = useState(null);
    const observerTarget = useRef(null);
    const fileInputRef = useRef(null);

    const CONTACTS_PER_PAGE = 20;

    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        if (showCreateForm) {
            setCurrentPage(1);
            setHasMoreContacts(true);
            fetchContacts(1, true);
        }
    }, [showCreateForm]);

    useEffect(() => {
        if (showCreateForm) {
            setCurrentPage(1);
            setHasMoreContacts(true);
            fetchContacts(1, true);
        }
    }, [contactSearchTerm]);

    useEffect(() => {
        if (!showCreateForm) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMoreContacts && !isLoadingMore) {
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
    }, [hasMoreContacts, isLoadingMore, showCreateForm]);

    const fetchGroups = async () => {
        try {
            const response = await fetch('/api/emails/groups');
            if (response.ok) {
                const data = await response.json();
                setGroups(data);
            } else {
                const error = await response.json();
                setError(error.message || 'Failed to fetch groups');
            }
        } catch (error) {
            console.error('Failed to fetch groups:', error);
            setError('Failed to fetch groups');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchContacts = async (page = 1, reset = false) => {
        if (reset) {
            setIsLoadingContacts(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: CONTACTS_PER_PAGE.toString(),
                search: contactSearchTerm
            });

            const response = await fetch(`/api/contacts?${params}`);
            if (response.ok) {
                const data = await response.json();
                
                if (reset) {
                    setContacts(data.contacts || data);
                    setDisplayedContacts(data.contacts || data);
                } else {
                    const newContacts = data.contacts || data;
                    setContacts(prev => [...prev, ...newContacts]);
                    setDisplayedContacts(prev => [...prev, ...newContacts]);
                }

                const contactsReceived = data.contacts ? data.contacts.length : data.length;
                setHasMoreContacts(contactsReceived === CONTACTS_PER_PAGE);
                
            } else {
                const error = await response.json();
                setError(error.message || 'Failed to fetch contacts');
            }
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
            setError('Failed to fetch contacts');
        } finally {
            setIsLoadingContacts(false);
            setIsLoadingMore(false);
        }
    };

    const loadMoreContacts = useCallback(() => {
        if (isLoadingMore || !hasMoreContacts) return;
        
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchContacts(nextPage, false);
    }, [currentPage, hasMoreContacts, isLoadingMore]);

    const handleCsvFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            setError('Please select a CSV file');
            return;
        }

        setCsvFile(file);
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const validContacts = [];
                    const errors = [];

                    results.data.forEach((row, index) => {
                        const email = (row.email || row.Email || '').trim();
                        const name = (row.name || row.Name || '').trim();

                        if (!email) {
                            errors.push(`Row ${index + 1}: Missing email`);
                            return;
                        }

                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(email)) {
                            errors.push(`Row ${index + 1}: Invalid email format`);
                            return;
                        }

                        validContacts.push({
                            email: email.toLowerCase(),
                            name: name || ''
                        });
                    });

                    if (errors.length > 0) {
                        setError(`CSV processing warnings:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`);
                    } else {
                        setError('');
                    }

                    setCsvContacts(validContacts);
                    
                    if (validContacts.length > 0) {
                        console.log(`✅ Processed ${validContacts.length} contacts from CSV`);
                    }

                } catch (error) {
                    setError('Failed to process CSV file: ' + error.message);
                    setCsvContacts([]);
                }
            },
            error: (error) => {
                setError('Failed to parse CSV file: ' + error.message);
                setCsvContacts([]);
            }
        });
    };

    const removeCsvContact = (index) => {
        setCsvContacts(csvContacts.filter((_, i) => i !== index));
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        setError('');

        if (!newGroup.name.trim()) {
            setError('Group name is required');
            return;
        }

        const hasContacts = importMethod === 'csv' 
            ? csvContacts.length > 0 
            : newGroup.contactIds.length > 0;

        if (!hasContacts) {
            setError('Please select at least one contact or import contacts via CSV');
            return;
        }

        try {
            let finalContactIds = [...newGroup.contactIds];

            if (importMethod === 'csv' && csvContacts.length > 0) {
                for (const csvContact of csvContacts) {
                    try {
                        const contactResponse = await fetch('/api/contacts', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                email: csvContact.email,
                                name: csvContact.name
                            }),
                        });

                        if (contactResponse.ok) {
                            const createdContact = await contactResponse.json();
                            finalContactIds.push(createdContact.id);
                        } else {
                            const contactResult = await contactResponse.json();
                            if (contactResult.existingId) {
                                finalContactIds.push(contactResult.existingId);
                            }
                        }
                    } catch (contactError) {
                        console.error('Failed to create contact:', contactError);
                    }
                }
            }

            const groupData = {
                ...newGroup,
                contactIds: finalContactIds
            };

            const response = await fetch('/api/emails/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(groupData),
            });

            const result = await response.json();

            if (response.ok) {
                setNewGroup({ name: '', description: '', contactIds: [] });
                setCsvContacts([]);
                setCsvFile(null);
                setShowCreateForm(false);
                setError('');
                fetchGroups();
            } else {
                setError(result.message || 'Failed to create group');
            }
        } catch (error) {
            console.error('Failed to create group:', error);
            setError('Failed to create group: ' + error.message);
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!confirm('Are you sure you want to delete this group?')) return;

        try {
            const response = await fetch(`/api/emails/groups?id=${groupId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchGroups();
                if (selectedGroup?.id === groupId) {
                    setSelectedGroup(null);
                    if (onGroupSelect) {
                        onGroupSelect([]);
                    }
                }
            } else {
                const error = await response.json();
                setError(error.message || 'Failed to delete group');
            }
        } catch (error) {
            console.error('Failed to delete group:', error);
            setError('Failed to delete group: ' + error.message);
        }
    };

    const handleContactSelection = (contactId, isSelected) => {
        if (isSelected) {
            setNewGroup({
                ...newGroup,
                contactIds: [...newGroup.contactIds, contactId]
            });
        } else {
            setNewGroup({
                ...newGroup,
                contactIds: newGroup.contactIds.filter(id => id !== contactId)
            });
        }
    };

    const handleSelectAllDisplayed = () => {
        const displayedContactIds = displayedContacts.map(c => c.id);
        const allDisplayedSelected = displayedContactIds.every(id => newGroup.contactIds.includes(id));

        if (allDisplayedSelected) {
            setNewGroup({
                ...newGroup,
                contactIds: newGroup.contactIds.filter(id => !displayedContactIds.includes(id))
            });
        } else {
            const newSelectedIds = [...new Set([...newGroup.contactIds, ...displayedContactIds])];
            setNewGroup({
                ...newGroup,
                contactIds: newSelectedIds
            });
        }
    };

    const handleGroupSelection = (group) => {
        setSelectedGroup(group);
        if (onGroupSelect) {
            const groupContacts = group.contacts.map(gc => gc.contact);
            onGroupSelect(groupContacts);
        }
    };

    const resetForm = () => {
        setNewGroup({ name: '', description: '', contactIds: [] });
        setCsvContacts([]);
        setCsvFile(null);
        setShowCreateForm(false);
        setContacts([]);
        setDisplayedContacts([]);
        setContactSearchTerm('');
        setCurrentPage(1);
        setHasMoreContacts(true);
        setError('');
    };

    const getSelectedContactsCount = () => {
        return newGroup.contactIds.length;
    };

    const getDisplayedSelectedCount = () => {
        const displayedContactIds = displayedContacts.map(c => c.id);
        return displayedContactIds.filter(id => newGroup.contactIds.includes(id)).length;
    };

    if (isLoading) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                    Email Groups ({groups.length})
                </h2>

                <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {showCreateForm && (
                <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                    <form onSubmit={handleCreateGroup}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Group Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newGroup.name}
                                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter group name..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newGroup.description}
                                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Optional group description..."
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Add Contacts to Group
                                    </label>
                                    <div className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => setImportMethod('select')}
                                            className={`px-3 py-1 text-sm rounded-md ${
                                                importMethod === 'select'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            Select Contacts
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setImportMethod('csv')}
                                            className={`px-3 py-1 text-sm rounded-md ${
                                                importMethod === 'csv'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            Import CSV
                                        </button>
                                    </div>
                                </div>

                                {importMethod === 'select' && (
                                    <>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-600">
                                                Select Contacts ({getSelectedContactsCount()} selected)
                                            </span>
                                            {displayedContacts.length > 0 && (
                                                <div className="flex space-x-2">
                                                    <span className="text-xs text-gray-500">
                                                        {getDisplayedSelectedCount()}/{displayedContacts.length} shown
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleSelectAllDisplayed}
                                                        className="text-sm text-blue-600 hover:text-blue-800"
                                                    >
                                                        {getDisplayedSelectedCount() === displayedContacts.length ? 'Deselect Shown' : 'Select Shown'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-3">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="text"
                                                    placeholder="Search contacts..."
                                                    value={contactSearchTerm}
                                                    onChange={(e) => setContactSearchTerm(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                                            {isLoadingContacts ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <Loader className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                                                    <span className="text-sm text-gray-600">Loading contacts...</span>
                                                </div>
                                            ) : displayedContacts.length === 0 ? (
                                                <p className="text-sm text-gray-500 text-center py-4">
                                                    {contactSearchTerm ? 'No contacts found matching your search.' : 'No contacts available. Add contacts first.'}
                                                </p>
                                            ) : (
                                                <div className="p-2">
                                                    <div className="space-y-2">
                                                        {displayedContacts.map((contact) => (
                                                            <label key={contact.id} className="flex items-center hover:bg-gray-50 p-2 rounded">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={newGroup.contactIds.includes(contact.id)}
                                                                    onChange={(e) => handleContactSelection(contact.id, e.target.checked)}
                                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="text-sm text-gray-900 font-medium">
                                                                        {contact.email}
                                                                    </div>
                                                                    {contact.name && (
                                                                        <div className="text-xs text-gray-500">
                                                                            {contact.name}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>

                                                    {isLoadingMore && (
                                                        <div className="flex justify-center items-center py-4">
                                                            <Loader className="w-4 h-4 animate-spin text-blue-600 mr-2" />
                                                            <span className="text-sm text-gray-600">Loading more contacts...</span>
                                                        </div>
                                                    )}

                                                    {hasMoreContacts && !isLoadingMore && displayedContacts.length > 0 && (
                                                        <div ref={observerTarget} className="h-4 flex justify-center items-center">
                                                            <span className="text-xs text-gray-400">Scroll to load more</span>
                                                        </div>
                                                    )}

                                                    {!hasMoreContacts && displayedContacts.length > CONTACTS_PER_PAGE && (
                                                        <div className="flex justify-center items-center py-4">
                                                            <span className="text-sm text-gray-500">
                                                                End of results ({displayedContacts.length} contacts shown)
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {importMethod === 'csv' && (
                                    <>
                                        <div className="mb-4">
                                            <div className="flex items-center justify-center w-full">
                                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                                        <p className="mb-2 text-sm text-gray-500">
                                                            <span className="font-semibold">Click to upload</span> or drag and drop
                                                        </p>
                                                        <p className="text-xs text-gray-500">CSV files only</p>
                                                    </div>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept=".csv"
                                                        onChange={handleCsvFileUpload}
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                            
                                            {csvFile && (
                                                <div className="mt-2 flex items-center text-sm text-gray-600">
                                                    <FileText className="w-4 h-4 mr-1" />
                                                    {csvFile.name}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                            <p className="text-sm text-blue-700 font-medium mb-1">CSV Format:</p>
                                            <p className="text-xs text-blue-600">
                                                Required: <code>email</code> column only<br />
                                                Optional: <code>name</code> column<br />
                                                Example: email<br />
                                                john@example.com<br />
                                                jane@example.com
                                            </p>
                                        </div>

                                        {csvContacts.length > 0 && (
                                            <div className="mb-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-medium text-green-700">
                                                        ✅ Ready to import ({csvContacts.length} contacts)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCsvContacts([])}
                                                        className="text-sm text-red-600 hover:text-red-800"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                                    <p className="text-sm text-green-700">
                                                        All contacts will be added to this group automatically.
                                                    </p>
                                                </div>
                                                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md mt-2">
                                                    <div className="p-2 space-y-1">
                                                        {csvContacts.slice(0, 10).map((contact, index) => (
                                                            <div key={index} className="flex items-center justify-between text-sm p-1 hover:bg-gray-50 rounded">
                                                                <span>
                                                                    <span className="font-medium">{contact.email}</span>
                                                                    {contact.name && <span className="text-gray-500 ml-2">({contact.name})</span>}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeCsvContact(index)}
                                                                    className="text-red-500 hover:text-red-700"
                                                                    title="Remove from import"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {csvContacts.length > 10 && (
                                                            <div className="text-xs text-gray-500 text-center py-1">
                                                                ... and {csvContacts.length - 10} more contacts
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex space-x-3">
                            <button
                                type="submit"
                                disabled={importMethod === 'select' ? getSelectedContactsCount() === 0 : csvContacts.length === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create Group 
                                {importMethod === 'select' 
                                    ? ` (${getSelectedContactsCount()} contacts)` 
                                    : ` (${csvContacts.length} contacts)`
                                }
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {selectedGroup && (
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                        Selected: {selectedGroup.name} ({selectedGroup.contacts.length} contacts)
                    </p>
                </div>
            )}

            <div className="space-y-3">
                {groups.map((group) => (
                    <div
                        key={group.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedGroup?.id === group.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        onClick={() => handleGroupSelection(group)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Users className="w-5 h-5 text-gray-400" />
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900">
                                        {group.name}
                                    </h3>
                                    {group.description && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {group.description}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                        {group.contacts.length} contact(s)
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteGroup(group.id);
                                    }}
                                    className="text-red-600 hover:text-red-900"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {selectedGroup?.id === group.id && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
                                <p className="text-xs text-blue-600 mb-2">Contacts in this group:</p>
                                <div className="flex flex-wrap gap-1">
                                    {group.contacts.map((gc) => (
                                        <span
                                            key={gc.contact.id}
                                            className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                        >
                                            {gc.contact.email}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {groups.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No groups</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Get started by creating your first email group.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}