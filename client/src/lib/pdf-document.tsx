
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

import path from 'path';

const getFontSrc = (fontFile: string) => {
    if (typeof window === 'undefined') {
        // Server-side
        return path.resolve(process.cwd(), 'public/fonts', fontFile);
    }
    // Client-side
    return `/fonts/${fontFile}`;
};

Font.register({
    family: 'Outfit',
    fonts: [
        { src: getFontSrc('Outfit-Regular.ttf'), fontWeight: 400 },
        { src: getFontSrc('Outfit-Bold.ttf'), fontWeight: 700 },
    ]
});

// Styles
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Outfit', // Updated to Outfit
        fontSize: 10,
        lineHeight: 1.4,
        color: '#333',
        paddingTop: 150, // Space for fixed header
        paddingBottom: 70, // Space for fixed footer
        paddingHorizontal: 40,
    },
    headerFixed: {
        position: 'absolute',
        top: 30,
        left: 40,
        right: 40,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    pageNumber: {
        position: 'absolute',
        fontSize: 10,
        bottom: -20, // relative to footer container
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#999',
    },
    headerRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 20,
        marginBottom: 10,
    },
    logoSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
        marginBottom: 4
    },
    logo: {
        width: 40,
        height: 40,
        objectFit: 'contain',
    },
    orgDetails: {
        marginLeft: 10,
    },
    orgName: {
        fontSize: 20,
        marginBottom: 12,
        fontWeight: 'bold',
        color: '#000',
    },
    orgTagline: {
        fontSize: 12,
        color: '#000',
    },
    orgInfo: {
        fontSize: 10,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 20,
        textAlign: 'right',
        color: '#1a1a1a',
        fontWeight: 'bold',
    },
    separator: {
        borderBottomWidth: 1,
        borderBottomColor: '#333'
    },
    infoSection: {
        marginTop: 8,
        gap: 2
    },
    infoGrid: {
        // flexDirection: 'row', // nested grids are tricky, just use blocks for now or flex-row lines
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2
    },
    label: {
        fontWeight: 'bold',
        textTransform: 'uppercase',
        width: 80,
    },
    value: {
        flex: 1,
        textTransform: 'uppercase',
    },
    labelRight: {
        width: 60,
        fontWeight: 'bold',
        textAlign: 'left'
    },
    valueRight: {
        width: 140,
        textAlign: 'right',
    },
    greeting: {
        marginTop: 20,
        fontSize: 14,
        lineHeight: 1.4
    },

    // Table
    familySection: {
        // marginTop: 15,
    },
    familyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 14,
        marginTop: 10,
    },
    table: {
        width: '100%',
        // borderCollapse: 'collapse', // not supported
    },
    tableHeader: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#333',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        backgroundColor: '#f9f9f9',
        paddingVertical: 5,
        alignItems: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 5,
    },
    th: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    td: {
        fontSize: 11,
    },

    // Totals
    summaryRow: {
        flexDirection: 'row',
        paddingVertical: 3,
        backgroundColor: '#f9f9f9',
        marginTop: 0,
    },
    grandTotal: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'right',
        marginTop: 30,
        padding: 10,
        borderTopWidth: 2,
        borderTopColor: '#333',
    }
});

interface QuotePDFProps {
    quoteData: any;
    orgSettings: any;
    pdfSettings: any;
}

export const QuotePDFDocument: React.FC<QuotePDFProps> = ({ quoteData, orgSettings, pdfSettings }) => {
    // Data Preparation
    const data = quoteData.snapshot || quoteData;
    const customerName = data.customer_name || quoteData.customer_name || 'Customer';
    const createdDate = new Date(quoteData.created_at || new Date()).toISOString().split('T')[0];
    const families = data.families || quoteData.families || [];
    const totalAmount = parseFloat(data.total_amount || quoteData.total_amount || 0).toFixed(2);

    const orgName = orgSettings?.name || "Quotely";
    const orgTagline = orgSettings?.tagline;
    const defaultLogo = "https://placehold.co/100x100.png?text=Logo";
    let orgLogo = orgSettings?.logo_url || defaultLogo;

    // React-pdf Image doesn't support SVGs nicely via src. 
    if (orgLogo && orgLogo.toLowerCase().endsWith('.svg')) {
        console.warn(`Quotely: SVG logos are not supported in PDF generation. Please use PNG/JPG. URL: ${orgLogo}`);
        // Fallback to default if custom logo is SVG, or just don't show it if default is also SVG (unlikely with new default)
        orgLogo = defaultLogo;
    }

    const orgContact = orgSettings?.contact_number || "+91 1234567890";
    const orgEmail = orgSettings?.email || "support@quotely.com";
    const orgAddress = orgSettings?.address || "123 Main St, City, Country";

    const displayId = quoteData.display_id || quoteData.id || quoteData.SK?.split('#')[1] || 'NEW';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                {/* Fixed Header */}
                <View fixed style={styles.headerFixed}>
                    <View style={styles.headerRow}>
                        <View style={styles.logoSection}>
                            {orgLogo && <Image src={orgLogo} style={styles.logo} />}
                            <View style={styles.orgDetails}>
                                <Text style={styles.orgName}>{orgName}</Text>
                                <Text style={styles.orgTagline}>{orgTagline}</Text>
                            </View>
                        </View>
                        <Text style={styles.title}>QUOTATION</Text>
                    </View>
                    <View style={styles.headerRow}>
                        <View style={{ width: '100%' }}>
                            <View style={styles.infoRow}>
                                <Text style={styles.labelRight}>CONTACT</Text>
                                <Text style={styles.valueRight}>{orgContact}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.labelRight}>EMAIL</Text>
                                <Text style={styles.valueRight}>{orgEmail}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.labelRight}>ADDRESS</Text>
                                <Text style={styles.valueRight}>{orgAddress}</Text>
                            </View>
                        </View>
                        <View style={{ width: '100%' }}>
                            <View style={styles.infoRow}>
                                <Text style={styles.labelRight}>DATE</Text>
                                <Text style={styles.valueRight}>{createdDate}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.labelRight}>QUOTE ID</Text>
                                <Text style={styles.valueRight}>{displayId}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.separator} />
                </View>

                {/* Info Section - Not fixed, but part of first page context usually. 
                    However, if we want repeated headers on ALL pages, usually that just means the logo/org info.
                    The user said "Header section fixed and will be repeated".
                    Usually customer info is only on page 1.
                    Let's keep customer info flexible (not fixed) so it scrolls away, 
                    but keep the top Org/Quote info fixed.
                */}

                {/* Space for fixed header on subsequent pages if needed, or just let natural flow handle it if padding is right.
                    React-pdf 'fixed' elements are taken out of flow. We need page padding-top to compensate.
                */}

                {/* Info Section (Customer Details) */}
                <View style={styles.infoSection}>
                    <Text style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 'bold' }}>CUSTOMER DETAILS:</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>NAME</Text>
                        <Text style={styles.value}>{customerName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>EMAIL</Text>
                        <Text style={styles.value}>{data.customer_email || ''}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>PHONE</Text>
                        <Text style={styles.value}>{data.customer_phone || ''}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>ADDRESS</Text>
                        <Text style={styles.value}>{data.customer_address || ''}</Text>
                    </View>
                </View>

                <Text style={styles.greeting}>
                    Dear Sir/Ma'am, Thank you for your interest in our services. Please find our formal quotation below:
                </Text>

                {/* Families and Items */}
                {families.map((family: any, fIndex: number) => {
                    const familyName = family.family_name || 'Family';
                    let columns = pdfSettings?.columns || [];
                    if (!columns || columns.length === 0) {
                        columns = [
                            { key: 'item', label: 'DESCRIPTION' },
                            { key: 'qty', label: 'QTY', align: 'end' },
                            { key: 'unit_price', label: 'PRICE', align: 'end' },
                            { key: 'total', label: 'TOTAL', align: 'end' }
                        ];
                    }

                    // Helper to resolve values including aliases
                    const getValue = (item: any, key: string) => {
                        if (key === 'quantity' || key === 'qty') return parseFloat(item.quantity || item.qty || 0);
                        if (key === 'price' || key === 'unit_price') return parseFloat(item.price || item.unit_price || 0);
                        if (key === 'total') return parseFloat(item.total || 0);
                        if (key === 'name' || key === 'item') return item.name || item.item || '';
                        if (key === 'family' || key === 'family_name') return familyName;
                        if (key === 'unit_type' || key === 'unit') return (item.unit_type || item.unit || '').toUpperCase();
                        return item.custom_fields?.[key] || item[key] || '';
                    };

                    const evaluateFormula = (formula: string, item: any) => {
                        try {
                            // Simple safe eval using function constructor with restricted scope
                            const price = parseFloat(item.price || item.unit_price || 0);
                            const quantity = parseFloat(item.quantity || item.qty || 0);
                            const total = parseFloat(item.total || 0);

                            // Replace known variables in formula string or setup scope
                            // We support 'price', 'quantity', 'qty', 'unit_price' in the formula string
                            const func = new Function('price', 'quantity', 'qty', 'unit_price', 'total', `return ${formula}`);
                            return func(price, quantity, quantity, price, total);
                        } catch (e) {
                            return 0;
                        }
                    };

                    // Helper to determine widths/alignments
                    const getColStyle = (col: any) => {
                        let align = col.align || 'left';
                        const key = col.key;
                        if (['qty', 'quantity', 'unit_price', 'price', 'total', 'base_margin', 'sub_total'].includes(key) || col.type === 'number' || col.type === 'formula') {
                            align = 'right';
                        }

                        let width = '15%'; // default
                        if (key === 'item' || key === 'name' || col.label === 'Item Name' || col.label === 'DESCRIPTION') {
                            width = '35%';
                        } else if (key === 'quantity' || key === 'qty' || key === 'unit_type') {
                            width = '12%';
                        } else if (key === 'total') {
                            width = '20%';
                        }

                        // Adjust flexGrow based on importance
                        const flexGrow = (key === 'name' || key === 'item' || key === 'description') ? 2 : 1;

                        return {
                            textAlign: align as any,
                            flexBasis: width,
                            flexGrow: flexGrow,
                            paddingHorizontal: 2,
                            lineHeight: 1
                        };
                    };

                    return (
                        <View key={fIndex} break={false} style={styles.familySection}>
                            <Text style={styles.familyTitle}>{familyName}</Text>

                            <View style={styles.table}>
                                {/* Header */}
                                <View style={styles.tableHeader}>
                                    {columns.map((col: any, cIndex: number) => (
                                        <Text key={cIndex} style={[styles.th, getColStyle(col)]}>
                                            {col.label}
                                        </Text>
                                    ))}
                                </View>

                                {/* Rows */}
                                {family.items?.map((item: any, iIndex: number) => (
                                    <View key={iIndex} style={styles.tableRow}>
                                        {columns.map((col: any, cIndex: number) => {
                                            const key = col.key;
                                            let val: any = '';

                                            if (col.type === 'formula' && col.formula) {
                                                const computed = evaluateFormula(col.formula, item);
                                                // Format purely based on key if it looks like money? Or just generic number?
                                                // Usually formulas like total are money.
                                                // Let's assume generic number formatting for now, unless key is 'total' or 'price'.
                                                if (key === 'total' || key === 'price' || key.includes('price') || key.includes('amount')) {
                                                    val = `Rs. ${parseFloat(computed).toFixed(2)}`;
                                                } else {
                                                    val = parseFloat(computed).toFixed(2);
                                                }
                                            } else {
                                                const rawVal = getValue(item, key);

                                                if (key === 'quantity' || key === 'qty') {
                                                    val = parseFloat(rawVal).toFixed(2);
                                                    // Only append unit if using legacy 'qty' behavior? 
                                                    // User separated columns. So strictly number.
                                                } else if (key === 'price' || key === 'unit_price') {
                                                    val = `Rs. ${parseFloat(rawVal).toFixed(2)}`;
                                                } else if (key === 'total') {
                                                    val = `Rs. ${parseFloat(rawVal).toFixed(2)}`;
                                                } else {
                                                    val = rawVal;
                                                }
                                            }

                                            return (
                                                <Text key={cIndex} style={[styles.td, getColStyle(col)]}>
                                                    {val}
                                                </Text>
                                            );
                                        })}
                                    </View>
                                ))}

                                {/* Subtotals */}
                                {(() => {
                                    const subtotal = parseFloat(family.subtotal || 0);
                                    const margin = parseFloat(family.margin_applied || 0);

                                    // For totals, we just want a simple right aligned rows.
                                    // Aligning strictly with columns is hard without a strict grid.
                                    // We'll mimic the "colspan" behavior by using a full flex row with content justified to end.

                                    return (
                                        <View style={{ borderTopWidth: 1, borderTopColor: '#333' }}>
                                            <View style={styles.summaryRow}>
                                                <View style={{ flex: 1 }}></View>
                                                <Text style={{ width: '30%', textAlign: 'right', fontWeight: 'bold', paddingRight: 4 }}>SUB TOTAL</Text>
                                                <Text style={{ width: '20%', textAlign: 'right', paddingRight: 2 }}>Rs. {subtotal.toFixed(2)}</Text>
                                            </View>
                                            {margin > 0 && (
                                                <>
                                                    <View style={styles.summaryRow}>
                                                        <View style={{ flex: 1 }}></View>
                                                        <Text style={{ width: '30%', textAlign: 'right', fontWeight: 'bold', textTransform: 'uppercase', paddingRight: 4 }}>Margin Applied ({(margin * 100).toFixed(0)}%)</Text>
                                                        <Text style={{ width: '20%', textAlign: 'right', paddingRight: 2 }}>Rs. {(subtotal * margin).toFixed(2)}</Text>
                                                    </View>
                                                    <View style={styles.summaryRow}>
                                                        <View style={{ flex: 1 }}></View>
                                                        <Text style={{ width: '30%', textAlign: 'right', fontWeight: 'bold', textTransform: 'uppercase', paddingRight: 4 }}>SECTION TOTAL</Text>
                                                        <Text style={{ width: '20%', textAlign: 'right', paddingRight: 2 }}>Rs. {(subtotal * (1 + margin)).toFixed(2)}</Text>
                                                    </View>
                                                </>
                                            )}
                                        </View>
                                    );
                                })()}
                            </View>
                        </View>
                    );
                })}

                <Text style={styles.grandTotal}>
                    GRAND TOTAL: Rs. {totalAmount}
                </Text>

                <View fixed style={styles.footer}>
                    <Text>If you have any questions about this price quote, please reach out to us</Text>
                    <Text style={{ fontWeight: 'bold', marginTop: 4 }}>Thank You For Your Business!</Text>
                    {/* Page Numbers */}
                    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
                        `${pageNumber} / ${totalPages}`
                    )} fixed />
                </View>
            </Page>
        </Document>
    );
};
