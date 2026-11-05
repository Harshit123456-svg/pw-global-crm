import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import LoginPage from './pages/LoginPage';
import JoinPage from './pages/JoinPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import DemoSessionsPage from './pages/DemoSessionsPage';
import SheetsPage from './pages/SheetsPage';
import TeamPage from './pages/TeamPage';
import AnalyticsPage from './pages/AnalyticsPage';

import LeadDetailModal from './components/LeadDetailModal';
import BookDemoModal from './components/BookDemoModal';
import FollowUpModal from './components/FollowUpModal';
import WhatsAppModal from './components/WhatsAppModal';
import NewLeadModal from './components/NewLeadModal';
import ProfileModal from './components/ProfileModal';

function ProtectedLayout() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Modals State
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);

  const [bookingDemoLead, setBookingDemoLead] = useState(null);
  const [isBookDemoOpen, setIsBookDemoOpen] = useState(false);

  const [followUpLead, setFollowUpLead] = useState(null);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);

  const [whatsAppLead, setWhatsAppLead] = useState(null);
  const [whatsAppTarget, setWhatsAppTarget] = useState('lead');
  const [whatsAppType, setWhatsAppType] = useState(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-medium text-sm">
        Initializing PW Global CRM...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handlers
  const handleOpenLead = (leadId) => {
    setActiveLeadId(leadId);
    setIsLeadDetailOpen(true);
  };

  const handleBookDemo = (lead) => {
    setBookingDemoLead(lead);
    setIsBookDemoOpen(true);
  };

  const handleScheduleFollowUp = (lead) => {
    setFollowUpLead(lead);
    setIsFollowUpOpen(true);
  };

  const handleOpenWhatsApp = (lead, target = 'lead', type = null) => {
    setWhatsAppLead(lead);
    setWhatsAppTarget(target);
    setWhatsAppType(type);
    setIsWhatsAppOpen(true);
  };

  const handleFollowUpFilter = (filter) => {
    navigate(`/leads?follow_up_filter=${filter}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        onOpenNewLead={() => setIsNewLeadOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onSelectFollowUpFilter={handleFollowUpFilter}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  onOpenLead={handleOpenLead}
                  onBookDemo={handleBookDemo}
                  onScheduleFollowUp={handleScheduleFollowUp}
                  onOpenWhatsApp={handleOpenWhatsApp}
                />
              }
            />
            <Route
              path="/leads"
              element={
                <LeadsPage
                  onOpenLead={handleOpenLead}
                  onOpenNewLead={() => setIsNewLeadOpen(true)}
                  onBookDemo={handleBookDemo}
                  onScheduleFollowUp={handleScheduleFollowUp}
                  onOpenWhatsApp={handleOpenWhatsApp}
                />
              }
            />
            <Route
              path="/demos"
              element={
                <DemoSessionsPage
                  onOpenLead={handleOpenLead}
                  onOpenWhatsApp={handleOpenWhatsApp}
                  onScheduleFollowUp={handleScheduleFollowUp}
                />
              }
            />
            <Route
              path="/sheets"
              element={isAdmin ? <SheetsPage /> : <Navigate to="/" replace />}
            />
            <Route
              path="/team"
              element={isAdmin ? <TeamPage /> : <Navigate to="/" replace />}
            />
            <Route
              path="/analytics"
              element={isAdmin ? <AnalyticsPage onOpenLead={handleOpenLead} /> : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Modals */}
      <LeadDetailModal
        leadId={activeLeadId}
        isOpen={isLeadDetailOpen}
        onClose={() => {
          setIsLeadDetailOpen(false);
          setActiveLeadId(null);
        }}
        onBookDemo={handleBookDemo}
        onScheduleFollowUp={handleScheduleFollowUp}
        onOpenWhatsApp={handleOpenWhatsApp}
      />

      <BookDemoModal
        lead={bookingDemoLead}
        isOpen={isBookDemoOpen}
        onClose={() => {
          setIsBookDemoOpen(false);
          setBookingDemoLead(null);
        }}
        onOpenWhatsApp={(lead, type) => handleOpenWhatsApp(lead, 'lead', type)}
      />

      <FollowUpModal
        lead={followUpLead}
        isOpen={isFollowUpOpen}
        onClose={() => {
          setIsFollowUpOpen(false);
          setFollowUpLead(null);
        }}
        onOpenWhatsAppReminder={(lead) => handleOpenWhatsApp(lead, 'counsellor')}
      />

      <WhatsAppModal
        lead={whatsAppLead}
        isOpen={isWhatsAppOpen}
        initialTarget={whatsAppTarget}
        initialType={whatsAppType}
        onClose={() => {
          setIsWhatsAppOpen(false);
          setWhatsAppLead(null);
        }}
      />

      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onSuccess={(newLead) => {
          handleOpenLead(newLead.id);
        }}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join/:token" element={<JoinPage />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
