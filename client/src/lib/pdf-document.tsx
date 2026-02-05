
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Styles
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        lineHeight: 1.4,
        color: '#333',
        padding: 40, // ~10mm + padding
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    logoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logo: {
        width: 50,
        height: 50,
        objectFit: 'contain',
    },
    orgDetails: {
        marginLeft: 10,
    },
    orgName: {
        fontSize: 16,
        marginBottom: 12,
        fontWeight: 'bold',
        color: '#000',
    },
    orgInfo: {
        fontSize: 10,
        marginVertical: 1,
    },
    title: {
        fontSize: 28,
        color: '#1a1a1a',
        fontWeight: 'bold',
    },
    separator: {
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        marginVertical: 10,
    },
    infoSection: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 10,
    },
    infoBoxLeft: {
        flex: 1,
    },
    infoBoxRight: {
        width: 200,
        alignItems: 'flex-end',
    },
    infoGrid: {
        // flexDirection: 'row', // nested grids are tricky, just use blocks for now or flex-row lines
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 4,
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
        fontWeight: 'bold',
        width: 80,
        textAlign: 'left',
    },
    valueRight: {
        textAlign: 'right',
    },
    greeting: {
        marginTop: 20,
        fontSize: 14,
        lineHeight: 1.4,
        marginBottom: 10,
    },

    // Table
    familySection: {
        marginTop: 15,
    },
    familyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 10,
    },
    table: {
        width: '100%',
        // borderCollapse: 'collapse', // not supported
    },
    tableHeader: {
        flexDirection: 'row',
        borderTopWidth: 2,
        borderTopColor: '#333',
        borderBottomWidth: 2,
        borderBottomColor: '#333',
        backgroundColor: '#f9f9f9',
        paddingVertical: 4,
        alignItems: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 4,
    },
    th: {
        fontSize: 11,
        fontWeight: 'bold',
        // flex: 1, // dynamic
    },
    td: {
        fontSize: 11,
        // flex: 1, // dynamic
    },

    // Totals
    summaryRow: {
        flexDirection: 'row',
        paddingVertical: 4,
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
    // React-pdf Image doesn't support SVGs nicely via src. If logo is SVG, this might break. 
    // Ideally we should use a png/jpg fallback.
    console.log('Logo Url: ', orgSettings.logo_url);

    const orgLogo = orgSettings?.logo_url || "https://www.reflectyourvibe.in/images/favicon.svg";
    const orgContact = orgSettings?.contact_number || "+91 1234567890";
    const orgEmail = orgSettings?.email || "support@quotely.com";

    const displayId = quoteData.display_id || quoteData.id || quoteData.SK?.split('#')[1] || 'NEW';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View style={styles.logoSection}>
                        {/* Note: If orgLogo is SVG, this might fail to render or render blank */}
                        {orgLogo && <Image src={orgLogo} style={styles.logo} />}
                        <View style={styles.orgDetails}>
                            <Text style={styles.orgName}>{orgName}</Text>
                            <Text style={styles.orgInfo}>Contact: {orgContact}</Text>
                            <Text style={styles.orgInfo}>Email: {orgEmail}</Text>
                        </View>
                    </View>
                    <Text style={styles.title}>QUOTATION</Text>
                </View>

                <View style={styles.separator} />

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <View style={styles.infoBoxLeft}>
                        <Text style={{ marginBottom: 8, fontWeight: 'bold' }}>CUSTOMER DETAILS:</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Name:</Text>
                            <Text style={styles.value}>{customerName}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Email:</Text>
                            <Text style={styles.value}>{data.customer_email || ''}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Phone:</Text>
                            <Text style={styles.value}>{data.customer_phone || ''}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Address:</Text>
                            <Text style={styles.value}>{data.customer_address || ''}</Text>
                        </View>
                    </View>

                    <View style={styles.infoBoxRight}>
                        <View style={styles.infoRow}>
                            <Text style={styles.labelRight}>DATE:</Text>
                            <Text style={styles.valueRight}>{createdDate}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.labelRight}>QUOTE ID:</Text>
                            <Text style={styles.valueRight}>{displayId}</Text>
                        </View>
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

                    // Helper to determine widths/alignments
                    const getColStyle = (col: any) => {
                        let align = col.align || 'left';
                        const key = col.key;
                        if (['qty', 'unit_price', 'total', 'price', 'base_margin', 'sub_total'].includes(key)) {
                            align = 'right'; // react-pdf uses 'right' not 'end' for textAlign usually (though flex uses flex-end)
                        }

                        let width = '15%'; // default
                        if (key === 'item' || key === 'name' || col.label === 'DESCRIPTION') {
                            width = '40%';
                        } else if (key === 'qty') {
                            width = '15%';
                        }

                        // Distribute remaining space? simplified logic:
                        // If 4 cols: 40 + 20 + 20 + 20

                        // Let's rely on flex if possible, but tables in PDF are harder with flex alone if headers/rows don't align perfectly.
                        // Setting explicit percentage widths is safer.

                        return {
                            textAlign: align as any,
                            flexBasis: width,
                            flexGrow: key === 'item' ? 2 : 1,
                            paddingHorizontal: 2
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
                                            let val = '';
                                            if (key === 'item' || key === 'name') {
                                                val = item.name || '';
                                            } else if (key === 'qty') {
                                                val = `${parseFloat(item.qty || 0).toFixed(2)} ${(item.unit_type || '').toUpperCase()}`;
                                            } else if (key === 'unit_type' || key === 'unit') {
                                                val = (item.unit_type || '').toUpperCase();
                                            } else if (key === 'family' || key === 'family_name') {
                                                val = familyName;
                                            } else if (key === 'unit_price' || key === 'price') {
                                                val = `INR ${parseFloat(item.unit_price || 0).toFixed(2)}`;
                                            } else if (key === 'total') {
                                                val = `INR ${parseFloat(item.total || 0).toFixed(2)}`;
                                            } else {
                                                val = item.custom_fields?.[key] || item[key] || '';
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
                                        <>
                                            <View style={styles.summaryRow}>
                                                <View style={{ flex: 1 }}></View>
                                                <Text style={{ width: '30%', textAlign: 'right', fontWeight: 'bold', paddingRight: 4 }}>SUB TOTAL</Text>
                                                <Text style={{ width: '20%', textAlign: 'right', paddingRight: 2 }}>INR {subtotal.toFixed(2)}</Text>
                                            </View>
                                            {margin > 0 && (
                                                <>
                                                    <View style={styles.summaryRow}>
                                                        <View style={{ flex: 1 }}></View>
                                                        <Text style={{ width: '30%', textAlign: 'right', fontWeight: 'bold', paddingRight: 4 }}>Margin Applied ({(margin * 100).toFixed(0)}%)</Text>
                                                        <Text style={{ width: '20%', textAlign: 'right', paddingRight: 2 }}>INR {(subtotal * margin).toFixed(2)}</Text>
                                                    </View>
                                                    <View style={styles.summaryRow}>
                                                        <View style={{ flex: 1 }}></View>
                                                        <Text style={{ width: '30%', textAlign: 'right', fontWeight: 'bold', paddingRight: 4 }}>SECTION TOTAL</Text>
                                                        <Text style={{ width: '20%', textAlign: 'right', paddingRight: 2 }}>INR {(subtotal * (1 + margin)).toFixed(2)}</Text>
                                                    </View>
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                            </View>
                        </View>
                    );
                })}

                <Text style={styles.grandTotal}>
                    GRAND TOTAL: INR {totalAmount}
                </Text>
            </Page>
        </Document>
    );
};
