import React, { useState, useMemo } from 'react';
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
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Store,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Building2,
  MapPin,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';

// === MOCK DATA ===
const mockStores = [
  {
    id: '1',
    code: 'CS001',
    name: 'Central HQ Store',
    type: 'Central Store',
    address: '123 Main Street, New York, NY 10001',
    parent_id: null,
    store_manager: { first_name: 'John', last_name: 'Doe' },
    is_parent: true,
  },
  {
    id: '2',
    code: 'BS001',
    name: 'Manhattan Branch',
    type: 'Branch Store',
    address: '456 Park Ave, New York, NY 10022',
    parent_id: '1',
    store_manager: { first_name: 'Jane', last_name: 'Smith' },
    is_parent: false,
  },
  {
    id: '3',
    code: 'BS002',
    name: 'Brooklyn Outlet',
    type: 'Branch Store',
    address: '789 Fulton St, Brooklyn, NY 11217',
    parent_id: '1',
    store_manager: { first_name: 'Mike', last_name: 'Johnson' },
    is_parent: false,
  },
  {
    id: '4',
    code: 'CS002',
    name: 'West Coast Hub',
    type: 'Central Store',
    address: '101 Ocean Blvd, Los Angeles, CA 90001',
    parent_id: null,
    store_manager: { first_name: 'Sarah', last_name: 'Williams' },
    is_parent: true,
  },
  {
    id: '5',
    code: 'BS003',
    name: 'Venice Beach Store',
    type: 'Branch Store',
    address: '200 Boardwalk, Venice, CA 90291',
    parent_id: '4',
    store_manager: { first_name: 'Tom', last_name: 'Brown' },
    is_parent: false,
  },
  {
    id: '6',
    code: 'BS004',
    name: 'Santa Monica Pier',
    type: 'Branch Store',
    address: '300 Pier Ave, Santa Monica, CA 90401',
    parent_id: '4',
    store_manager: { first_name: 'Lisa', last_name: 'Davis' },
    is_parent: false,
  },
  {
    id: '7',
    code: 'CS003',
    name: 'Chicago Central',
    type: 'Central Store',
    address: '500 Michigan Ave, Chicago, IL 60601',
    parent_id: null,
    store_manager: { first_name: 'Robert', last_name: 'Miller' },
    is_parent: false,
  },
];

// Mock purchase order store IDs (used to disable delete)
const mockPurchaseOrderStoreIds = ['1', '2', '4'];

const mockManagers = ['all', 'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Tom Brown', 'Lisa Davis', 'Robert Miller'];
const mockStoreNames = ['all', 'Central HQ Store', 'Manhattan Branch', 'Brooklyn Outlet', 'West Coast Hub', 'Venice Beach Store', 'Santa Monica Pier', 'Chicago Central'];
const mockParentStores = [
  { id: 'all', name: 'All Parent Stores', type: '' },
  { id: '1', name: 'Central HQ Store', type: 'Central Store' },
  { id: '4', name: 'West Coast Hub', type: 'Central Store' },
];

export const StoreManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [storeTypeFilter, setStoreTypeFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('all');
  const [parentStoreFilter, setParentStoreFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: null,
  });

  const storeTypes = ['all', 'Central Store', 'Branch Store'];

  // === Filter, Sort, Paginate with useMemo ===
  const filteredAndSortedStores = useMemo(() => {
    let filtered = [...mockStores];

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.code.toLowerCase().includes(query)
      );
    }

    // Filters
    if (storeTypeFilter !== 'all') {
      filtered = filtered.filter((s) => s.type === storeTypeFilter);
    }
    if (nameFilter !== 'all') {
      filtered = filtered.filter((s) => s.name === nameFilter);
    }
    if (parentStoreFilter !== 'all') {
      filtered = filtered.filter((s) => s.parent_id === parentStoreFilter);
    }
    if (managerFilter !== 'all') {
      filtered = filtered.filter(
        (s) =>
          s.store_manager &&
          `${s.store_manager.first_name} ${s.store_manager.last_name}` === managerFilter
      );
    }

    // Sorting
    if (sortConfig.field && sortConfig.direction) {
      filtered.sort((a, b) => {
        let aVal, bVal;

        switch (sortConfig.field) {
          case 'code':
            aVal = a.code; bVal = b.code;
            break;
          case 'name':
            aVal = a.name; bVal = b.name;
            break;
          case 'address':
            aVal = a.address; bVal = b.address;
            break;
          case 'type':
            aVal = a.type; bVal = b.type;
            break;
          case 'parent_store':
            aVal = mockStores.find(s => s.id === a.parent_id)?.name || '';
            bVal = mockStores.find(s => s.id === b.parent_id)?.name || '';
            break;
          case 'store_manager':
            aVal = a.store_manager ? `${a.store_manager.first_name} ${a.store_manager.last_name}` : '';
            bVal = b.store_manager ? `${b.store_manager.first_name} ${b.store_manager.last_name}` : '';
            break;
          default:
            aVal = a.name; bVal = b.name;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [searchQuery, storeTypeFilter, managerFilter, nameFilter, parentStoreFilter, sortConfig]);

  const totalItems = filteredAndSortedStores.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedStores = filteredAndSortedStores.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // === Tree View ===
  const buildTree = () => {
    const childrenMap = {};
    mockStores.forEach((store) => {
      if (store.parent_id) {
        if (!childrenMap[store.parent_id]) childrenMap[store.parent_id] = [];
        childrenMap[store.parent_id].push(store);
      }
    });

    const roots = mockStores
      .filter((s) => !s.parent_id)
      .map((root) => ({
        ...root,
        children: (childrenMap[root.id] || []).map((child) => ({
          ...child,
          children: [],
        })),
      }));

    return roots;
  };

  const storeTree = buildTree();

  const toggleNode = (id) => {
    const newSet = new Set(expandedNodes);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedNodes(newSet);
  };

  const getAllExpandable = (nodes) => {
    let ids = [];
    nodes.forEach((n) => {
      if (n.children.length > 0) {
        ids.push(n.id);
        ids = ids.concat(getAllExpandable(n.children));
      }
    });
    return ids;
  };

  const countDescendants = (node) =>
    node.children.length + node.children.reduce((acc, c) => acc + countDescendants(c), 0);

  const renderTreeNode = (node, level = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded-md cursor-pointer ${
            level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''
          }`}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          <div className="flex items-center space-x-2 flex-1">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
            <div className={`p-1.5 rounded ${node.type === 'Central Store' ? 'bg-blue-100' : 'bg-green-100'}`}>
              {node.type === 'Central Store' ? (
                <Building2 className="h-4 w-4 text-blue-600" />
              ) : (
                <Store className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">{node.name}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{node.code}</span>
                <span className={`text-xs px-2 py-1 rounded ${node.type === 'Central Store' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {node.type}
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[200px]" title={node.address}>
                    {node.address}
                  </span>
                </div>
                {node.store_manager && (
                  <span>
                    Manager: {node.store_manager.first_name} {node.store_manager.last_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // === Sorting ===
  const handleSort = (field) => {
    let direction = 'asc';
    if (sortConfig.field === field) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ field: direction ? field : null, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-4 w-4 text-blue-600" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="h-4 w-4 text-blue-600" />;
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  // === Export CSV ===
  const exportStoresToCSV = () => {
    const headers = ['Store ID', 'Store Name', 'Address', 'Store Type', 'Parent Store', 'Store Manager'];
    const rows = filteredAndSortedStores.map((store) => [
      `"${store.code}"`,
      `"${store.name}"`,
      `"${store.address}"`,
      `"${store.type}"`,
      `"${mockStores.find(s => s.id === store.parent_id)?.name || ''}"`,
      `"${store.store_manager ? `${store.store_manager.first_name} ${store.store_manager.last_name}` : ''}"`,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stores.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!');
  };

  // === Actions ===
  const openDeleteDialog = (store) => {
    setStoreToDelete(store);
    setIsDialogOpen(true);
  };

  const handleDeleteStore = () => {
    toast.success(`Store ${storeToDelete.code} deleted (mock)`);
    setIsDialogOpen(false);
    setStoreToDelete(null);
  };

  const handleFilterReset = () => {
    setSearchQuery('');
    setStoreTypeFilter('all');
    setManagerFilter('all');
    setNameFilter('all');
    setParentStoreFilter('all');
    setItemsPerPage(10);
    setCurrentPage(1);
    setSortConfig({ field: null, direction: null });
  };

  return (
    <TooltipProvider>
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Main Table Card */}
          <Card className="min-h-[85vh] shadow-sm">
            <CardHeader className="rounded-t-lg border-b pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                    <Store className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Store Management</CardTitle>
                    <CardDescription className="mt-1">
                      View your store details and storage capacity
                    </CardDescription>
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={exportStoresToCSV}
                    className="transition-colors me-2"
                    disabled={filteredAndSortedStores.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button className="transition-colors">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Store
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-col items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search stores by name or ID..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full justify-between flex-wrap">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select value={storeTypeFilter} onValueChange={(v) => { setStoreTypeFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by store type" />
                      </SelectTrigger>
                      <SelectContent>
                        {storeTypes.map(t => (
                          <SelectItem key={t} value={t}>
                            {t === 'all' ? 'All Store Types' : t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={managerFilter} onValueChange={(v) => { setManagerFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockManagers.map(m => (
                          <SelectItem key={m} value={m}>
                            {m === 'all' ? 'All Managers' : m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={nameFilter} onValueChange={(v) => { setNameFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by name" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockStoreNames.map(n => (
                          <SelectItem key={n} value={n}>
                            {n === 'all' ? 'All Store Names' : n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={parentStoreFilter} onValueChange={(v) => { setParentStoreFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by parent store" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockParentStores.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleFilterReset} className="px-3 py-2 text-sm">
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-lg overflow-hidden border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-gray-50 border-gray-200">
                      <TableHead className="font-semibold w-1/4">
                        <p className="h-8 flex items-center text-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600 ps-2" onClick={() => handleSort('code')}>
                          Store ID {getSortIcon('code')}
                        </p>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <p className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600" onClick={() => handleSort('name')}>
                          Store Name {getSortIcon('name')}
                        </p>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <p className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600" onClick={() => handleSort('address')}>
                          Address {getSortIcon('address')}
                        </p>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <p className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600" onClick={() => handleSort('type')}>
                          Store Type {getSortIcon('type')}
                        </p>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <p className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600" onClick={() => handleSort('parent_store')}>
                          Parent Store {getSortIcon('parent_store')}
                        </p>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <p className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600" onClick={() => handleSort('store_manager')}>
                          Store Manager {getSortIcon('store_manager')}
                        </p>
                      </TableHead>
                      <TableHead className="text-center font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center py-6">
                            <p className="text-base font-medium">No stores found</p>
                            <p className="text-sm text-gray-500">Try adjusting your search or filter</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedStores.map((store) => {
                        const isUsedInPO = mockPurchaseOrderStoreIds.includes(store.id);
                        const isDeleteDisabled = store.is_parent || isUsedInPO;

                        return (
                          <TableRow key={store.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium py-3"><p className='ps-2'>{store.code}</p></TableCell>
                            <TableCell className="font-medium">{store.name}</TableCell>
                            <TableCell className="min-w-[200px] whitespace-normal break-words" title={store.address}>
                              {store.address}
                            </TableCell>
                            <TableCell>{store.type}</TableCell>
                            <TableCell>{mockStores.find(s => s.id === store.parent_id)?.name || 'None'}</TableCell>
                            <TableCell>
                              {store.store_manager
                                ? `${store.store_manager.first_name} ${store.store_manager.last_name}`
                                : 'None'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-center gap-2">
                                <Button variant="outline" size="icon">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {isDeleteDisabled ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10 opacity-50" disabled>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {store.is_parent
                                          ? 'Deletion restricted: Connected to branch store.'
                                          : 'Cannot delete: Used in purchase orders.'}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => openDeleteDialog(store)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-6 gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Show</p>
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
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
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <div className="flex items-center justify-center text-sm font-medium bg-gray-100 px-3 py-1 rounded">
                      Page {currentPage} of {totalPages || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages || 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tree View Card */}
          <Card className="shadow-sm">
            <CardHeader className="rounded-t-lg border-b pb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Store Hierarchy</CardTitle>
                  <CardDescription className="mt-1">
                    View the hierarchical structure of central stores and their branches
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {storeTree.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-600">No store hierarchy available</p>
                  <p className="text-sm text-gray-500">Add central and branch stores to see hierarchy</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        Total Central Stores: <span className="font-semibold">{storeTree.length}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Total Branch Stores: <span className="font-semibold">{storeTree.reduce((acc, r) => acc + countDescendants(r), 0)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setExpandedNodes(new Set())}>
                        Collapse All
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setExpandedNodes(new Set(getAllExpandable(storeTree)))}>
                        Expand All
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg bg-gray-50/50 p-4 max-h-[600px] overflow-y-auto">
                    <div className="space-y-1">
                      {storeTree.map(node => renderTreeNode(node))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delete Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this store?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline" onClick={() => setStoreToDelete(null)}>No</Button>
                </DialogClose>
                <Button variant="destructive" onClick={handleDeleteStore}>Yes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </TooltipProvider>
  );
};