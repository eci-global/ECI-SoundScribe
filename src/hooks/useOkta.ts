import { useState, useEffect } from 'react';

interface OktaUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  lastActive: string;
  groups: string[];
}

interface OktaGroup {
  id: string;
  name: string;
  description: string;
  members: number;
}

interface OktaOrgData {
  organization: {
    name: string;
    domain: string;
    plan: string;
    created: string;
    status: string;
  };
  stats: {
    totalUsers: number;
    activeUsers: number;
    groups: number;
    applications: number;
    licenses: {
      total: number;
      used: number;
      available: number;
    };
  };
  groups: OktaGroup[];
}

export function useOkta() {
  const [users, setUsers] = useState<OktaUser[] | null>(null);
  const [orgData, setOrgData] = useState<OktaOrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOktaData = async () => {
      try {
        setLoading(true);
        
        const oktaDomain = import.meta.env.VITE_OKTA_DOMAIN;
        
        if (!oktaDomain) {
          throw new Error('Okta domain not configured');
        }
        
        // In a real implementation, you would use Okta's API with proper authentication
        // const oktaApiUrl = `https://${oktaDomain}.okta.com/api/v1`;
        
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for development
        const mockUsers: OktaUser[] = [
          {
            id: '1',
            name: 'John Smith',
            email: 'john.smith@ecisolutions.com',
            role: 'Sales Rep',
            status: 'active',
            lastActive: '2025-01-20T10:30:00Z',
            groups: ['Sales Team', 'All Users']
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@ecisolutions.com',
            role: 'CS Manager',
            status: 'active',
            lastActive: '2025-01-20T11:15:00Z',
            groups: ['Customer Success', 'Managers', 'All Users']
          },
          {
            id: '3',
            name: 'Mike Chen',
            email: 'mike.chen@ecisolutions.com',
            role: 'Admin',
            status: 'active',
            lastActive: '2025-01-20T12:00:00Z',
            groups: ['Administrators', 'All Users']
          },
          {
            id: '4',
            name: 'Emily Davis',
            email: 'emily.davis@ecisolutions.com',
            role: 'Sales Rep',
            status: 'inactive',
            lastActive: '2025-01-10T14:00:00Z',
            groups: ['Sales Team', 'All Users']
          }
        ];

        const mockOrgData: OktaOrgData = {
          organization: {
            name: 'ECI Software Solutions',
            domain: 'ecisolutions.com',
            plan: 'Enterprise',
            created: '2023-01-15',
            status: 'active'
          },
          stats: {
            totalUsers: 245,
            activeUsers: 218,
            groups: 12,
            applications: 8,
            licenses: {
              total: 300,
              used: 245,
              available: 55
            }
          },
          groups: [
            { id: '1', name: 'Sales Team', members: 85, description: 'All sales representatives' },
            { id: '2', name: 'Customer Success', members: 42, description: 'CS managers and support' },
            { id: '3', name: 'Engineering', members: 38, description: 'Development teams' },
            { id: '4', name: 'Administrators', members: 5, description: 'System administrators' }
          ]
        };
        
        setUsers(mockUsers);
        setOrgData(mockOrgData);
        setError(null);
      } catch (err: any) {
        console.warn('Okta unavailable, using mock data:', err.message);
        setError(null); // Don't show error in development
        
        // Still provide mock data
        setUsers([]);
        setOrgData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOktaData();
  }, []);

  const refreshUsers = async () => {
    setLoading(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoading(false);
  };

  return { 
    users, 
    orgData, 
    loading, 
    error, 
    refreshUsers 
  };
}