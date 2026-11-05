import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import api from '../services/api';

export default function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { token: existingToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [counsellor, setCounsellor] = useState(null);

  useEffect(() => {
    const authenticateWithToken = async () => {
      if (!token) {
        setError('No access token found in link.');
        setLoading(false);
        return;
      }

      try {
        const res = await api.get(`/auth/join/${token}`);
        const { token: newToken, user: newUser } = res.data;

        localStorage.setItem('pw_crm_token', newToken);
        localStorage.setItem('pw_crm_user', JSON.stringify(newUser));
        setCounsellor(newUser);

        // Redirect after brief welcome
        setTimeout(() => {
          window.location.href = '/leads';
        }, 1200);
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid or expired unique access link.');
      } finally {
        setLoading(false);
      }
    };

    authenticateWithToken();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center space-y-4 border border-slate-100">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-500/30">
          PW
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            <h2 className="text-lg font-bold text-slate-800">Verifying Your Unique Access Link...</h2>
            <p className="text-xs text-slate-500">Connecting you securely to your counsellor pipeline.</p>
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
          </div>
        ) : error ? (
          <div className="space-y-3 py-2">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Access Link Error</h2>
            <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Go to Standard Login
            </button>
          </div>
        ) : (
          <div className="space-y-3 py-2 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Welcome, {counsellor?.name}!</h2>
            <p className="text-xs text-slate-500">
              Authenticated successfully! Launching your personal counsellor workspace...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
