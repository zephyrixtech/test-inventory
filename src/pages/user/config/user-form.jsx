import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ArrowLeft,
  User,
  Mail,
  Key,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Loader2,
  UserCog,
  Users,
  EyeOff,
  Eye,
  Copy,
  Check,
  Camera,
  Trash2,
  Unlock,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchUsers, fetchRoles, createUser, updateUser, deleteUser } from '@/services/staticDataService';

// Simple Modal Component
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isLoading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </span>
            ) : (
              'Delete User'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formStatus, setFormStatus] = useState('idle'); // 'idle', 'submitting', 'success', 'error'
  const [currentStatus, setCurrentStatus] = useState('active');
  const [allRoles, setAllRoles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [copyPassword, setCopyPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [initialImagePreview, setInitialImagePreview] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const fileInputRef = useRef(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const user = localStorage.getItem("userData");
  const userData = user ? JSON.parse(user) : {};

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    password: '',
    status: 'active',
    image: null,
  });

  // Watch form values for animation triggers
  const watchedFields = formData;
  const passwordValue = formData.password || '';

  // Handle image change
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setImageRemoved(false);
    }
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
    setImageRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!isEditing || (isEditing && resetPassword)) {
      const newPwd = generateDefaultPassword();
      setFormData(prev => ({ ...prev, password: newPwd }));
    } else {
      setFormData(prev => ({ ...prev, password: "" }));
    }
  }, [resetPassword, isEditing]);

  // Fetch all roles
  useEffect(() => {
    const fetchRolesData = async () => {
      try {
        const { data } = await fetchRoles();
        if (data) {
          const filtered = data.filter((role) => role.name !== 'Super Admin');
          setAllRoles(filtered);
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
        toast.error('Failed to fetch roles');
      }
    }
    fetchRolesData();
  }, []);

  // Fetch user details when editing
  useEffect(() => {
    if (isEditing && id) {
      getUserDetails();
    }
  }, [id, isEditing]);

  // Get status text color based on current selection
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'inactive':
        return 'text-amber-500';
      default:
        return 'text-gray-600';
    }
  };

  // Get status dot color based on current selection
  const getStatusDotColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Fetch user details
  const getUserDetails = async () => {
    try {
      if (!id) throw new Error("No ID provided");

      setIsLoading(true);

      const { data, error } = await fetchUsers();
      if (error) {
        console.error('Error fetching user:', error);
        setError('Failed to fetch user data');
        toast.error('Failed to fetch user data');
        return;
      }

      const user = data.find(u => u.id === id);
      if (!user) {
        setError('User not found');
        toast.error('User not found');
        return;
      }

      setCurrentUser(user);

      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        role: user.role_id || '',
        status: user.status || 'active',
        password: '',
        image: null,
      });

      // Set status
      setCurrentStatus(user.status || 'active');

    } catch (error) {
      console.error('Fetch user error:', error);
      setError('Failed to fetch user data');
      toast.error('Failed to fetch user data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFormStatus('submitting');
    
    try {
      setIsLoading(true);

      // Simple form validation
      if (!formData.firstName.trim()) {
        throw new Error('First name is required');
      }
      if (!formData.lastName.trim()) {
        throw new Error('Last name is required');
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }
      if (!formData.role) {
        throw new Error('Please select a role');
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Invalid email address');
      }

      // Password validation (only for new users or when resetting password)
      if (!isEditing || resetPassword) {
        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        if (!/[A-Z]/.test(formData.password)) {
          throw new Error('Password must contain at least one uppercase letter');
        }
        if (!/\d/.test(formData.password)) {
          throw new Error('Password must contain at least one number');
        }
        if (!/[^A-Za-z0-9]/.test(formData.password)) {
          throw new Error('Password must contain at least one special character');
        }
      }

      const selectedRole = allRoles.find((role) => role.id === formData.role);
      if (!selectedRole) {
        throw new Error('Selected role not found');
      }

      // Check if email already exists
      const { data: existingUsers } = await fetchUsers();
      const existingUser = existingUsers.find(user => 
        user.email === formData.email && (isEditing ? user.id !== id : true)
      );
      
      if (existingUser) {
        throw new Error('Email already exists');
      }

      if (isEditing) {
        // Update existing user
        const updateData = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          role_id: selectedRole.id,
          status: formData.status,
          modified_at: new Date().toISOString(),
        };

        // Only include password if resetting
        if (resetPassword) {
          updateData.password = formData.password;
        }

        const { data, error } = await updateUser(id, updateData);
        if (error) throw new Error(error.message);

        toast.success('User updated successfully!');
      } else {
        // Create new user
        const createData = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          role_id: selectedRole.id,
          status: formData.status,
          password: formData.password,
          is_active: true,
          company_id: userData.company_id,
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
        };

        const { data, error } = await createUser(createData);
        if (error) throw new Error(error.message);

        toast.success('User created successfully!');
      }

      setFormStatus('success');

      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/dashboard/users');
      }, 1500);

    } catch (error) {
      console.error('Form submission error:', error);
      setError(error.message || 'An error occurred');
      setFormStatus('error');
      toast.error(error.message || 'Failed to save user');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!isEditing || !id) return;

    try {
      setIsDeleting(true);
      const { error } = await deleteUser(id);

      if (error) throw error;

      toast.success('User deleted successfully!');
      navigate('/dashboard/users');
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  function generateDefaultPassword() {
    const length = 10;
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const specialChars = "!@#$%^&*()_+[]{}|;:,.<>?";

    const mandatory = [
      uppercase[Math.floor(Math.random() * uppercase.length)],
      lowercase[Math.floor(Math.random() * lowercase.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      specialChars[Math.floor(Math.random() * specialChars.length)],
    ];

    const allChars = uppercase + lowercase + numbers;

    const remainingLength = length - mandatory.length;
    const remaining = Array.from({ length: remainingLength }, () =>
      allChars[Math.floor(Math.random() * allChars.length)]
    );

    const fullPassword = [...mandatory, ...remaining];

    for (let i = fullPassword.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fullPassword[i], fullPassword[j]] = [fullPassword[j], fullPassword[i]];
    }

    return fullPassword.join("");
  }

  const handleCopyPwd = () => {
    if (!passwordValue) return;
    navigator.clipboard.writeText(passwordValue).catch(console.error);
    setCopyPassword(true);
    setTimeout(() => {
      setCopyPassword(false)
    }, 3000)
  };

  // Handle user account unlock
  const handleUnlockUser = async () => {
    if (!id || !currentUser) return;

    try {
      const updateData = {
        status: 'active',
        failed_attempts: null,
      };

      const { data, error } = await updateUser(id, updateData);
      if (error) throw error;

      toast.success("User account unlocked successfully!");
      await getUserDetails();
    } catch (err) {
      console.error("Error unlock user account:", err);
      toast.error("Failed to unlock user account");
    } finally {
      setIsDialogOpen(false);
    }
  }

  if (isLoading && isEditing && !currentUser) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-700">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard/users')}
                className="hover:bg-blue-100 transition-colors duration-200 rounded-full"
              >
                <ArrowLeft className="h-5 w-5 text-blue-600" />
              </Button>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? "Update User" : "Add New User"}
                  </h1>
                  <p className="text-gray-600">
                    {isEditing
                      ? 'Update user details and manage account status'
                      : 'Create or update inventory user details'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteUser}
          title="Are you sure?"
          description={`This action cannot be undone. This will permanently delete the user account for ${currentUser?.first_name} ${currentUser?.last_name} and remove all associated data.`}
          isLoading={isDeleting}
        />

        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl text-blue-800">User Information</CardTitle>
            <CardDescription className="text-blue-600">
              {isEditing ? 'Update the user details below' : 'Fill in the user details below to create a new account'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Profile Photo Section */}
              <div className="space-y-2 group">
                <Label
                  className={`text-gray-700 group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                >
                  <Camera className="h-4 w-4" /> Profile Photo (JPG/PNG, max 5MB)
                </Label>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    {imagePreview ? (
                      <div className="relative w-32 h-32 border-2 border-gray-200 rounded-full overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center bg-gray-50">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex gap-2">
                      <label
                        htmlFor="image"
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors duration-200"
                      >
                        <Camera className="h-4 w-4" />
                        <input
                          id="image"
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          onChange={handleImageChange}
                          className="hidden"
                          ref={fileInputRef}
                        />
                      </label>
                      {imagePreview && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors duration-200"
                              aria-label="Remove profile photo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove profile photo</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center max-w-xs">
                    Upload a professional photo. Recommended: Square image, at least 200x200 pixels.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <Label
                    htmlFor="firstName"
                    className={`text-gray-700 group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                  >
                    <User className="h-4 w-4" /> First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`border-gray-200 focus:border-blue-500 focus:ring-blue-200 pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${watchedFields.firstName ? 'border-blue-300' : ''}`}
                  />
                </div>

                <div className="space-y-2 group">
                  <Label
                    htmlFor="lastName"
                    className={`text-gray-700 group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                  >
                    <User className="h-4 w-4" /> Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`border-gray-200 focus:border-blue-500 focus:ring-blue-200 pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${watchedFields.lastName ? 'border-blue-300' : ''}`}
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <Label
                  htmlFor="email"
                  className={`text-gray-700 group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                >
                  <Mail className="h-4 w-4" /> Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`border-gray-200 focus:border-blue-500 focus:ring-blue-200 pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${watchedFields.email ? 'border-blue-300' : ''}`}
                />
              </div>

              {(!isEditing || (isEditing && resetPassword)) && (
                <div className="space-y-2 group">
                  <Label
                    htmlFor="password"
                    className={`text-gray-700 group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                  >
                    <Key className="h-4 w-4" />
                    Password <span className="text-red-500">*</span>
                  </Label>

                  <div className="flex items-center gap-2">
                    <div className="relative w-full">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={`border-gray-200 focus:border-blue-500 focus:ring-blue-200 pl-3 pr-10 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${passwordValue ? 'border-blue-300' : ''}`}
                      />

                      {(isFocused || passwordValue) && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                          tabIndex={-1}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleCopyPwd}
                          disabled={!passwordValue}
                          className="shrink-0 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Copy password"
                        >
                          {copyPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copyPassword ? 'Copied!' : 'Copy to Clipboard'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <Label
                    htmlFor="role"
                    className={`text-gray-700 group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                  >
                    <UserCog className="h-4 w-4" /> Role <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    onValueChange={(value) => handleInputChange('role', value)}
                    value={formData.role}
                  >
                    <SelectTrigger
                      className={`border-gray-200 focus:border-blue-500 focus:ring-blue-200 pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${watchedFields.role ? 'border-blue-300' : ''}`}
                    >
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoles.length > 0 &&
                        allRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 group">
                  <Label
                    htmlFor="status"
                    className={`text-gray-700 group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                  >
                    <UserCog className="h-4 w-4" /> Status
                  </Label>
                  <Select
                    onValueChange={(value) => {
                      handleInputChange('status', value);
                      setCurrentStatus(value);
                    }}
                    value={formData.status}
                  >
                    <SelectTrigger
                      className={`border-gray-200 focus:border-blue-500 focus:ring-blue-200 pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${getStatusColor(formData.status)}`}
                    >
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {['active', 'inactive'].map((status) => (
                        <SelectItem key={status} value={status} className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getStatusDotColor(status)}`}></span>
                            <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 flex items-center">
                {isEditing && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={resetPassword}
                      onCheckedChange={() => setResetPassword(!resetPassword)}
                      className="border-gray-300 text-blue-600 cursor-pointer focus:ring-blue-500"
                    />
                    <Label className="text-sm hover:text-blue-600 transition-colors cursor-pointer">
                      Reset Password
                    </Label>
                  </div>
                )}

                <div className="ml-auto flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard/users')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={isLoading || formStatus === 'success'}
                    className={`
                        ${formStatus === 'success'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'}
                        text-white transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg`}
                  >
                    {(isLoading) ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isEditing ? 'Updating...' : 'Creating...'}
                      </span>
                    ) : formStatus === 'success' ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {isEditing ? 'Updated!' : 'Created!'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Update User
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Create User
                          </>
                        )}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};