"use client"

import { useState, FormEvent } from 'react';
import { useAuth } from '@clerk/nextjs';
import DatePicker from 'react-datepicker';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import 'react-datepicker/dist/react-datepicker.css';

export default function Product() {
    const { getToken } = useAuth();

    // Form state
    const [patientName, setPatientName] = useState('');
    const [visitDate, setVisitDate] = useState<Date | null>(new Date());
    const [notes, setNotes] = useState('');

    // Streaming state
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setOutput('');
        setLoading(true);

        const jwt = await getToken();
        if (!jwt) {
            setOutput('Authentication required');
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        let buffer = '';

        await fetchEventSource('/api', {
            signal: controller.signal,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({
                patient_name: patientName,
                date_of_visit: visitDate?.toISOString().slice(0, 10),
                notes,
            }),
            onmessage(ev) {
                buffer += ev.data;
                setOutput(buffer);
            },
            onclose() { 
                setLoading(false); 
            },
            onerror(err) {
                console.error('SSE error:', err);
                controller.abort();
                setLoading(false);
            },
        });
    }

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* User Menu in Top Right */}
            <div className="absolute top-4 right-4">
                <UserButton 
                    showName={true}
                    appearance={{
                        elements: {
                            userButtonBox: "text-gray-800 dark:text-gray-200",
                            userButtonTrigger: "hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2"
                        }
                    }}
                />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl"
            >
                <h1 className="text-3xl sm:text-4xl font-semibold text-gray-800 dark:text-gray-100 mb-8">
                    Consultation Notes
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
                    <div className="space-y-2">
                        <label htmlFor="patient" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Patient Name
                        </label>
                        <input
                            id="patient"
                            type="text"
                            required
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                            placeholder="Enter patient's full name"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Date of Visit
                        </label>
                        <DatePicker
                            id="date"
                            selected={visitDate}
                            onChange={(d: Date | null) => setVisitDate(d)}
                            dateFormat="yyyy-MM-dd"
                            placeholderText="Select date"
                            required
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Consultation Notes
                        </label>
                        <textarea
                            id="notes"
                            required
                            rows={8}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-y transition-all duration-200"
                            placeholder="Enter detailed consultation notes..."
                        />
                    </div>

                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                        {loading ? 'Generating Summary...' : 'Generate Summary'}
                    </motion.button>
                </form>

                {output && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sm:p-8 border border-gray-200 dark:border-gray-700"
                    >
                        <div className="markdown-content prose prose-blue dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                {output}
                            </ReactMarkdown>
                        </div>
                    </motion.section>
                )}
            </motion.div>
        </main>
    );
}