'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getProductSettings } from '@/lib/api/products';
import { getTemplateSettings, updateTemplateSettings } from '@/lib/api/quotes';
import { Loader2, GripVertical } from 'lucide-react';
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [columns, setColumns] = useState<ColumnConfig[]>([]);
    const [error, setError] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const [productSettings, templateSettings] = await Promise.all([
                getProductSettings().catch(e => {
                    console.error("Error fetching product settings:", e);
                    return [];
                }),
                getTemplateSettings().catch(e => {
                    console.error("Error fetching template settings:", e);
                    return [];
                })
            ]);

            const standardColumns = [
                { key: 'name', label: 'DESCRIPTION' },
                { key: 'family', label: 'FAMILY' },
                { key: 'unit_type', label: 'UNIT' },
                { key: 'qty', label: 'QTY' },
                { key: 'price', label: 'PRICE' },
                { key: 'total', label: 'TOTAL' }
            ];

            const safeTemplateSettings = Array.isArray(templateSettings) ? templateSettings : [];
            const safeProductSettings = Array.isArray(productSettings) ? productSettings : [];

            // 1. Create a map of all available definitions
            const availableMap = new Map();

            // Add standard
            standardColumns.forEach(c => {
                availableMap.set(c.key, { ...c, isSystem: true });
            });
            // Add product settings (custom)
            safeProductSettings.forEach((p: any) => {
                if (!availableMap.has(p.key)) {
                    availableMap.set(p.key, { key: p.key, label: p.label, isSystem: false });
                }
            });

            // 2. Build the list based on SAVED order first
            const finalColumns: ColumnConfig[] = [];
            const processedKeys = new Set();

            safeTemplateSettings.forEach((setting: any) => {
                const def = availableMap.get(setting.key);
                if (def) {
                    finalColumns.push({
                        key: setting.key,
                        label: setting.label, // Use saved label
                        selected: true,
                        isSystem: def.isSystem
                    });
                    processedKeys.add(setting.key);
                }
            });

            // 3. Append remaining available columns (unselected)
            // Note: If templateSettings is empty (first run), we select defaults
            const isFirstRun = safeTemplateSettings.length === 0;

            availableMap.forEach((def, key) => {
                if (!processedKeys.has(key)) {
                    let selected = false;
                    if (isFirstRun && ['name', 'family', 'unit_type', 'qty', 'price', 'total'].includes(key)) {
                        selected = true;
                    }

                    finalColumns.push({
                        key: def.key,
                        label: def.label,
                        selected: selected,
                        isSystem: def.isSystem
                    });
                }
            });

            setColumns(finalColumns);

        } catch (error: any) {
            console.error("Failed to load settings", error);
            setError(error.message || "Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

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

    const handleSave = async () => {
        setSaving(true);
        try {
            // Filter only selected columns, maintain ORDER
            const payload = columns.filter(c => c.selected).map(c => ({
                key: c.key,
                label: c.label
            }));
            await updateTemplateSettings(payload);
        } catch (error) {
            console.error("Failed to save settings", error);
        } finally {
            setSaving(false);
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

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">PDF Template Settings</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Column Configuration</CardTitle>
                    <CardDescription>Select, rename, and reorder (drag & drop) columns to be included in the Quote PDF.</CardDescription>
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
                            <div className="space-y-4">
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

                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
