import React, { useState, useEffect } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  UserCircle,
  Shield,
  Camera,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Static Mock User Data
const mockUser = {
  id: "user-001",
  email: "john.doe@company.com",
  first_name: "John",
  last_name: "Doe",
  full_name: "John Doe",
  role_name: "Admin",
  status: "active",
  image: null,
  security_question: "What was the name of your first school?",
  secret_answer: "Springfield Elementary",
};

// Predefined security questions
const securityQuestions = [
  "What was the name of your first school?",
  "What is the name of your childhood best friend?",
  "What was the make and model of your first vehicle?",
  "In what city were you born?",
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
];

const UserProfile = () => {
  const [user, setUser] = useState({
    firstName: mockUser.first_name,
    lastName: mockUser.last_name,
    fullName: mockUser.full_name,
    email: mockUser.email,
    role: mockUser.role_name,
    status: mockUser.status,
    profileImage: "/api/placeholder/150/150",
    securityQuestion: mockUser.security_question,
    secretAnswer: mockUser.secret_answer,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...user });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock allowed modules
  const allowedModules = [
    "Dashboard",
    "Purchase Orders",
    "Inventory",
    "Reports",
    "User Management",
  ];

  useEffect(() => {
    setFormData({ ...user });
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSelectChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      securityQuestion: value,
    }));

    if (formErrors.securityQuestion) {
      setFormErrors((prev) => ({
        ...prev,
        securityQuestion: "",
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    setSelectedImage(file || null);
    setImageRemoved(false);

    if (file) {
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setFormErrors((prev) => ({
          ...prev,
          image: "Image must be JPG or PNG",
        }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setFormErrors((prev) => ({
          ...prev,
          image: "Image must be less than 5MB",
        }));
        return;
      }

      setFormErrors((prev) => ({
        ...prev,
        image: "",
      }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageRemoved(true);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    } else if (!/^[A-Za-z]+(?:\s[A-Za-z]+)*$/.test(formData.firstName)) {
      errors.firstName = "Only letters allowed";
    }

    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    } else if (!/^[A-Za-z]+(?:\s[A-Za-z]+)*$/.test(formData.lastName)) {
      errors.lastName = "Only letters allowed";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email";
    } else if (formData.email !== formData.email.toLowerCase()) {
      errors.email = "Email must be lowercase";
    }

    if (formData.securityQuestion && !formData.secretAnswer.trim()) {
      errors.secretAnswer = "Answer required if question is set";
    } else if (!formData.securityQuestion && formData.secretAnswer.trim()) {
      errors.securityQuestion = "Select a question";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error("Please fix the errors");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Simulate success
      setUser({
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        profileImage: imagePreview || user.profileImage,
      });
      setIsEditing(false);
      setSelectedImage(null);
      setImageRemoved(false);
      setFormErrors({});
      toast.success("Profile updated successfully!");
      setIsSubmitting(false);
    }, 1000);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-500 hover:bg-green-600";
      case "inactive":
        return "bg-gray-500 hover:bg-gray-600";
      case "pending":
        return "bg-amber-500 hover:bg-amber-600";
      case "suspended":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-green-500 hover:bg-green-600";
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-100 to-blue-50 min-h-screen">
      <div className="mx-auto max-w-5xl">
        <Card className="shadow-2xl border border-gray-200 overflow-hidden rounded-2xl">
          <CardHeader className="rounded-t-2xl border-b pb-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <UserCircle className="h-6 w-6 text-blue-600" />
                  User Profile
                </CardTitle>
                <CardDescription className="mt-1 text-gray-600">
                  Manage your personal details, account settings, and authorizations
                </CardDescription>
              </div>
              {!isEditing && (
                <div>
                  <Button
                    className="me-2"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    Change Password
                  </Button>
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-8 pb-6 px-6 md:px-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-36 w-36 border-4 border-white shadow-xl rounded-full transition-transform hover:scale-105">
                    <AvatarImage
                      src={
                        imageRemoved
                          ? "/api/placeholder/100/100"
                          : (imagePreview || user.profileImage)
                      }
                      alt={user.fullName}
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/api/placeholder/100/100";
                      }}
                    />
                    <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600">
                      <b>
                        {user.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </b>
                    </AvatarFallback>
                  </Avatar>

                  <Badge
                    className={`${getStatusColor(
                      user.status
                    )} absolute bottom-4 right-0 text-white px-3 py-1 rounded-full capitalize shadow-md`}
                  >
                    {user.status}
                  </Badge>

                  {isEditing && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex gap-2">
                      <label
                        htmlFor="profile-image"
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors duration-200"
                      >
                        <Camera className="h-4 w-4" />
                        <input
                          id="profile-image"
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          onChange={handleImageChange}
                          className="hidden"
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
                  )}
                </div>

                {isEditing && formErrors.image && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.image}
                  </p>
                )}

                {isEditing && (
                  <p className="text-xs text-gray-500 text-center max-w-xs">
                    Upload a professional photo. Recommended: Square image, at least 200x200 pixels.
                  </p>
                )}

                <div className="bg-gray-50 rounded-full px-4 py-1 text-sm font-medium text-gray-600 border flex items-center gap-1 mt-2">
                  <Shield className="h-4 w-4" />
                  <span className="capitalize">{user.role}</span>
                </div>
              </div>

              {/* View Mode */}
              {!isEditing ? (
                <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <User className="h-4 w-4 text-blue-500" />
                        <p>Full Name</p>
                      </div>
                      <p className="text-base font-semibold text-gray-800">
                        {user.fullName}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <p>Email Address</p>
                      </div>
                      <p className="text-base font-semibold text-gray-800">
                        {user.email}
                      </p>
                    </div>
                    <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Shield className="h-4 w-4 text-blue-500" />
                        <p>Authorizations</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 border border-gray-200 rounded-md p-3">
                        {allowedModules.length > 0 ? (
                          allowedModules.map((auth) => (
                            <Badge
                              key={auth}
                              variant="secondary"
                              className="px-3 py-1 rounded-full"
                            >
                              {auth}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">
                            No authorizations assigned
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <div className="flex-1 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100 shadow-inner">
                    <div className="space-y-2">
                      <Label
                        htmlFor="firstName"
                        className="flex items-center gap-2 text-gray-700 font-medium"
                      >
                        <User className="h-4 w-4 text-blue-600" />
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`${
                          formErrors.firstName
                            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        } transition-all duration-200`}
                      />
                      {formErrors.firstName && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.firstName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="lastName"
                        className="flex items-center gap-2 text-gray-700 font-medium"
                      >
                        <User className="h-4 w-4 text-blue-600" />
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`${
                          formErrors.lastName
                            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        } transition-all duration-200`}
                      />
                      {formErrors.lastName && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.lastName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label
                        htmlFor="email"
                        className="flex items-center gap-2 text-gray-700 font-medium"
                      >
                        <Mail className="h-4 w-4 text-blue-600" />
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`${
                          formErrors.email
                            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        } transition-all duration-200`}
                      />
                      {formErrors.email && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label
                        htmlFor="securityQuestion"
                        className="flex items-center gap-2 text-gray-700 font-medium"
                      >
                        <Shield className="h-4 w-4 text-blue-600" />
                        Security Question
                      </Label>
                      <Select
                        value={formData.securityQuestion}
                        onValueChange={handleSelectChange}
                      >
                        <SelectTrigger
                          className={`${
                            formErrors.securityQuestion
                              ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          } transition-all duration-200`}
                        >
                          <SelectValue placeholder="Select a security question" />
                        </SelectTrigger>
                        <SelectContent>
                          {securityQuestions.map((q) => (
                            <SelectItem key={q} value={q}>
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.securityQuestion && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.securityQuestion}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label
                        htmlFor="secretAnswer"
                        className="flex items-center gap-2 text-gray-700 font-medium"
                      >
                        <Shield className="h-4 w-4 text-blue-600" />
                        Secret Answer
                      </Label>
                      <Input
                        id="secretAnswer"
                        name="secretAnswer"
                        value={formData.secretAnswer}
                        onChange={handleChange}
                        className={`${
                          formErrors.secretAnswer
                            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        } transition-all duration-200`}
                      />
                      {formErrors.secretAnswer && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.secretAnswer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          {/* Footer - Only in Edit Mode */}
          {isEditing && (
            <CardFooter className="flex justify-end space-x-4 border-t p-6">
              <Button
                variant="outline"
                onClick={() => {
                  setFormData({ ...user });
                  setIsEditing(false);
                  setSelectedImage(null);
                  setImagePreview(user.profileImage);
                  setImageRemoved(false);
                  setFormErrors({});
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Mock Change Password Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                This is a static demo. Password change is not implemented.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserProfile;