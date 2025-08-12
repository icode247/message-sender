import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit, Check, X } from 'lucide-react';

export default function GroupManager({ contacts = [], onGroupSelect }) {
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [newGroup, setNewGroup] = useState({
        name: '',
        description: '',
        contactIds: []
    });

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const response = await fetch('/api/emails/groups');
            if (response.ok) {
                const data = await response.json();
                setGroups(data);
            }
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();

        if (!newGroup.name.trim()) {
            alert('Group name is required');
            return;
        }

        if (newGroup.contactIds.length === 0) {
            alert('Please select at least one contact');
            return;
        }

        try {
            const response = await fetch('/api/emails/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newGroup),
            });

            if (response.ok) {
                setNewGroup({ name: '', description: '', contactIds: [] });
                setShowCreateForm(false);
                fetchGroups();
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error) {
            alert('Failed to create group: ' + error.message);
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
                }
            } else {
                throw new Error('Failed to delete group');
            }
        } catch (error) {
            alert('Failed to delete group: ' + error.message);
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

    const handleGroupSelection = (group) => {
        setSelectedGroup(group);
        if (onGroupSelect) {
            const groupContacts = group.contacts.map(gc => gc.contact);
            onGroupSelect(groupContacts);
        }
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

            {/* Create Group Form */}
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Contacts ({newGroup.contactIds.length} selected)
                                </label>
                                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                                    {contacts.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">
                                            No contacts available. Add contacts first.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {contacts.map((contact) => (
                                                <label key={contact.id} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={newGroup.contactIds.includes(contact.id)}
                                                        onChange={(e) => handleContactSelection(contact.id, e.target.checked)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                                                    />
                                                    <span className="text-sm text-gray-900">
                                                        {contact.email} {contact.name && `(${contact.name})`}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex space-x-3">
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                            >
                                Create Group
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Selected group info */}
            {selectedGroup && (
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                        Selected: {selectedGroup.name} ({selectedGroup.contacts.length} contacts)
                    </p>
                </div>
            )}

            {/* Groups List */}
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