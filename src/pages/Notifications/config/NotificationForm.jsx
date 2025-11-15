import React, { useState } from "react";
import {
  ArrowLeft,
  Bell,
  X,
  AlertCircle,
  Users,
  User,
  Calendar,
  MessageSquare,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// Mock Active Users
const mockActiveUsers = [
  { id: "1", first_name: "Alice", last_name: "Johnson", email: "alice@company.com" },
  { id: "2", first_name: "Bob", last_name: "Smith", email: "bob@company.com" },
  { id: "3", first_name: "Carol", last_name: "Davis", email: "carol@company.com" },
  { id: "4", first_name: "David", last_name: "Wilson", email: "david@company.com" },
  { id: "5", first_name: "Eve", last_name: "Brown", email: "eve@company.com" },
];

const CustomNotificationForm = () => {
  const [formData, setFormData] = useState({
    notificationTo: "",
    selectedUsers: [],
    message: "",
    expiryDate: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const activeUsers = mockActiveUsers;

  const handleNavigateBack = () => {
    navigate(-1);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.notificationTo) {
      newErrors.notificationTo = "Please select notification recipients";
    }

    if (!formData.message || formData.message.length < 10) {
      newErrors.message = formData.message
        ? "Message must be at least 10 characters"
        : "Message is required";
    }

    if (formData.notificationTo === "all" && !formData.expiryDate) {
      newErrors.expiryDate = "Expiry date is mandatory for system-wide notifications";
    }

    if (formData.notificationTo === "specific" && formData.selectedUsers.length === 0) {
      newErrors.selectedUsers = "Please select at least one user";
    }

    if (formData.expiryDate) {
      const selectedDate = new Date(formData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        newErrors.expiryDate = "Expiry date must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUserSelection = (userId, checked) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        selectedUsers: [...prev.selectedUsers, userId],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedUsers: prev.selectedUsers.filter((id) => id !== userId),
      }));
    }
  };

  const selectAllUsers = () => {
    setFormData((prev) => ({
      ...prev,
      selectedUsers: activeUsers.map((u) => u.id),
    }));
  };

  const deselectAllUsers = () => {
    setFormData((prev) => ({
      ...prev,
      selectedUsers: [],
    }));
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      toast.success("Notification created successfully!");
      setFormData({
        notificationTo: "",
        selectedUsers: [],
        message: "",
        expiryDate: "",
      });
      setErrors({});
      setIsSubmitting(false);
      handleNavigateBack();
    }, 1000);
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNavigateBack}
              className="hover:bg-blue-100 transition-colors duration-200 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Create Custom Notification
                </h1>
                <p className="text-gray-600">
                  Send notifications to all users or specific individuals
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <Card className="shadow-md border-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl text-blue-800">
              Notification Configuration
            </CardTitle>
            <CardDescription className="text-blue-600">
              Configure your notification details and target recipients
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-6">
              {/* Notification Recipients */}
              <div className="space-y-2 group">
                <Label
                  className={`${
                    errors.notificationTo ? "text-red-500" : "text-gray-700"
                  } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                >
                  <Users className="h-4 w-4" /> Notification To *
                </Label>
                <Select
                  value={formData.notificationTo}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      notificationTo: value,
                      selectedUsers:
                        value === "all" ? activeUsers.map((u) => u.id) : [],
                      expiryDate: value === "specific" ? "" : prev.expiryDate,
                    }));
                    setErrors((prev) => ({ ...prev, notificationTo: undefined }));
                  }}
                >
                  <SelectTrigger
                    className={`${
                      errors.notificationTo
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                    } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${
                      formData.notificationTo ? "border-blue-300" : ""
                    }`}
                  >
                    <SelectValue placeholder="Select notification recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        All Users (System-wide notification)
                      </div>
                    </SelectItem>
                    <SelectItem value="specific">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-green-600" />
                        Specific User(s)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.notificationTo && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.notificationTo}
                  </p>
                )}
              </div>

              {/* User Selection */}
              {formData.notificationTo === "specific" && (
                <div className="space-y-4 animate-in slide-in-from-top duration-300">
                  <div className="flex items-center justify-between">
                    <Label
                      className={`${
                        errors.selectedUsers ? "text-red-500" : "text-gray-700"
                      } flex items-center gap-1 font-medium`}
                    >
                      <User className="h-4 w-4" /> Select Users *
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllUsers}
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={deselectAllUsers}
                        className="text-gray-600 hover:bg-gray-50"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-white transition-colors"
                        >
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={formData.selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) =>
                              handleUserSelection(user.id, checked === true)
                            }
                          />
                          <Label
                            htmlFor={`user-${user.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.selectedUsers.length > 0 && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      Selected: {formData.selectedUsers.length} user(s)
                    </div>
                  )}

                  {errors.selectedUsers && (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.selectedUsers}
                    </p>
                  )}
                </div>
              )}

              {/* Message */}
              <div className="space-y-2 group">
                <Label
                  htmlFor="message"
                  className={`${
                    errors.message ? "text-red-500" : "text-gray-700"
                  } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                >
                  <MessageSquare className="h-4 w-4" /> Message *
                </Label>
                <Textarea
                  id="message"
                  placeholder={
                    formData.notificationTo === "all"
                      ? "e.g. System will be offline during 9:00 pm to 6:00 AM from 23rd Jan 2025 to 24th Jan 2025."
                      : "e.g. Please can you approve PO-202345; this is pending for a long time."
                  }
                  rows={4}
                  value={formData.message}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, message: e.target.value }));
                    setErrors((prev) => ({ ...prev, message: undefined }));
                  }}
                  className={`${
                    errors.message
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                  } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 resize-none ${
                    formData.message ? "border-blue-300" : ""
                  }`}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Minimum 10 characters required</span>
                  <span>{formData.message.length} characters</span>
                </div>
                {errors.message && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.message}
                  </p>
                )}
              </div>

              {/* Expiry Date */}
              <div className="space-y-2 group">
                <Label
                  htmlFor="expiryDate"
                  className={`${
                    errors.expiryDate ? "text-red-500" : "text-gray-700"
                  } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                >
                  <Calendar className="h-4 w-4" /> Expiry Date
                  {formData.notificationTo === "all" && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                  {formData.notificationTo === "specific" && (
                    <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                  )}
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  min={getTomorrowDate()}
                  value={formData.expiryDate}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, expiryDate: e.target.value }));
                    setErrors((prev) => ({ ...prev, expiryDate: undefined }));
                  }}
                  className={`${
                    errors.expiryDate
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                  } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${
                    formData.expiryDate ? "border-blue-300" : ""
                  }`}
                />
                {formData.notificationTo === "all" && (
                  <p className="text-xs text-blue-600">
                    System-wide notifications require an expiry date for automatic cleanup
                  </p>
                )}
                {errors.expiryDate && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.expiryDate}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 justify-end border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNavigateBack}
                  className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 text-white transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Creating..." : "Create Notification"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        {(formData.message || formData.notificationTo) && (
          <Card className="shadow-md border-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl text-green-800">Preview</CardTitle>
              <CardDescription className="text-green-600">
                Preview how your notification will appear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
                      <span className="font-semibold">
                        {formData.notificationTo === "all"
                          ? "System Notification (All Users)"
                          : `User Notification (${formData.selectedUsers.length} users)`}
                      </span>
                      {formData.expiryDate && (
                        <span className="text-xs bg-blue-200 px-2 py-1 rounded">
                          Expires: {new Date(formData.expiryDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-900">
                      {formData.message || "Your notification message will appear here..."}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomNotificationForm;