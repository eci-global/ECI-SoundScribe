import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Palette,
  Globe,
  HelpCircle,
  Moon,
  Sun,
  Check,
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Bell,
  Key,
  Camera,
  Save,
  X,
  Edit3,
  MapPin,
  Calendar,
  Briefcase
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

interface SettingsProps {
  initialSection?: string;
}

export default function Settings({ initialSection = 'profile' }: SettingsProps = {}) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    // Profile settings
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    phone: '+1 (555) 123-4567',
    company: 'Acme Corp',
    jobTitle: 'Product Manager',
    department: 'Product',
    location: 'San Francisco, CA',
    timezone: 'PST',
    bio: 'Passionate product manager focused on building innovative solutions that drive user engagement and business growth.',
    
    // Preferences
    downloadFormat: 'mp3',
    theme: 'light',
    language: 'en',
    
    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    summaryReports: true
  });

  const [originalSettings, setOriginalSettings] = useState(settings);

  const sections: SettingsSection[] = [
    {
      id: 'profile',
      title: 'Profile',
      description: 'Personal information and account details',
      icon: User
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'Appearance, language and download settings',
      icon: Palette
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Email and push notification settings',
      icon: Bell
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Password and security preferences',
      icon: Shield
    }
  ];

  // Apply theme globally to document (including admin pages)
  useEffect(() => {
    const applyTheme = (theme: string) => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        // Store theme preference for persistence across page reloads
        localStorage.setItem('soundscribe-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        localStorage.setItem('soundscribe-theme', 'light');
      }
    };

    applyTheme(settings.theme);
  }, [settings.theme]);

  // Load saved data on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('soundscribe-theme');
    const savedProfile = localStorage.getItem('soundscribe-profile');
    const savedAvatar = localStorage.getItem('soundscribe-avatar');
    
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      setSettings(prev => ({ ...prev, theme: savedTheme }));
    }
    
    if (savedProfile) {
      try {
        const profileData = JSON.parse(savedProfile);
        setSettings(prev => ({ ...prev, ...profileData }));
        setOriginalSettings(prev => ({ ...prev, ...profileData }));
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    }
    
    if (savedAvatar) {
      setAvatar(savedAvatar);
    }
  }, []);

  // Track changes
  useEffect(() => {
    const hasProfileChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(hasProfileChanges);
  }, [settings, originalSettings]);

  const handleInputChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Don't show toast for profile changes in edit mode
    if (activeSection !== 'profile' || !isEditing) {
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved",
      });
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please choose an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAvatar(result);
        localStorage.setItem('soundscribe-avatar', result);
        toast({
          title: "Avatar updated",
          description: "Your profile picture has been updated",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    try {
      localStorage.setItem('soundscribe-profile', JSON.stringify(settings));
      setOriginalSettings({ ...settings });
      setIsEditing(false);
      setHasChanges(false);
      
      toast({
        title: "Profile saved",
        description: "Your profile information has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save profile changes. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setSettings({ ...originalSettings });
    setIsEditing(false);
    setHasChanges(false);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    return /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/\s|-|\(|\)/g, ''));
  };

  const isFormValid = () => {
    return (
      settings.firstName.trim() !== '' &&
      settings.lastName.trim() !== '' &&
      validateEmail(settings.email) &&
      validatePhone(settings.phone)
    );
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Header with Avatar and Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-6">
                  {/* Avatar Section */}
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-eci-blue to-purple-600 flex items-center justify-center overflow-hidden">
                      {avatar ? (
                        <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-white">
                          {settings.firstName[0]}{settings.lastName[0]}
                        </span>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-eci-blue rounded-full flex items-center justify-center cursor-pointer hover:bg-eci-blue-dark transition-colors">
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {/* Profile Info */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {settings.firstName} {settings.lastName}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">{settings.jobTitle}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">{settings.company}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {settings.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {settings.timezone}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-eci-blue text-white rounded-lg hover:bg-eci-blue-dark transition-colors flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={!isFormValid() || !hasChanges}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Unsaved Changes Warning */}
              {hasChanges && isEditing && (
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    You have unsaved changes. Don't forget to save your updates!
                  </p>
                </div>
              )}
            </div>

            {/* Personal Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={settings.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent transition-colors ${
                      !isEditing 
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400' 
                        : `border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                            settings.firstName.trim() === '' ? 'border-red-300 dark:border-red-600' : ''
                          }`
                    }`}
                    placeholder="Enter your first name"
                  />
                  {isEditing && settings.firstName.trim() === '' && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">First name is required</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={settings.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent transition-colors ${
                      !isEditing 
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400' 
                        : `border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                            settings.lastName.trim() === '' ? 'border-red-300 dark:border-red-600' : ''
                          }`
                    }`}
                    placeholder="Enter your last name"
                  />
                  {isEditing && settings.lastName.trim() === '' && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">Last name is required</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent transition-colors ${
                      !isEditing 
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400' 
                        : `border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                            !validateEmail(settings.email) ? 'border-red-300 dark:border-red-600' : ''
                          }`
                    }`}
                    placeholder="Enter your email address"
                  />
                  {isEditing && !validateEmail(settings.email) && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">Please enter a valid email address</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent transition-colors ${
                      !isEditing 
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400' 
                        : `border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                            !validatePhone(settings.phone) ? 'border-red-300 dark:border-red-600' : ''
                          }`
                    }`}
                    placeholder="Enter your phone number"
                  />
                  {isEditing && !validatePhone(settings.phone) && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">Please enter a valid phone number</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={settings.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent transition-colors ${
                      !isEditing 
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400' 
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                    placeholder="City, State/Country"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent transition-colors ${
                      !isEditing 
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400' 
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <option value="PST">Pacific Standard Time (PST)</option>
                    <option value="MST">Mountain Standard Time (MST)</option>
                    <option value="CST">Central Standard Time (CST)</option>
                    <option value="EST">Eastern Standard Time (EST)</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                    <option value="GMT">Greenwich Mean Time (GMT)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Work Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    value={settings.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent transition-colors ${
                      !isEditing 
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400' 
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                    placeholder="Enter your company name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={settings.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent transition-colors ${
                      !isEditing 
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400' 
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                    placeholder="Enter your job title"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={settings.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent transition-colors ${
                      !isEditing 
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400' 
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                    placeholder="Enter your department"
                  />
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Bio</h3>
              <div>
                <textarea
                  value={settings.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  disabled={!isEditing}
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent transition-colors resize-none ${
                    !isEditing 
                      ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400' 
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                  placeholder="Tell us a bit about yourself..."
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {settings.bio.length}/500 characters
                </p>
              </div>
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Theme</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleInputChange('theme', 'light')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    settings.theme === 'light' 
                      ? 'border-eci-blue bg-eci-blue/5' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Light</p>
                </button>
                <button
                  onClick={() => handleInputChange('theme', 'dark')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    settings.theme === 'dark' 
                      ? 'border-eci-blue bg-eci-blue/5' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <Moon className="w-6 h-6 mx-auto mb-2 text-gray-700 dark:text-gray-300" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Dark</p>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Language
              </h3>
              <select
                value={settings.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ja">日本語</option>
              </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Export Preferences</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default download format
                  </label>
                  <select
                    value={settings.downloadFormat}
                    onChange={(e) => handleInputChange('downloadFormat', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="mp3">MP3 (Audio only)</option>
                    <option value="wav">WAV (Uncompressed)</option>
                    <option value="m4a">M4A (Apple compatible)</option>
                    <option value="original">Original format</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Notification Preferences</h3>
            <div className="space-y-6">
              <ToggleOption
                label="Email Notifications"
                description="Receive notifications about processing updates and summaries"
                checked={settings.emailNotifications}
                onChange={() => handleInputChange('emailNotifications', !settings.emailNotifications)}
              />
              <ToggleOption
                label="Push Notifications"
                description="Browser notifications for real-time updates"
                checked={settings.pushNotifications}
                onChange={() => handleInputChange('pushNotifications', !settings.pushNotifications)}
              />
              <ToggleOption
                label="Summary Reports"
                description="Weekly digest of your recording activity"
                checked={settings.summaryReports}
                onChange={() => handleInputChange('summaryReports', !settings.summaryReports)}
              />
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Password & Authentication
              </h3>
              <div className="space-y-4">
                <button className="w-full sm:w-auto px-4 py-2 bg-eci-blue text-white rounded-lg hover:bg-eci-blue-dark transition-colors">
                  Change Password
                </button>
                <button className="w-full sm:w-auto px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ml-0 sm:ml-3">
                  Enable Two-Factor Authentication
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Account Actions</h3>
              <div className="space-y-4">
                <button className="w-full sm:w-auto px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Download My Data
                </button>
                <button className="w-full sm:w-auto px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors ml-0 sm:ml-3">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your preferences and account settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    activeSection === section.id
                      ? 'bg-eci-blue text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="w-5 h-5" strokeWidth={1.5} />
                    <div>
                      <p className="font-medium">{section.title}</p>
                      <p className={`text-xs ${
                        activeSection === section.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {section.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </nav>

            {/* Help Section */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-medium text-blue-900 dark:text-blue-300">Need help?</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Check out our guides and tutorials
              </p>
              <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                Visit Help Center →
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {renderSectionContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleOption({ label, description, checked, onChange }: ToggleOptionProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-eci-blue' : 'bg-gray-200 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
} 