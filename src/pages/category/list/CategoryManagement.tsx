import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { categoryService } from '@/services/categoryService';
import type { Category } from '@/types/backend';

type SortField = 'name' | 'description' | 'subCategory' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

export const CategoryManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'createdAt',
    direction: 'desc',
  });
  const [isExporting, setIsExporting] = useState(false);
  
  // Updated status filters to work with status field
  const statusFilters = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  // Debounce search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sort function
  const handleSort = (field: SortField) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.field === field) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      } else {
        direction = 'asc';
      }
    }
    setSortConfig({ field: direction ? field : null, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="h-4 w-4 text-blue-600" />;
    } else if (sortConfig.direction === 'desc') {
      return <ArrowDown className="h-4 w-4 text-blue-600" />;
    }
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  // Fetch categories from backend
  const fetchCategories = useCallback(async () => {
    setLoading(true);

    try {
      const response = await categoryService.listCategories({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchQuery.trim() ? debouncedSearchQuery.trim() : undefined,
        status: statusFilter,
        sortBy: sortConfig.field ?? undefined,
        sortOrder: sortConfig.direction ?? undefined,
      });

      setCategories(response.data ?? []);

      if (response.meta) {
        setTotalItems(response.meta.total);
        setTotalPages(response.meta.totalPages);
        if (response.meta.page !== currentPage) {
          setCurrentPage(response.meta.page);
        }
      } else {
        setTotalItems(response.data?.length ?? 0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      const message = err instanceof Error ? err.message : 'Failed to fetch categories';
      toast.error(message);
      setCategories([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, itemsPerPage, sortConfig.field, sortConfig.direction, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  // Delete category
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    const categoryId = categoryToDelete.id ?? categoryToDelete._id;
    if (!categoryId) {
      toast.error('Invalid category selected.');
      return;
    }

    try {
      await categoryService.deleteCategory(categoryId);
      toast.success('Category deleted successfully!');
      fetchCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      toast.error(message);
    } finally {
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };


  const handleFilterReset = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setItemsPerPage(10);
    setCurrentPage(1);
    setSortConfig({ field: 'createdAt', direction: 'desc' });
    toast.success('Filters cleared successfully!');
  };

  // CSV export function using the utility
  const exportCategoriesCSV = async () => {
    setIsExporting(true);

    try {
      const pageSize = 100;
      let page = 1;
      let hasNext = true;
      const allCategories: Category[] = [];

      while (hasNext) {
        const response = await categoryService.listCategories({
          page,
          limit: pageSize,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        if (response.data) {
          allCategories.push(...response.data);
        }

        if (!response.meta || !response.meta.hasNextPage) {
          hasNext = false;
        } else {
          page += 1;
        }
      }

      if (allCategories.length === 0) {
        toast.error('No categories available to export.');
        return;
      }

      const headers = ['ID', 'Name', 'Sub Category', 'Description', 'Status', 'Items Count', 'Company ID', 'Created At'];
      const rows = allCategories.map((category) => [
        category.id ?? category._id ?? '',
        category.name,
        category.subCategory ?? 'N/A',
        category.description ?? 'N/A',
        category.isActive ? 'Active' : 'Inactive',
        category.itemsCount ?? 0,
        category.company ?? '',
        category.createdAt
          ? new Date(category.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'N/A',
      ]);

      const escapeCell = (cell: string | number) => {
        const cellValue = String(cell ?? '');
        const escaped = cellValue.replace(/"/g, '""');
        return `"${escaped}"`;
      };

      const csvContent = [headers, ...rows]
        .map((row) => row.map(escapeCell).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Category_Management_Report_${new Date().toISOString()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Categories exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      const message = error instanceof Error ? error.message : 'Failed to export categories';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) {
      return 'N/A';
    }
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300';
  };

  const getStatusDisplayText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  return (
    <TooltipProvider>
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Card className="min-h-[85vh] shadow-sm">
            <CardHeader className="rounded-t-lg border-b pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                    <List className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      Category Management
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Manage your inventory categories and their properties
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={exportCategoriesCSV}
                    className="transition-colors"
                    disabled={categories.length === 0 || loading || isExporting}
                  >
                    <Download className={`mr-2 h-4 w-4 ${isExporting ? 'animate-spin' : ''}`} />
                    <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                  </Button>
                  <Button
                    onClick={() => navigate('/dashboard/category-master/add')}
                    className="transition-colors"
                    disabled={loading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Filters */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full sm:w-1/3">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by category name, sub-category or description..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => {
                        setStatusFilter(value as 'all' | 'active' | 'inactive');
                        setCurrentPage(1);
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusFilters.map(filter => (
                          <SelectItem key={filter.value} value={filter.value}>
                            {filter.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleFilterReset}
                    className="transition-colors w-full sm:w-auto"
                    disabled={loading}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-lg overflow-hidden border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-gray-50 border-gray-200">
                      <TableHead className="font-semibold w-[250px]">
                        <button
                          type="button"
                          onClick={() => handleSort('name')}
                          className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600 ps-2"
                        >
                          Name
                          {getSortIcon('name')}
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSort('subCategory')}
                          className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                        >
                          Sub Category
                          {getSortIcon('subCategory')}
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSort('description')}
                          className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                        >
                          Description
                          {getSortIcon('description')}
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSort('status')}
                          className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-full justify-start hover:text-blue-600"
                        >
                          Status
                          {getSortIcon('status')}
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSort('createdAt')}
                          className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-full justify-start hover:text-blue-600"
                        >
                          Created At
                          {getSortIcon('createdAt')}
                        </button>
                      </TableHead>
                      <TableHead className="text-center font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(itemsPerPage).fill(0).map((_, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="py-3"><div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-6 w-65 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell className="text-center"><div className="h-6 w-25 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : categories.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center justify-center py-6">
                            <List className="h-12 w-12 text-gray-300 mb-2" />
                            <p className="text-base font-medium">
                              {searchQuery.trim()
                                ? 'No categories found matching your search'
                                : 'No categories available'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {searchQuery.trim()
                                ? 'Try adjusting your search terms or filters'
                                : 'Create a new category to get started'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category) => (
                        <TableRow key={category.id ?? category._id ?? category.name} className="hover:bg-gray-50">
                          <TableCell className="font-medium py-3">
                            <div className="ps-2">
                              <p className="font-medium">{category.name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[150px] whitespace-normal break-words">
                            <div className="max-w-xs">
                              <p className="text-sm">
                                {category.subCategory ? (
                                  category.subCategory
                                ) : (
                                  <span className="text-gray-400 italic">None</span>
                                )}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[250px] whitespace-normal break-words">
                            <div className="max-w-xs">
                              <p className="text-sm">
                                {category.description ? (
                                  category.description
                                ) : (
                                  <span className="text-gray-400 italic">No description provided</span>
                                )}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-left">
                            <Badge
                              variant="outline"
                              className={`font-medium ${getStatusBadgeColor(category.isActive ?? true)}`}
                            >
                              {getStatusDisplayText(category.isActive ?? true)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left">
                            <p className="text-sm">{formatDate(category.createdAt)}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => navigate(`/dashboard/category-master/edit/${category.id}`)}
                                    disabled={loading}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Edit Category
                                </TooltipContent>
                              </Tooltip>
                              {category.itemsCount && category.itemsCount > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="text-destructive hover:bg-destructive/10 opacity-50 cursor-not-allowed"
                                        disabled
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Cannot delete category. Items are associated with this category.</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="text-destructive hover:bg-destructive/10"
                                      onClick={() => {
                                        setCategoryToDelete(category);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete Category</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-6 gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Show</p>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue placeholder={itemsPerPage.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">entries</p>
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    Showing {categories.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center justify-center text-sm font-medium bg-gray-100 px-3 py-1 rounded">
                      Page {currentPage} of {totalPages || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages || 1))}
                      disabled={currentPage === totalPages || loading || totalPages === 0}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delete Confirmation Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this category? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline" onClick={() => setCategoryToDelete(null)} disabled={loading}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDeleteCategory}
                  disabled={loading}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
};