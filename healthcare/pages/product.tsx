"use client";

import { useState, FormEvent } from 'react';
import { useAuth } from '@clerk/nextjs';
import DatePicker from 'react-datepicker';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import 'react-datepicker/dist/react-datepicker.css';
import { UserIcon, CalendarIcon, EnvelopeIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
export default function Product() {
    const { getToken } = useAuth();

    // Form state
    const [patientName, setPatientName] = useState('');
    const [visitDate, setVisitDate] = useState<Date | null>(new Date());
    const [notes, setNotes] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [clinicName, setClinicName] = useState('');
    const [toEmail, setToEmail] = useState('');

    // Streaming state
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setOutput('');
        setError('');
        setLoading(true);

        const jwt = await getToken();
        if (!jwt) {
            setError('Authentication required');
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        let buffer = '';

        try {
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
                    doctor_name: doctorName,
                    clinic_name: clinicName,
                }),
                onmessage(ev) {
                    if (ev.data === '[DONE]') {
                        setLoading(false);
                        controller.abort();
                        // Check if output contains only the email section
                        if (buffer.includes('### Summary') || buffer.includes('### Next steps')) {
                            setError('Invalid response: Contains doctor-only information');
                            setOutput('');
                        }
                        return;
                    }
                    buffer += ev.data;
                    setOutput(buffer);
                },
                onclose() {
                    setLoading(false);
                },
                onerror(err) {
                    console.error('SSE error:', err);
                    const errorMessage = typeof err === 'object' && err !== null && 'message' in err
                        ? (err as { message?: string }).message
                        : undefined;
                    setError(`Error: ${errorMessage || 'Failed to connect to server'}`);
                    setLoading(false);
                    controller.abort();
                },
            });
        } catch (err) {
            console.error('Fetch error:', err);
            const errorMessage = typeof err === 'object' && err !== null && 'message' in err
                ? (err as { message?: string }).message
                : undefined;
            setError(`Error: ${errorMessage || 'Failed to connect to server'}`);
            setLoading(false);
        }
    }

    async function handleSendEmail() {
        if (!output || !toEmail) {
            alert('Please generate a summary and enter a patient email');
            return;
        }

        const jwt = await getToken();
        const emailSection = output.trim();
        if (!emailSection) {
            alert('No email content found');
            return;
        }

        try {
            const response = await fetch('/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                    to_email: toEmail,
                    date_of_visit: visitDate?.toISOString().slice(0, 10),
                    subject: `Consultation Summary - ${patientName}`,
                    content: emailSection,
                    doctor_name: doctorName,
                    clinic_name: clinicName,
                    patient_name: patientName,
                }),
            });
            if (response.ok) {
                alert('Email sent successfully');
            } else {
                alert('Failed to send email');
            }
        } catch (err) {
            alert('Error sending email');
        }
    }

    function handleExportPDF() {
        if (!output) {
            alert('Please generate a summary first');
            return;
        }

        const emailSection =  output.trim();
        if (!emailSection) {
            alert('No email content found');
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text(`Consultation Email\nClinic: ${clinicName}\nDoctor: ${doctorName}\nPatient: ${patientName}`, 10, 10);
        doc.text(emailSection, 10, 40, { maxWidth: 180 });
        doc.save(`ConsultationReport_${patientName}_${visitDate?.toISOString().slice(0, 10)}.pdf`);
    }


    function handleReset() {
        setPatientName('');
        setVisitDate(new Date());
        setNotes('');
        setDoctorName('');
        setClinicName('');
        setToEmail('');
        setOutput('');
        setError('');
    }

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                <div className="mb-8 text-center">
                    <h1 className="text-5xl sm:text-5xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 text-transparent bg-clip-text">
                        HealthLetter
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 border border-gradient-to-r from-blue-500 to-teal-500 dark:from-blue-700 dark:to-teal-700">
                    <div className="grid sm:grid-cols-2 gap-4 space-y-0">
                        <div className="space-y-2">
                            <label htmlFor="patient" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Patient Name
                            </label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                <input
                                    id="patient"
                                    type="text"
                                    required
                                    value={patientName}
                                    onChange={(e) => setPatientName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                                    placeholder="Enter patient's full name"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Date of Visit
                            </label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                <DatePicker
                                    id="date"
                                    selected={visitDate}
                                    onChange={(d: Date | null) => setVisitDate(d)}
                                    dateFormat="yyyy-MM-dd"
                                    placeholderText="Select date"
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="doctorName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Doctor Name
                            </label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                <input
                                    id="doctorName"
                                    type="text"
                                    required
                                    value={doctorName}
                                    onChange={(e) => setDoctorName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                                    placeholder="Enter doctor's name"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Clinic Name
                            </label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                <input
                                    id="clinicName"
                                    type="text"
                                    required
                                    value={clinicName}
                                    onChange={(e) => setClinicName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                                    placeholder="Enter clinic name"
                                />
                            </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
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
                    </div>
                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                        {loading ? 'Generating Email...' : 'Generate Email'}
                    </motion.button>
                </form>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mt-8 bg-red-100 dark:bg-red-900 rounded-xl shadow-md p-6 sm:p-8 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200"
                    >
                        {error}
                    </motion.div>
                )}

                {output && !error && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sm:p-8 border border-gray-200 dark:border-gray-700"
                    >
                        <div className="space-y-4">
                            <div className="markdown-content prose prose-blue dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                    {output}
                                </ReactMarkdown>
                            </div>
                            <div className="space-y-2">
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                    <input
                                        type="email"
                                        value={toEmail}
                                        onChange={(e) => setToEmail(e.target.value)}
                                        placeholder="Enter patient's email"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <motion.button
                                        onClick={handleSendEmail}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                                    >
                                        <EnvelopeIcon className="h-5 w-5 mr-2" />
                                        Send Email
                                    </motion.button>
                                    <motion.button
                                        onClick={handleExportPDF}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                                    >
                                        <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                                        Download PDF
                                    </motion.button>
                                    <motion.button
                                        onClick={handleReset}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                                    >
                                        <ArrowPathIcon className="h-5 w-5 mr-2" />
                                        Reset Form
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                )}
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                    <p>HIPAA Compliant • Secure Encryption • Trusted by Professionals</p>
                </div>
            </motion.div>
        </main>
    );
}