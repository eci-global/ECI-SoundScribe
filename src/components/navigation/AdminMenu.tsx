
import React from 'react';
import { Shield } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';

export default function AdminMenu() {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();

  // Don't show admin menu if not admin or still loading
  if (loading || !isAdmin) {
    return null;
  }

  const handleAdminClick = () => {
    navigate('/admin');
  };

  return (
    <button
      onClick={handleAdminClick}
      className="flex items-center gap-3 p-3 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-white/40 transition-all duration-200 w-full"
    >
      <Shield className="w-5 h-5" strokeWidth={1.5} />
      <span className="font-medium">Admin</span>
    </button>
  );
}
