'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getProductSettings } from '@/lib/api/products';
import {
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    Template
} from '@/lib/api/quotes';
import { getOrganization, Organization } from '@/lib/api/organization';
import { Loader2, GripVertical, Plus, Trash2, FileText, Settings, Info } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dynamic from 'next/dynamic';
import { QuotePDFDocument } from '@/lib/pdf-document';

const PDFViewer = dynamic(() => import('@react-pdf/renderer').then(mod => mod.PDFViewer), {
    ssr: false,
    loading: () => <p className="p-4 text-center text-sm text-muted-foreground">Loading Preview...</p>,
});

const DUMMY_QUOTE = {
    snapshot: {
        customer_name: "Acme Corp",
        customer_email: "contact@acme.com",
        customer_phone: "+1 555 0101",
        customer_address: "123 Innovation Dr, Tech City",
        total_amount: "15400.00",
        families: [
            {
                family_name: "Living Room Setup",
                subtotal: 10000,
                margin_applied: 0.1,
                items: [
                    { name: "Sofa Sectional", quantity: 1, price: 5000, total: 5000, unit_type: "pcs" },
                    { name: "Coffee Table", quantity: 1, price: 2000, total: 2000, unit_type: "pcs" },
                    { name: "Floor Lamp", quantity: 2, price: 1500, total: 3000, unit_type: "pcs" }
                ]
            },
            {
                family_name: "Installation Services",
                subtotal: 2000,
                margin_applied: 0,
                items: [
                    { name: "Labor", quantity: 4, price: 500, total: 2000, unit_type: "hours" }
                ]
            },
            {
                family_name: "Bedroom Furniture",
                subtotal: 12000,
                margin_applied: 0.05,
                items: [
                    { name: "Queen Bed Frame", quantity: 1, price: 8000, total: 8000, unit_type: "pcs" },
                    { name: "Bedside Table", quantity: 2, price: 2000, total: 4000, unit_type: "pcs" },
                    { name: "Table Lamp", quantity: 2, price: 500, total: 1000, unit_type: "pcs" },
                    { name: "Wardrobe", quantity: 1, price: 15000, total: 15000, unit_type: "pcs" }
                ]
            },
            {
                family_name: "Office Setup",
                subtotal: 15000,
                margin_applied: 0.1,
                items: [
                    { name: "Ergonomic Chair", quantity: 2, price: 4000, total: 8000, unit_type: "pcs" },
                    { name: "Standing Desk", quantity: 1, price: 7000, total: 7000, unit_type: "pcs" },
                    { name: "Monitor Arm", quantity: 2, price: 1500, total: 3000, unit_type: "pcs" }
                ]
            },
            {
                family_name: "Kitchen Appliances",
                subtotal: 25000,
                margin_applied: 0.08,
                items: [
                    { name: "Refrigerator", quantity: 1, price: 18000, total: 18000, unit_type: "pcs" },
                    { name: "Microwave Oven", quantity: 1, price: 5000, total: 5000, unit_type: "pcs" },
                    { name: "Dishwasher", quantity: 1, price: 12000, total: 12000, unit_type: "pcs" },
                    { name: "Coffee Maker", quantity: 1, price: 3000, total: 3000, unit_type: "pcs" },
                    { name: "Toaster", quantity: 1, price: 1500, total: 1500, unit_type: "pcs" }
                ]
            }
        ]
    },
    display_id: "PREVI#04022026230427",
    created_at: new Date().toISOString()
};

// Fallback if org fetch fails
const FALLBACK_ORG = {
    name: "My Design Studio",
    logo_url: "",
    contact_number: "+1 234 567 8900",
    email: "hello@designstudio.com"
};

interface ColumnConfig {
    key: string;
    label: string;
    selected: boolean;
    isSystem: boolean;
    type?: 'text' | 'number' | 'formula';
    formula?: string;
    width?: number;
}

interface SortableItemProps {
    col: ColumnConfig;
    index: number;
    onToggle: (index: number, checked: boolean) => void;
    onLabelChange: (index: number, label: string) => void;
    onWidthChange: (index: number, width: number) => void;
    onRemove: (index: number) => void;
}

function SortableItem({ col, index, onToggle, onLabelChange, onWidthChange, onRemove }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: col.key });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 border rounded-md bg-white hover:bg-muted/50 transition-colors">
            <div {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
                <GripVertical className="h-5 w-5" />
            </div>
            <input
                type="checkbox"
                id={`col-${col.key}`}
                checked={col.selected}
                onChange={(e) => onToggle(index, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            // disabled={col.isSystem || ['name', 'price', 'quantity', 'unit_type', 'total'].includes(col.key)} // Core fields always checked? User didn't say always checked, but "show by default". Let's allow unchecking, but maybe warn. Actually user said "REMOVE these...", effectively setting new defaults.
            />
            <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 flex flex-col">
                    <label htmlFor={`col-${col.key}`} className="text-sm font-medium cursor-pointer select-none truncate" title={col.key}>
                        {col.key} <span className="text-xs text-muted-foreground ml-1">({col.type || 'text'})</span>
                    </label>
                    {col.type === 'formula' && <span className="text-xs text-muted-foreground italic truncate" title={col.formula}>{col.formula}</span>}
                </div>
                <div className="col-span-8 flex gap-2">
                    <Input
                        value={col.label}
                        onChange={(e) => onLabelChange(index, e.target.value)}
                        className="h-8 flex-1"
                        placeholder="Label"
                    />
                    <div className="relative w-24">
                        <Input
                            type="number"
                            value={col.width || ''}
                            onChange={(e) => onWidthChange(index, parseInt(e.target.value) || 0)}
                            className="h-8 pr-6"
                            placeholder="Width"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [columns, setColumns] = useState<ColumnConfig[]>([]);
    const [orgData, setOrgData] = useState<Organization | null>(null);

    // UI States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Dialog State for New Field
    const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
    const [newField, setNewField] = useState({ key: '', label: '', type: 'text', formula: '' });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchData();
    }, []);

    // When template changes, load its columns
    useEffect(() => {
        if (selectedTemplateId) {
            const tmpl = templates.find(t => t.id === selectedTemplateId);
            if (tmpl) {
                loadColumnsForTemplate(tmpl);
            }
        } else {
            setColumns([]);
        }
    }, [selectedTemplateId, templates]); // Depend on templates too in case they are reloaded

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tmplData, org] = await Promise.all([
                getTemplates(),
                getOrganization() // Fetch organization details
            ]);
            setTemplates(tmplData);
            setOrgData(org);
            if (tmplData.length > 0 && !selectedTemplateId) {
                setSelectedTemplateId(tmplData[0].id);
            }
        } catch (err: any) {
            setError(err.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplateName.trim()) return;
        setCreating(true);
        try {
            // Fetch custom product settings
            const settings = await getProductSettings();

            // Standard columns
            const standardCols = [
                { key: 'name', label: 'Item Name', type: 'text' },
                { key: 'quantity', label: 'Quantity', type: 'number' },
                { key: 'unit_type', label: 'Unit', type: 'text' },
                { key: 'price', label: 'Price', type: 'number' },
                { key: 'total', label: 'Total', type: 'formula', formula: 'price * quantity' }
            ];

            // Filter out system keys to get only custom columns
            const systemKeys = ['name', 'price', 'family', 'qty', 'quantity', 'total', 'unit_type', 'unit'];
            const customCols = settings
                .filter(c => !systemKeys.includes(c.key))
                .map(c => ({
                    key: c.key,
                    label: c.label,
                    type: c.type,
                    formula: c.formula
                }));

            // Combine: Name -> Custom Columns -> Rest of Standard Columns
            const finalCols = [
                standardCols[0], // Name
                ...customCols,
                ...standardCols.slice(1)
            ];

            const newTmpl = await createTemplate({
                name: newTemplateName,
                columns: finalCols
            });

            setTemplates([...templates, newTmpl]);
            setNewTemplateName('');
            setSelectedTemplateId(newTmpl.id);
        } catch (err: any) {
            alert("Failed to create template: " + err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this template?")) return;

        try {
            await deleteTemplate(id);
            const remaining = templates.filter(t => t.id !== id);
            setTemplates(remaining);
            if (selectedTemplateId === id) {
                setSelectedTemplateId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (err: any) {
            alert("Failed to delete template");
        }
    };

    const loadColumnsForTemplate = async (template: Template) => {
        try {
            // Standard columns always available
            const standardColumns = [
                { key: 'name', label: 'Item Name', type: 'text' },
                { key: 'quantity', label: 'Quantity', type: 'number' },
                { key: 'unit_type', label: 'Unit', type: 'text' },
                { key: 'price', label: 'Price', type: 'number' },
                { key: 'total', label: 'Total', type: 'formula', formula: 'price * quantity' }
            ];

            const availableMap = new Map();
            standardColumns.forEach(c => {
                availableMap.set(c.key, { ...c, isSystem: true });
            });

            // 2. Build list from template saved columns
            const finalColumns: ColumnConfig[] = [];
            const processedKeys = new Set();
            const savedColumns = template.columns || [];

            // If template has NO columns (migrated?), default to standard
            if (savedColumns.length === 0) {
                standardColumns.forEach(c => {
                    finalColumns.push({ ...c, selected: true, isSystem: true } as any);
                    processedKeys.add(c.key);
                });
            } else {
                savedColumns.forEach((col: any) => {
                    let key = col.key;
                    // Fix legacy 'item' -> 'name', 'qty' -> 'quantity', 'unit_price' -> 'price' mappings?
                    // Or if these are "old" templates, they might still have 'item'.
                    // The user said "Rename pdf template to quote template... check defaults".
                    // Let's assume we respect what's saved, but we can migrate legacy keys if needed.
                    // For now, load what is saved.

                    const def = availableMap.get(key);
                    finalColumns.push({
                        key: key,
                        label: col.label,
                        selected: col.selected !== false,
                        isSystem: def ? true : false,
                        type: col.type || (def ? def.type : 'text'),
                        formula: col.formula || (def ? def.formula : '')
                    });
                    processedKeys.add(key);
                });
            }

            // 3. Append missing standard keys (unselected)
            availableMap.forEach((def, key) => {
                if (!processedKeys.has(key)) {
                    finalColumns.push({
                        ...def,
                        selected: false,
                        isSystem: true
                    });
                }
            });

            // Distribute widths if no valid widths exist (Legacy or new templates)
            const hasValidWidths = finalColumns.some(c => c.selected && c.width && c.width > 0);
            if (!hasValidWidths) {
                const selectedCount = finalColumns.filter(c => c.selected).length;
                if (selectedCount > 0) {
                    const equalWidth = Math.floor(100 / selectedCount);
                    finalColumns.forEach(c => {
                        if (c.selected) {
                            c.width = equalWidth;
                        }
                    });
                }
            }

            setColumns(finalColumns);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveColumns = async () => {
        if (!selectedTemplateId) return;
        setSaving(true);
        try {
            const updated = await updateTemplate(selectedTemplateId, { columns });
            setTemplates(templates.map(t => t.id === selectedTemplateId ? updated : t));
        } catch (err: any) {
            alert("Failed to update template");
        } finally {
            setSaving(false);
        }
    };

    const handleAddField = () => {
        if (!newField.key || !newField.label) {
            alert("Key and Label are required");
            return;
        }

        const newCol: ColumnConfig = {
            key: newField.key,
            label: newField.label,
            selected: true,
            isSystem: false,
            type: newField.type as any,
            formula: newField.formula
        };

        setColumns([...columns, newCol]);
        setIsAddFieldOpen(false);
        setNewField({ key: '', label: '', type: 'text', formula: '' });
    };

    // DND Handlers
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setColumns((items) => {
                const oldIndex = items.findIndex((item) => item.key === active.id);
                const newIndex = items.findIndex((item) => item.key === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleToggle = (index: number, checked: boolean) => {
        const newCols = [...columns];
        newCols[index].selected = checked;
        setColumns(newCols);
    };

    const handleLabelChange = (index: number, val: string) => {
        const newCols = [...columns];
        newCols[index].label = val;
        setColumns(newCols);
    };

    const handleWidthChange = (index: number, val: number) => {
        const newCols = [...columns];
        newCols[index].width = val;
        setColumns(newCols);
    };

    if (loading && templates.length === 0) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex h-[calc(100vh-88px)] overflow-hidden">
            {/* Sidebar: List of Templates */}
            <div className="w-64 pr-2 border-r bg-gray-50 flex flex-col">
                <div className="pb-2 border-b">
                    <h2 className="font-semibold mb-2">Quote Templates</h2>
                    <div className="flex gap-2">
                        <Input
                            placeholder="New Template Name"
                            value={newTemplateName}
                            onChange={e => setNewTemplateName(e.target.value)}
                            className="h-9"
                        />
                        <Button size="icon" className="h-9 w-9 shrink-0 bg-blue-600 hover:bg-blue-700" onClick={handleCreateTemplate} disabled={creating || !newTemplateName.trim()}>
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto py-2 space-y-1">
                    {templates.map(tmpl => (
                        <div
                            key={tmpl.id}
                            className={`flex items-center justify-between p-3 rounded-md cursor-pointer group ${selectedTemplateId === tmpl.id ? 'bg-white shadow border border-blue-200 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
                            onClick={() => setSelectedTemplateId(tmpl.id)}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText className={`h-4 w-4 shrink-0 ${selectedTemplateId === tmpl.id ? 'text-blue-500' : 'text-gray-400'}`} />
                                <span className="truncate font-medium text-sm">{tmpl.name}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                onClick={(e) => handleDeleteTemplate(tmpl.id, e)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content: Editor & Preview */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {selectedTemplateId ? (
                    <div className="flex h-full">
                        {/* Editor Column */}
                        <div className="w-[40%] bg-gray-50 px-2 flex flex-col border-r">
                            <div className="flex-1 overflow-y-auto">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h1 className="text-2xl font-bold">{templates.find(t => t.id === selectedTemplateId)?.name}</h1>
                                            <p className="text-gray-500 text-sm">Configure fields for this quote template.</p>
                                        </div>
                                        <Dialog open={isAddFieldOpen} onOpenChange={setIsAddFieldOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline">
                                                    <Plus className="mr-2 h-4 w-4" /> Add Field
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add New Field</DialogTitle>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label className="text-right">Label</Label>
                                                        <Input className="col-span-3" value={newField.label} onChange={e => setNewField({ ...newField, label: e.target.value })} />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label className="text-right">Key (Auto)</Label>
                                                        <Input className="col-span-3" value={newField.label.toLowerCase().replace(/\s+/g, '_')} disabled placeholder="Auto-generated" />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label className="text-right">Type</Label>
                                                        <Select value={newField.type} onValueChange={val => setNewField({ ...newField, type: val })}>
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="text">Text</SelectItem>
                                                                <SelectItem value="number">Number</SelectItem>
                                                                <SelectItem value="formula">Formula</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    {newField.type === 'formula' && (
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label className="text-right">Formula</Label>
                                                            <Input className="col-span-3" placeholder="e.g. price * quantity" value={newField.formula} onChange={e => setNewField({ ...newField, formula: e.target.value })} />
                                                        </div>
                                                    )}
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={() => {
                                                        const key = newField.label.toLowerCase().replace(/\s+/g, '_');
                                                        if (columns.some(c => c.key === key)) {
                                                            alert('Field with this key already exists');
                                                            return;
                                                        }
                                                        setNewField({ ...newField, key });
                                                        handleAddField();
                                                    }}>Add Field</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={columns.map(c => c.key)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-3">
                                                {columns.map((col, index) => (
                                                    <SortableItem
                                                        key={col.key}
                                                        col={col}
                                                        index={index}
                                                        onToggle={handleToggle}
                                                        onLabelChange={handleLabelChange}
                                                        onWidthChange={handleWidthChange}
                                                        onRemove={() => {/* Implement remove if needed */ }}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            </div>
                            {/* Save Button Footer */}
                            <div className="pt-2 border-t flex justify-end">
                                <Button onClick={handleSaveColumns} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Configuration
                                </Button>
                            </div>
                        </div>

                        {/* Preview Column */}
                        <div className="w-[60%] bg-gray-50 pl-2 flex flex-col border-l">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="font-semibold text-sm uppercase text-gray-500">Live Preview</h3>
                            </div>
                            <div className="flex-1 border rounded bg-white shadow-sm overflow-hidden relative">
                                <PDFViewer width="100%" height="100%" showToolbar={true}>
                                    <QuotePDFDocument
                                        key={JSON.stringify(columns.filter(c => c.selected))}
                                        quoteData={DUMMY_QUOTE}
                                        orgSettings={orgData || FALLBACK_ORG}
                                        pdfSettings={{ columns: columns.filter(c => c.selected) }}
                                    />
                                </PDFViewer>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>Select a template to edit its configuration.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
