import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  Clock,
  FileText,
  UserCheck,
  Award,
  ArrowLeft,
  CalendarCheck,
  Package,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

// Static Dummy Data
const mockReturnData = {
  id: "pr-001",
  return_number: "RET-2025-001",
  supplier_name: "ABC Suppliers Ltd",
  return_date: "2025-11-10T10:00:00Z",
  total_items: 5,
  total_value: 12500,
  remark: "Damaged goods during transit",
  approval_status: [
    { status: "Created", trail: "Created", sequence_no: 0, date: "2025-11-08T09:00:00Z" },
    { status: "Level 1 Approved", trail: "Approved", sequence_no: 1, approvedBy: "user-123", date: "2025-11-08T10:30:00Z", comment: "Looks good" },
    { status: "Level 2 Approval Pending", trail: "Pending", sequence_no: 2 },
    { status: "Level 2 Approved", trail: "Approved", sequence_no: 3, approvedBy: "user-124", date: "2025-11-09T14:20:00Z" },
    { status: "Level 3 Approval Pending", trail: "Pending", sequence_no: 4 },
  ],
  created_by: "user-456",
  purchase_order_id: "po-100",
};

// Mock user map
const userMap = {
  "user-123": "John Doe",
  "user-124": "Jane Smith",
  "user-456": "Mike Johnson",
};

function PurchaseReturnView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [approvalSteps, setApprovalSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returnData, setReturnData] = useState(null);

  // Simulate loading static data
  useEffect(() => {
    setTimeout(() => {
      setReturnData(mockReturnData);
      setApprovalSteps(mockReturnData.approval_status);
      setLoading(false);
    }, 600);
  }, [id]);

  // Get level icon
  const getLevelIcon = (status, trail) => {
    if (status.includes("Created")) {
      return <FileText className={`w-6 h-6 ${trail === "Approved" ? "text-green-600" : "text-red-600"}`} />;
    } else if (status.includes("Approved") && !status.includes("Level")) {
      return <CheckCircle className={`w-6 h-6 ${trail === "Approved" ? "text-green-600" : "text-red-600"}`} />;
    } else if (status.includes("Approved")) {
      return <UserCheck className={`w-6 h-6 ${trail === "Approved" ? "text-green-600" : "text-red-600"}`} />;
    } else if (status.includes("Pending")) {
      return <Clock className="w-6 h-6 text-blue-600" />;
    } else if (status.includes("Returned") || status.includes("Return")) {
      return <Package className="w-6 h-6 text-purple-600" />;
    } else if (status.includes("Issued")) {
      return <CalendarCheck className="w-6 h-6 text-teal-600" />;
    } else {
      return <Award className="w-6 h-6 text-blue-600" />;
    }
  };

  // Extract level number
  const getLevelNumber = (status) => {
    const match = status.match(/Level (\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  // Filter steps: latest per level, stop at rejection
  const getDisplaySteps = (steps) => {
    const latestByLevel = {};
    let stopAtLevel = null;

    for (const step of steps) {
      const level = getLevelNumber(step.status);
      if (level === null) continue;

      if (!latestByLevel[level] || step.sequence_no > latestByLevel[level].sequence_no) {
        latestByLevel[level] = step;
      }

      if (step.trail === "Rejected" && (stopAtLevel === null || level < stopAtLevel)) {
        stopAtLevel = level;
      }
    }

    const sortedLevels = Object.keys(latestByLevel).map(Number).sort((a, b) => a - b);
    const display = [];

    for (const level of sortedLevels) {
      if (stopAtLevel !== null && level > stopAtLevel) break;
      display.push(latestByLevel[level]);
      if (latestByLevel[level].trail === "Rejected") break;
    }

    return display;
  };

  const displaySteps = getDisplaySteps(approvalSteps);

  // Calculate summary
  const completedSteps = approvalSteps.filter((s) => s.trail === "Approved").length;
  const totalSteps = approvalSteps.length;
  const remainingSteps = totalSteps - completedSteps;

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="min-h-[85vh] shadow-sm">
          <CardHeader className="rounded-t-lg border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/dashboard/purchase-order-return-approvals")}
                  className="hover:bg-blue-100 transition-colors duration-200 rounded-full"
                >
                  <ArrowLeft className="h-5 w-5 text-blue-600" />
                </Button>
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    Purchase Return Approval View
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Track approval workflows for purchase return requests
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-8">
              {/* Purchase Return Info */}
              {returnData && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Return Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Return Number
                      </label>
                      <p className="text-base text-gray-900">
                        {returnData.return_number}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Supplier
                      </label>
                      <p className="text-base text-gray-900">
                        {returnData.supplier_name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Return Date
                      </label>
                      <p className="text-base text-gray-900">
                        {formatDate(returnData.return_date)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Total Items
                      </label>
                      <p className="text-base text-gray-900">
                        {returnData.total_items}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Total Value
                      </label>
                      <p className="text-base text-gray-900">
                        {formatCurrency(returnData.total_value)}
                      </p>
                    </div>
                    {returnData.remark && (
                      <div className="col-span-full">
                        <label className="text-sm font-medium text-gray-500">
                          Remarks
                        </label>
                        <p className="text-base text-gray-900">
                          {returnData.remark}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Approval Workflow Title */}
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Purchase Return Approval Workflow
                </h2>
                <p className="text-gray-600">
                  Track the progress of your purchase return through each approval level
                </p>
              </div>

              {/* Loading */}
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Approval Steps */}
                  <div className="relative w-full pt-20 pb-6 min-h-[200px]">
                    {displaySteps.length > 0 ? (
                      <>
                        {/* Connection Line */}
                        <div className="absolute top-20 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>

                        {/* Steps */}
                        <div className="flex flex-row justify-center items-start w-full relative z-10 gap-6 md:gap-8 lg:gap-12 xl:gap-16">
                          {displaySteps.map((step, idx) => {
                            const IconComponent = getLevelIcon(step.status, step.trail);
                            const isApproved = step.trail === "Approved";
                            const isRejected = step.trail === "Rejected";
                            const isPending = step.trail === "Pending";

                            return (
                              <div
                                key={idx}
                                className="flex flex-col items-center min-w-[80px] max-w-[110px] w-full"
                              >
                                {/* Icon Circle */}
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                                    isApproved ? "bg-green-100" : isRejected ? "bg-red-100" : "bg-blue-100"
                                  }`}
                                  style={{ zIndex: 2, marginBottom: "0.5rem", marginTop: "-1.5rem" }}
                                >
                                  {IconComponent}
                                </div>

                                {/* Status Box */}
                                <div
                                  className={`px-2 py-2 rounded-lg text-xs font-medium text-center w-32 h-16 flex flex-col items-center justify-center mx-auto ${
                                    isApproved
                                      ? "bg-green-100 text-green-800"
                                      : isRejected
                                      ? "bg-red-100 text-red-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  <div>
                                    {step.status}
                                    {isApproved && step.approvedBy && (
                                      <div className="text-[10px] text-green-700 mt-1">
                                        by {userMap[step.approvedBy] || step.approvedBy}
                                      </div>
                                    )}
                                    {isRejected && step.approvedBy && (
                                      <div className="text-[10px] text-red-700 mt-1">
                                        by {userMap[step.approvedBy] || step.approvedBy}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">
                          No approval workflow steps found
                        </p>
                        <p className="text-gray-400 text-sm">
                          This return request may not have entered the approval process yet
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Current Status Summary */}
                  {displaySteps.length > 0 && (
                    <div className="mt-2 p-6 bg-gray-50 rounded-lg flex flex-col items-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Current Status
                      </h3>
                      <div className="flex justify-center w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-auto">
                          <div className="bg-white p-8 rounded-xl border min-w-[220px] max-w-[320px] text-base shadow-md">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="font-medium text-green-800">Completed</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {completedSteps} out of {totalSteps} steps
                            </p>
                          </div>
                          <div className="bg-white p-8 rounded-xl border min-w-[220px] max-w-[320px] text-base shadow-md">
                            <div className="flex items-center space-x-2">
                              <Award className="w-5 h-5 text-blue-600" />
                              <span className="font-medium text-blue-800">Remaining</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {remainingSteps} steps to complete
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PurchaseReturnView;