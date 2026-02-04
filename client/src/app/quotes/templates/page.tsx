'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getProductSettings } from '@/lib/api/products';
import {
    getPDFTemplates,
    createPDFTemplate,
    updatePDFTemplate,
    deletePDFTemplate,
    PDFTemplate
} from '@/lib/api/quotes';
import { Loader2, GripVertical, Plus, Trash2, FileText } from 'lucide-react';
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

interface ColumnConfig {
    key: string;
    label: string;
    selected: boolean;
    isSystem: boolean;
}

interface SortableItemProps {
    col: ColumnConfig;
    index: number;
    onToggle: (index: number, checked: boolean) => void;
    onLabelChange: (index: number, label: string) => void;
}

function SortableItem({ col, index, onToggle, onLabelChange }: SortableItemProps) {
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
        <div ref={setNodeRef} style={style} className="flex items-center gap-4 p-3 border rounded-md bg-white hover:bg-muted/50 transition-colors">
            <div {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
                <GripVertical className="h-5 w-5" />
            </div>
            <input
                type="checkbox"
                id={`col-${col.key}`}
                checked={col.selected}
                onChange={(e) => onToggle(index, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                <label htmlFor={`col-${col.key}`} className="text-sm font-medium cursor-pointer select-none">
                    {col.key} <span className="text-xs text-muted-foreground ml-1">({col.isSystem ? 'System' : 'Custom'})</span>
                </label>
                <Input
                    value={col.label}
                    onChange={(e) => onLabelChange(index, e.target.value)}
                    className="h-8"
                    placeholder="Column Label"
                />
            </div>
        </div>
    );
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<PDFTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [columns, setColumns] = useState<ColumnConfig[]>([]);

    // UI States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchTemplates();
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

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const data = await getPDFTemplates();
            setTemplates(data);
            if (data.length > 0 && !selectedTemplateId) {
                setSelectedTemplateId(data[0].id);
            }
        } catch (err: any) {
            setError(err.message || "Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplateName.trim()) return;
        setCreating(true);
        try {
            // Default columns for new template
            const defaultCols = [
                { key: 'item', label: 'DESCRIPTION' },
                { key: 'qty', label: 'QTY' },
                { key: 'unit_price', label: 'PRICE' },
                { key: 'total', label: 'TOTAL' }
            ];

            const newTmpl = await createPDFTemplate({
                name: newTemplateName,
                columns: defaultCols
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
            await deletePDFTemplate(id);
            const remaining = templates.filter(t => t.id !== id);
            setTemplates(remaining);
            if (selectedTemplateId === id) {
                setSelectedTemplateId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (err: any) {
            alert("Failed to delete template");
        }
    };

    const loadColumnsForTemplate = async (template: PDFTemplate) => {
        try {
            const productSettings = await getProductSettings().catch(() => []);

            // Standard columns always available
            const standardColumns = [
                { key: 'name', label: 'DESCRIPTION' },
                { key: 'family', label: 'FAMILY' },
                { key: 'unit_type', label: 'UNIT' },
                { key: 'qty', label: 'QTY' },
                { key: 'price', label: 'PRICE' },
                { key: 'total', label: 'TOTAL' }
            ];

            const safeProductSettings = Array.isArray(productSettings) ? productSettings : [];
            const availableMap = new Map();

            // 1. Map available definitions
            standardColumns.forEach(c => {
                availableMap.set(c.key, { ...c, isSystem: true });
            });
            // Handle 'item' vs 'name' legacy mapping
            availableMap.set('item', { key: 'item', label: 'DESCRIPTION', isSystem: true });

            safeProductSettings.forEach((p: any) => {
                if (!availableMap.has(p.key)) {
                    availableMap.set(p.key, { key: p.key, label: p.label, isSystem: false });
                }
            });

            // 2. Build list from template saved columns
            const finalColumns: ColumnConfig[] = [];
            const processedKeys = new Set();

            const savedColumns = template.columns || [];

            savedColumns.forEach((col: any) => {
                // normalize key if needed
                let key = col.key;
                const def = availableMap.get(key);
                // Even if definition missing (deleted field), we show it if it was saved? 
                // Better to only show if definition exists OR if it's a known system key.
                if (def || true) {
                    finalColumns.push({
                        key: key,
                        label: col.label,
                        selected: true,
                        isSystem: def ? def.isSystem : false
                    });
                    processedKeys.add(key);
                }
            });

            // 3. Append remaining keys (unselected)
            availableMap.forEach((def, key) => {
                if (!processedKeys.has(key) && key !== 'item') { // skip duplicate item/name
                    finalColumns.push({
                        key: def.key,
                        label: def.label,
                        selected: false,
                        isSystem: def.isSystem
                    });
                }
            });

            setColumns(finalColumns);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveColumns = async () => {
        if (!selectedTemplateId) return;
        setSaving(true);
        try {
            const payload = columns.filter(c => c.selected).map(c => ({
                key: c.key,
                label: c.label
            }));

            const updated = await updatePDFTemplate(selectedTemplateId, { columns: payload });
            // Update local state
            setTemplates(templates.map(t => t.id === selectedTemplateId ? updated : t));
        } catch (err: any) {
            alert("Failed to update template");
        } finally {
            setSaving(false);
        }
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

    if (loading && templates.length === 0) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Sidebar: List of Templates */}
            <div className="w-80 border-r bg-gray-50 flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="font-semibold mb-4">PDF Templates</h2>
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
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                    {templates.length === 0 && !loading && (
                        <div className="text-center p-8 text-gray-400 text-sm">
                            No templates found. Create one to get started.
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content: Editor */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {selectedTemplateId ? (
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h1 className="text-2xl font-bold">{templates.find(t => t.id === selectedTemplateId)?.name}</h1>
                                    <p className="text-gray-500">Configure columns for this PDF template.</p>
                                </div>
                                <Button onClick={handleSaveColumns} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Configuration
                                </Button>
                            </div>

                            <Card>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg">Columns</CardTitle>
                                    <CardDescription>Drag to reorder. Toggle to show/hide. Rename labels as needed.</CardDescription>
                                </CardHeader>
                                <CardContent>
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
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </CardContent>
                            </Card>
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
