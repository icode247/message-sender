import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LogOut, Mail, Users, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Layout({ children }) {
    const router = useRouter();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: Mail },
        { name: 'Contacts', href: '/contacts', icon: Users },
        { name: 'Send Email', href: '/send', icon: Send },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Mail className="h-8 w-8 text-blue-600" />
                                <span className="ml-2 text-xl font-bold text-gray-900">
                                    Email Sender
                                </span>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {navigation.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => router.push(item.href)}
                                            className={`${router.pathname === item.href
                                                    ? 'border-blue-500 text-gray-900'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                                        >
                                            <Icon className="h-4 w-4 mr-2" />
                                            {item.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex items-center">
                            {user && (
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-gray-700">
                                        Welcome, {user.name || user.email}
                                    </span>
                                    <button
                                        onClick={handleLogout}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}