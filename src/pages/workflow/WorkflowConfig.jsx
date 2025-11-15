import { useState } from "react";
import { Trash2, Plus, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

const WorkflowConfiguration = () => {
  const [isEditing, setIsEditing] = useState(null);
  const [allRoles] = useState([
    { id: "r1", name: "Manager" },
    { id: "r2", name: "Supervisor" },
    { id: "r3", name: "Director" },
  ]);
  const [levels, setLevels] = useState([]);
  const [tempLevel, setTempLevel] = useState(null);
  const [businessProcess, setBusinessProcess] = useState("Purchase Order");
  const [superAdminOverride, setSuperAdminOverride] = useState(false);

  const handleAddLevel = () => {
    const newLevel = {
      id: levels.length + 1,
      approverRole: "",
      active: true,
      uuid: "",
    };
    setLevels([...levels, newLevel]);
    setIsEditing(newLevel.id);
    setTempLevel(newLevel);
  };

  const handleEdit = (id) => {
    const level = levels.find((l) => l.id === id);
    if (level) {
      setTempLevel({ ...level });
      setIsEditing(id);
    }
  };

  const handleSave = () => {
    if (!tempLevel?.approverRole) {
      toast.error("Please select an approver role");
      return;
    }
    const updated = levels.map((l) => (l.id === isEditing ? { ...l, ...tempLevel } : l));
    setLevels(updated);
    setIsEditing(null);
    setTempLevel(null);
    toast.success("Level updated successfully");
  };

  const handleCancel = () => {
    setIsEditing(null);
    setTempLevel(null);
  };

  const handleDelete = (id) => {
    const filtered = levels.filter((l) => l.id !== id);
    const reordered = filtered.map((l, idx) => ({ ...l, id: idx + 1 }));
    setLevels(reordered);
    setIsEditing(null);
    setTempLevel(null);
    toast.success("Level deleted successfully");
  };

  const getAvailableRoles = (currentLevelId) => {
    const usedRoles = levels
      .filter((l) => l.id !== currentLevelId && l.approverRole)
      .map((l) => l.approverRole);
    return allRoles.filter((r) => !usedRoles.includes(r.id));
  };

  const allLevelsHaveApproverRole = levels.length > 0 && levels.every(l => l.approverRole !== "");

  const handleSaveWorkflow = () => {
    if (!allLevelsHaveApproverRole) return;
    toast.success(`Workflow for ${businessProcess} saved (static)`);
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="min-h-[85vh] shadow-sm">
          <CardHeader className="rounded-t-lg border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                  <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8 8-8 8 3.59 8 8 8s8-3.59 8-8-3.59-8-8-8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    Workflow Configuration
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Configure approval workflows for business processes
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Business Process</label>
                <Select value={businessProcess} onValueChange={setBusinessProcess}>
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select Business Process" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Purchase Order">Purchase Order</SelectItem>
                    <SelectItem value="Purchase Return Request">Purchase Return Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-6">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-[14px] font-medium hover:text-blue-700 tracking-wider">Level</th>
                        <th className="px-6 py-3 text-left text-[14px] font-medium hover:text-blue-700 tracking-wider">Approver Role</th>
                        <th className="px-6 py-3 text-left text-[14px] font-medium hover:text-blue-700 tracking-wider">Active</th>
                        <th className="px-6 py-3 text-left text-[14px] font-medium hover:text-blue-700 tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {levels.map((level) => (
                        <tr key={level.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{level.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isEditing === level.id ? (
                              <Select
                                value={tempLevel?.approverRole || ""}
                                onValueChange={(value) => setTempLevel({ ...tempLevel, approverRole: value })}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableRoles(level.id).map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              level.approverRole ? (
                                <Badge
                                  variant="outline"
                                  className="capitalize bg-gray-100 text-gray-800 border-gray-300"
                                >
                                  {allRoles.find((role) => role.id === level.approverRole)?.name}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 italic">No role selected</span>
                              )
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isEditing === level.id ? (
                              <input
                                type="checkbox"
                                checked={tempLevel?.active ?? false}
                                onChange={(e) => setTempLevel({ ...tempLevel, active: e.target.checked })}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            ) : (
                              <span className={`text-lg ${level.active ? "text-green-600" : "text-red-600"}`}>
                                {level.active ? "✓" : "✗"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              {isEditing === level.id ? (
                                <>
                                  <Button variant="ghost" size="sm" onClick={handleSave} type="button">
                                    Apply
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={handleCancel} type="button">
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleEdit(level.id)}
                                    type="button"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(level.id)}
                                    type="button"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-200"
                  onClick={handleAddLevel}
                  type="button"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Level
                </Button>
              </div>

              <div className="mb-6">
                <div className="flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <input
                            type="checkbox"
                            checked={!!superAdminOverride}
                            onChange={(e) => setSuperAdminOverride(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                          />
                          <span>Allow SuperAdmin to override all approval levels</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>When enabled, SuperAdmins can perform approvals for all levels in this process.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!allLevelsHaveApproverRole}
                  onClick={handleSaveWorkflow}
                  className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-200 ${!allLevelsHaveApproverRole ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Save Workflow
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkflowConfiguration;


