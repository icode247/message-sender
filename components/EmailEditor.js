import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Send, Save, Eye } from 'lucide-react';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function EmailEditor({ onSend, recipients = [] }) {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [isPreview, setIsPreview] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const formats = [
        'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent', 'link', 'image'
    ];

    const handleSend = async () => {
        if (!subject.trim() || !content.trim()) {
            alert('Please fill in both subject and content');
            return;
        }

        if (recipients.length === 0) {
            alert('Please select recipients');
            return;
        }

        setIsSending(true);

        try {
            const response = await fetch('/api/emails/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject,
                    content,
                    recipients,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Successfully sent ${result.sent} emails! Failed: ${result.failed}`);
                if (onSend) onSend(result);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            alert('Failed to send emails: ' + error.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Compose Email
                </h2>

                {/* Recipients info */}
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                        Recipients: {recipients.length} selected
                    </p>
                </div>

                {/* Subject */}
                <div className="mb-4">
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                    </label>
                    <input
                        type="text"
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email subject..."
                    />
                </div>

                {/* Content Editor */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content
                    </label>
                    {!isPreview ? (
                        <div className="border border-gray-300 rounded-md">
                            <ReactQuill
                                value={content}
                                onChange={setContent}
                                modules={modules}
                                formats={formats}
                                style={{ height: '300px' }}
                                className="mb-12"
                            />
                        </div>
                    ) : (
                        <div className="border border-gray-300 rounded-md p-4 min-h-[300px] bg-gray-50">
                            <div dangerouslySetInnerHTML={{ __html: content }} />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4">
                    <button
                        type="button"
                        onClick={() => setIsPreview(!isPreview)}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        {isPreview ? 'Edit' : 'Preview'}
                    </button>

                    <div className="flex space-x-3">
                        <button
                            type="button"
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Draft
                        </button>

                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={isSending || recipients.length === 0}
                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {isSending ? 'Sending...' : `Send to ${recipients.length}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}