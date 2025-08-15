import { useState, useRef } from 'react';
import { 
    Send, Save, Eye, Bold, Italic, Underline, Link, List, ListOrdered, 
    Image, Type, Palette, AlignLeft, AlignCenter, AlignRight, User,
    Mail, Calendar, MapPin, Phone, Globe, Tag
} from 'lucide-react';

export default function EmailEditor({ onSend, recipients = [] }) {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [isPreview, setIsPreview] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('basic');
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    // Newsletter templates
    const templates = {
        basic: {
            name: 'Basic',
            style: '',
            wrapper: (content) => content
        },
        newsletter: {
            name: 'Newsletter',
            style: `
                .email-wrapper { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    font-family: Arial, sans-serif; 
                    background: white;
                    border: 1px solid #e5e7eb;
                }
                .email-header { 
                    background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
                    color: white; 
                    padding: 30px; 
                    text-align: center; 
                }
                .email-body { 
                    padding: 30px; 
                    line-height: 1.6; 
                }
                .email-footer { 
                    background: #f9fafb; 
                    padding: 20px; 
                    text-align: center; 
                    font-size: 14px; 
                    color: #6b7280; 
                }
            `,
            wrapper: (content) => `
                <div class="email-wrapper">
                    <div class="email-header">
                        <h1 style="margin: 0; font-size: 28px;">{{COMPANY_NAME}}</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">{{NEWSLETTER_SUBTITLE}}</p>
                    </div>
                    <div class="email-body">
                        ${content}
                    </div>
                    <div class="email-footer">
                        <p>© 2024 {{COMPANY_NAME}}. All rights reserved.</p>
                        <p>{{COMPANY_ADDRESS}}</p>
                    </div>
                </div>
            `
        },
        promotional: {
            name: 'Promotional',
            style: `
                .email-wrapper { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    font-family: Arial, sans-serif; 
                    background: white;
                }
                .promo-banner { 
                    background: linear-gradient(45deg, #ef4444, #dc2626); 
                    color: white; 
                    padding: 15px; 
                    text-align: center; 
                    font-weight: bold;
                }
                .email-content { 
                    padding: 30px; 
                }
                .cta-button { 
                    display: inline-block; 
                    background: #10b981; 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold; 
                    margin: 20px 0;
                }
            `,
            wrapper: (content) => `
                <div class="email-wrapper">
                    <div class="promo-banner">
                        🎉 SPECIAL OFFER - Limited Time Only!
                    </div>
                    <div class="email-content">
                        ${content}
                    </div>
                </div>
            `
        }
    };

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
            // Process content with template
            const template = templates[selectedTemplate];
            let processedContent = content;
            
            // Apply template wrapper
            if (template.wrapper) {
                processedContent = `
                    <style>${template.style}</style>
                    ${template.wrapper(processedContent)}
                `;
            }

            const response = await fetch('/api/emails/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject,
                    content: processedContent,
                    recipients,
                    useTemplate: selectedTemplate !== 'basic',
                    personalizeNames: true // Flag to process {{NAME}} placeholders
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

    const formatText = (command, value = null) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.slice(start, end);
        let newText = '';

        switch (command) {
            case 'bold':
                newText = selectedText ? `<strong>${selectedText}</strong>` : '<strong>bold text</strong>';
                break;
            case 'italic':
                newText = selectedText ? `<em>${selectedText}</em>` : '<em>italic text</em>';
                break;
            case 'underline':
                newText = selectedText ? `<u>${selectedText}</u>` : '<u>underlined text</u>';
                break;
            case 'link':
                const url = prompt('Enter URL:');
                if (url) {
                    newText = selectedText ? `<a href="${url}" style="color: #3b82f6;">${selectedText}</a>` : `<a href="${url}" style="color: #3b82f6;">link text</a>`;
                } else {
                    return;
                }
                break;
            case 'list':
                newText = selectedText ? `<li>${selectedText}</li>` : '<li>List item</li>';
                break;
            case 'orderedList':
                newText = selectedText ? `<li>${selectedText}</li>` : '<li>Numbered item</li>';
                break;
            case 'heading':
                const level = value || '2';
                newText = selectedText ? `<h${level} style="color: #1f2937; margin: 20px 0 10px 0;">${selectedText}</h${level}>` : `<h${level} style="color: #1f2937; margin: 20px 0 10px 0;">Heading ${level}</h${level}>`;
                break;
            case 'paragraph':
                newText = selectedText ? `<p style="margin: 15px 0; line-height: 1.6;">${selectedText}</p>` : '<p style="margin: 15px 0; line-height: 1.6;">Paragraph text</p>';
                break;
            case 'divider':
                newText = '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 30px 0;">';
                break;
            case 'button':
                const buttonText = prompt('Button text:') || 'Click Here';
                const buttonUrl = prompt('Button URL:') || '#';
                newText = `<a href="${buttonUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">${buttonText}</a>`;
                break;
            case 'name':
                newText = '{{NAME}}';
                break;
            case 'email':
                newText = '{{EMAIL}}';
                break;
            case 'image':
                handleImageUpload();
                return;
            case 'align':
                const alignment = value || 'left';
                newText = selectedText ? `<div style="text-align: ${alignment};">${selectedText}</div>` : `<div style="text-align: ${alignment};">Aligned content</div>`;
                break;
            default:
                return;
        }

        const newContent = content.slice(0, start) + newText + content.slice(end);
        setContent(newContent);

        // Restore focus and cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start, start + newText.length);
        }, 0);
    };

    const handleImageUpload = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            const altText = prompt('Image description (alt text):') || 'Image';
            const imageTag = `<img src="${imageUrl}" alt="${altText}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0;" />`;
            
            const textarea = textareaRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = content.slice(0, start) + imageTag + content.slice(end);
            setContent(newContent);
        };
        reader.readAsDataURL(file);
    };

    const insertTemplate = (templateType) => {
        let templateContent = '';
        
        switch (templateType) {
            case 'welcome':
                templateContent = `
                    <h2 style="color: #1f2937; margin: 20px 0 10px 0;">Welcome {{NAME}}!</h2>
                    <p style="margin: 15px 0; line-height: 1.6;">Thank you for joining our community. We're excited to have you on board!</p>
                    <a href="#" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">Get Started</a>
                `;
                break;
            case 'newsletter':
                templateContent = `
                    <h2 style="color: #1f2937; margin: 20px 0 10px 0;">This Week's Updates</h2>
                    <p style="margin: 15px 0; line-height: 1.6;">Hi {{NAME}}, here's what's happening this week:</p>
                    <ul style="margin: 15px 0; padding-left: 20px;">
                        <li style="margin: 8px 0;">Feature update: New dashboard</li>
                        <li style="margin: 8px 0;">Community highlight</li>
                        <li style="margin: 8px 0;">Upcoming events</li>
                    </ul>
                `;
                break;
            case 'promotion':
                templateContent = `
                    <h2 style="color: #dc2626; margin: 20px 0 10px 0;">🎉 Special Offer for {{NAME}}!</h2>
                    <p style="margin: 15px 0; line-height: 1.6;">Don't miss out on this limited-time offer just for you!</p>
                    <div style="background: #fef2f2; border: 2px solid #fca5a5; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                        <h3 style="color: #dc2626; margin: 0 0 10px 0;">50% OFF</h3>
                        <p style="margin: 0;">Use code: SAVE50</p>
                    </div>
                    <a href="#" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">Shop Now</a>
                `;
                break;
        }
        
        setContent(content + templateContent);
    };

    const formatContentForPreview = (text) => {
        let formatted = text
            .replace(/{{NAME}}/g, '<span style="background: #fef3c7; padding: 2px 4px; border-radius: 3px;">John Doe</span>')
            .replace(/{{EMAIL}}/g, '<span style="background: #fef3c7; padding: 2px 4px; border-radius: 3px;">john@example.com</span>')
            .replace(/{{COMPANY_NAME}}/g, '<span style="background: #fef3c7; padding: 2px 4px; border-radius: 3px;">Your Company</span>')
            .replace(/{{NEWSLETTER_SUBTITLE}}/g, '<span style="background: #fef3c7; padding: 2px 4px; border-radius: 3px;">Weekly Newsletter</span>')
            .replace(/{{COMPANY_ADDRESS}}/g, '<span style="background: #fef3c7; padding: 2px 4px; border-radius: 3px;">123 Main St, City, State</span>');

        // Apply template styling if selected
        const template = templates[selectedTemplate];
        if (template && template.wrapper && selectedTemplate !== 'basic') {
            formatted = `<style>${template.style}</style>${template.wrapper(formatted)}`;
        }

        return formatted;
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Compose Email
                </h2>

                {/* Template Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Template
                    </label>
                    <div className="flex space-x-2">
                        {Object.entries(templates).map(([key, template]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedTemplate(key)}
                                className={`px-3 py-2 text-sm border rounded-md ${
                                    selectedTemplate === key
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {template.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recipients info */}
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                        Recipients: {recipients.length} selected • Names will be personalized automatically
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
                        placeholder="Enter email subject... (use {{NAME}} for personalization)"
                    />
                </div>

                {/* Quick Templates */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quick Templates
                    </label>
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => insertTemplate('welcome')}
                            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                        >
                            Welcome Email
                        </button>
                        <button
                            type="button"
                            onClick={() => insertTemplate('newsletter')}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                        >
                            Newsletter
                        </button>
                        <button
                            type="button"
                            onClick={() => insertTemplate('promotion')}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                        >
                            Promotion
                        </button>
                    </div>
                </div>

                {/* Content Editor */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content
                    </label>
                    
                    {!isPreview ? (
                        <div className="border border-gray-300 rounded-md">
                            {/* Toolbar */}
                            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-300 bg-gray-50">
                                {/* Text Formatting */}
                                <div className="flex items-center space-x-1">
                                    <button
                                        type="button"
                                        onClick={() => formatText('bold')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Bold"
                                    >
                                        <Bold className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => formatText('italic')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Italic"
                                    >
                                        <Italic className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => formatText('underline')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Underline"
                                    >
                                        <Underline className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-gray-300"></div>

                                {/* Structure */}
                                <div className="flex items-center space-x-1">
                                    <select
                                        onChange={(e) => formatText('heading', e.target.value)}
                                        className="text-sm border border-gray-300 rounded px-2 py-1"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Heading</option>
                                        <option value="1">H1</option>
                                        <option value="2">H2</option>
                                        <option value="3">H3</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => formatText('paragraph')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Paragraph"
                                    >
                                        <Type className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-gray-300"></div>

                                {/* Alignment */}
                                <div className="flex items-center space-x-1">
                                    <button
                                        type="button"
                                        onClick={() => formatText('align', 'left')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Align Left"
                                    >
                                        <AlignLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => formatText('align', 'center')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Align Center"
                                    >
                                        <AlignCenter className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => formatText('align', 'right')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Align Right"
                                    >
                                        <AlignRight className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-gray-300"></div>

                                {/* Lists and Links */}
                                <div className="flex items-center space-x-1">
                                    <button
                                        type="button"
                                        onClick={() => formatText('link')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Link"
                                    >
                                        <Link className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => formatText('list')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Bullet List"
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => formatText('orderedList')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Numbered List"
                                    >
                                        <ListOrdered className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-gray-300"></div>

                                {/* Media and Components */}
                                <div className="flex items-center space-x-1">
                                    <button
                                        type="button"
                                        onClick={() => formatText('image')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Insert Image"
                                    >
                                        <Image className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => formatText('button')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Insert Button"
                                    >
                                        <Tag className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => formatText('divider')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Insert Divider"
                                    >
                                        ─
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-gray-300"></div>

                                {/* Personalization */}
                                <div className="flex items-center space-x-1">
                                    <button
                                        type="button"
                                        onClick={() => formatText('name')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Insert Name"
                                    >
                                        <User className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => formatText('email')}
                                        className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                                        title="Insert Email"
                                    >
                                        <Mail className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Text Area */}
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full p-4 border-0 focus:outline-none focus:ring-0 resize-none"
                                rows={15}
                                placeholder="Write your email content here... Use {{NAME}} and {{EMAIL}} for personalization"
                            />
                        </div>
                    ) : (
                        <div className="border border-gray-300 rounded-md p-4 min-h-[400px] bg-gray-50 overflow-auto">
                            <div 
                                dangerouslySetInnerHTML={{ 
                                    __html: formatContentForPreview(content) 
                                }} 
                            />
                        </div>
                    )}
                    
                    {/* Format Help */}
                    {!isPreview && (
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <p><strong>Personalization:</strong> {'{'}{'{'}<strong>NAME</strong>{'}'}{'}'},  {'{'}{'{'}<strong>EMAIL</strong>{'}'}{'}'},  {'{'}{'{'}<strong>COMPANY_NAME</strong>{'}'}{'}'}
                            </p>
                            <p><strong>Formatting:</strong> Use the toolbar above or HTML tags directly</p>
                        </div>
                    )}
                </div>

                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />

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