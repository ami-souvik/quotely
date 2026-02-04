import { db, s3, DYNAMO_TABLE_NAME, AWS_S3_BUCKET_NAME } from '@/lib/aws';
import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { Quote, Customer, Product, ProductFamily, MasterItem, PDFTemplate } from '@/lib/types'; // Assuming types exist or I'll define roughly

export class QuotelyService {
  private tableName = DYNAMO_TABLE_NAME;
  private bucketName = AWS_S3_BUCKET_NAME;

  // --- Helpers ---
  private getCurrentTimestamp() {
    return new Date().toISOString();
  }

  generateCustomerIdentifier(name: string, phone: string): string {
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join('') || '';
    
    const firstLetter = firstName.charAt(0).toUpperCase();
    const last4Letters = lastName.substring(0, 4).toLowerCase();
    const last4Phone = (phone || '').replace(/\D/g, '').slice(-4);
    
    return `${firstLetter}${last4Letters}${last4Phone}`;
  }

  generateQuotationIdentifier(name: string): string {
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join('') || '';
    
    const firstLetter = firstName.charAt(0).toUpperCase();
    const last4Letters = lastName.substring(0, 4).toLowerCase();
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    
    return `${firstLetter}${last4Letters}#${timestamp}`;
  }

  // --- Organization ---
  async getOrganizationIdByName(orgName: string): Promise<string | null> {
    const slug = orgName.toLowerCase().replace(/\s+/g, '-');
    try {
      const response = await db.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `ORG_NAME#${slug}`,
          SK: 'INFO',
        },
      }));
      return response.Item?.org_id || null;
    } catch (e) {
      console.error('Error fetching organization by name:', e);
      return null;
    }
  }

  async createOrganization(orgName: string): Promise<string | null> {
    const orgId = uuidv4();
    const slug = orgName.toLowerCase().replace(/\s+/g, '-');
    const timestamp = this.getCurrentTimestamp();

    const lookupItem = {
      PK: `ORG_NAME#${slug}`,
      SK: 'INFO',
      org_id: orgId,
      name: orgName,
    };

    const orgItem = {
      PK: `ORG#${orgId}`,
      SK: 'METADATA',
      name: orgName,
      slug: slug,
      created_at: timestamp,
    };

    try {
      await db.send(new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.tableName,
              Item: lookupItem,
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Put: {
              TableName: this.tableName,
              Item: orgItem,
            },
          },
        ],
      }));
      return orgId;
    } catch (e: any) {
      console.error('Error creating organization:', e);
      if (e.name === 'TransactionCanceledException') {
        return this.getOrganizationIdByName(orgName);
      }
      return null;
    }
  }

  async getOrganization(orgId: string): Promise<any | null> {
    try {
      const response = await db.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `ORG#${orgId}`,
          SK: 'METADATA',
        },
      }));
      return response.Item || null;
    } catch (e) {
      console.error('Error fetching organization:', e);
      return null;
    }
  }

  async updateOrganization(orgId: string, data: any): Promise<any | null> {
    try {
      const updateExpParts: string[] = [];
      const expAttrNames: any = {};
      const expAttrValues: any = {};

      const addUpdate = (key: string, val: any) => {
        const attrKey = `#${key}`;
        const token = `:${key}`;
        expAttrNames[attrKey] = key;
        updateExpParts.push(`${attrKey} = ${token}`);
        expAttrValues[token] = val;
      };

      if (data.name !== undefined) addUpdate('name', data.name);
      if (data.logo_url !== undefined) addUpdate('logo_url', data.logo_url);
      if (data.contact_number !== undefined) addUpdate('contact_number', data.contact_number);
      if (data.email !== undefined) addUpdate('email', data.email);
      if (data.address !== undefined) addUpdate('address', data.address);

      if (updateExpParts.length === 0) return null;

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `ORG#${orgId}`,
          SK: 'METADATA',
        },
        UpdateExpression: `SET ${updateExpParts.join(', ')}`,
        ExpressionAttributeNames: expAttrNames,
        ExpressionAttributeValues: expAttrValues,
        ReturnValues: 'ALL_NEW',
      });

      const response = await db.send(command);
      return response.Attributes;
    } catch (e) {
      console.error('Error updating organization:', e);
      return null;
    }
  }

  // --- Quotations ---
  async createQuotation(orgId: string, userId: string, data: Partial<Quote>): Promise<string | null> {
    const quoteId = uuidv4();
    const timestamp = this.getCurrentTimestamp();
    const item = {
      PK: `ORG#${orgId}`,
      SK: `QUOTE#${quoteId}`,
      type: 'QUOTATION',
      created_by: userId,
      status: 'DRAFT',
      snapshot: data,
      customer_name: data.customer_name || '',
      display_id: data.display_id || this.generateQuotationIdentifier(data.customer_name || ''),
      customer_id: data.customer_id || null,
      customer_email: data.customer_email || null,
      customer_phone: data.customer_phone || null,
      total_amount: data.total_amount || 0.0,
      created_at: timestamp,
      s3_pdf_link: null,
      GSI1PK: `USER#${userId}`,
      GSI1SK: `QUOTE#${quoteId}`,
      ...data, // Include any other fields, but explicit ones above take precedence if not in data
    };

    try {
      await db.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
      }));
      return quoteId;
    } catch (e) {
      console.error('Error creating quotation:', e);
      return null;
    }
  }

  async getQuotation(orgId: string, quoteId: string): Promise<any | null> {
    try {
      const response = await db.send(new GetCommand({
        TableName: this.tableName,
        Key: {
            PK: `ORG#${orgId}`,
            SK: `QUOTE#${quoteId}`
        }
      }));
      return response.Item || null;
    } catch (e) {
      console.error("Error getting quotation:", e);
      return null;
    }
  }

  async updateQuotation(orgId: string, quoteId: string, data: any): Promise<any> {
      try {
        const updateExpParts: string[] = [];
        const expAttrNames: any = { '#s': 'status' };
        const expAttrValues: any = {};

        // Helper to add update fields
        const addUpdate = (key: string, val: any, dbKey?: string) => {
            const attrKey = dbKey || key;
            const token = `:${key}`;
            updateExpParts.push(`${attrKey} = ${token}`);
            expAttrValues[token] = val;
        };

        if (data.customer_name !== undefined) addUpdate('customer_name', data.customer_name);
        if (data.customer_id !== undefined) addUpdate('customer_id', data.customer_id);
        if (data.customer_email !== undefined) addUpdate('customer_email', data.customer_email);
        if (data.customer_phone !== undefined) addUpdate('customer_phone', data.customer_phone);
        if (data.total_amount !== undefined) addUpdate('total_amount', data.total_amount);
        if (data.snapshot !== undefined) addUpdate('snapshot', data.snapshot || data); // snapshot is essentially the whole data usually

        // Default reset to draft on edit?
        updateExpParts.push('#s = :status');
        expAttrValues[':status'] = 'DRAFT';

        const command = new UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `ORG#${orgId}`,
                SK: `QUOTE#${quoteId}`
            },
            UpdateExpression: `SET ${updateExpParts.join(', ')}`,
            ExpressionAttributeNames: expAttrNames,
            ExpressionAttributeValues: expAttrValues,
            ReturnValues: 'ALL_NEW'
        });

        const response = await db.send(command);
        return response.Attributes;
      } catch (e) {
          console.error("Error updating quotation:", e);
          return null;
      }
  }

  async deleteQuotation(orgId: string, quoteId: string): Promise<boolean> {
      try {
          await db.send(new DeleteCommand({
              TableName: this.tableName,
              Key: {
                  PK: `ORG#${orgId}`,
                  SK: `QUOTE#${quoteId}`
              }
          }));
          return true;
      } catch (e) {
          console.error("Error deleting quotation:", e);
          return false;
      }
  }

  async updateQuotationS3Link(orgId: string, quoteId: string, s3Link: string): Promise<any> {
     try {
         const response = await db.send(new UpdateCommand({
             TableName: this.tableName,
             Key: {
                 PK: `ORG#${orgId}`,
                 SK: `QUOTE#${quoteId}`
             },
             UpdateExpression: "SET s3_pdf_link = :link, #s = :status",
             ExpressionAttributeNames: { "#s": "status" },
             ExpressionAttributeValues: {
                 ":link": s3Link,
                 ":status": "FINALIZED"
             },
             ReturnValues: "UPDATED_NEW"
         }));
         return response.Attributes;
     } catch (e) {
         console.error("Error updating quotation S3 link:", e);
         return null;
     }
  }

  // --- Users Quotes ---
  async getUserQuotations(orgId: string, userId: string): Promise<any[]> {
      try {
          const response = await db.send(new QueryCommand({
              TableName: this.tableName,
              IndexName: 'User-Date-Index',
              KeyConditionExpression: 'GSI1PK = :gsi_pk',
              FilterExpression: 'PK = :org_pk',
              ExpressionAttributeValues: {
                  ':gsi_pk': `USER#${userId}`,
                  ':org_pk': `ORG#${orgId}`
              }
          }));
          return response.Items || [];
      } catch (e) {
          console.error("Error fetching user quotations:", e);
          return [];
      }
  }

  async getOrganizationQuotations(orgId: string): Promise<any[]> {
      try {
          const response = await db.send(new QueryCommand({
              TableName: this.tableName,
              KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
              ExpressionAttributeValues: {
                  ':pk': `ORG#${orgId}`,
                  ':sk': 'QUOTE#'
              }
          }));
          return response.Items || [];
      } catch (e) {
          console.error("Error fetching org quotations:", e);
          return [];
      }
  }

  // --- Customer Methods ---
  async createCustomer(orgId: string, data: Partial<Customer>): Promise<Customer | null> {
      const customerId = uuidv4();
      const item = {
          PK: `ORG#${orgId}`,
          SK: `CUSTOMER#${customerId}`,
          type: 'CUSTOMER',
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          customer_identifier: this.generateCustomerIdentifier(data.name || '', data.phone || ''),
          created_at: this.getCurrentTimestamp(),
          id: customerId // Helper for frontend
      };
      // Note: Backend Python stored ID only in SK. We might want 'id' attribute for easier frontend usage without parsing SK?
      // Python 'CustomerSerializer' parsed SK to get ID. For Typescript, let's store 'id' explicitly or parse SK on retrieval.
      // I'll stick to Python schema to be safe, but adding 'id' helps data purity.
      // Wait, Python's `CustomerSerializer` has `id = serializers.SerializerMethodField()`.
      // I will rely on reading SK. But for `create`, I return the item.

      try {
          await db.send(new PutCommand({ TableName: this.tableName, Item: item }));
          return { ...data, id: customerId, created_at: item.created_at } as Customer;
      } catch (e) {
          console.error("Error creating customer:", e);
          return null;
      }
  }

  async getCustomers(orgId: string): Promise<any[]> {
      try {
          const response = await db.send(new QueryCommand({
              TableName: this.tableName,
              KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
              ExpressionAttributeValues: {
                  ":pk": `ORG#${orgId}`,
                  ":sk": "CUSTOMER#"
              }
          }));
          return (response.Items || []).map(item => ({
              ...item,
              id: item.SK.split('#')[1]
          }));
      } catch (e) {
          console.error("Error fetching customers:", e);
          return [];
      }
  }

  async getCustomer(orgId: string, customerId: string): Promise<any | null> {
      const cleanId = customerId.trim();
      try {
          const response = await db.send(new GetCommand({
              TableName: this.tableName,
              Key: {
                 PK: `ORG#${orgId}`,
                 SK: `CUSTOMER#${cleanId}`
              }
          }));
          if (response.Item) {
              return { ...response.Item, id: cleanId };
          }
          return null;
      } catch (e) {
          console.error("Error getting customer:", e);
          return null;
      }
  }

  async updateCustomer(orgId: string, customerId: string, data: Partial<Customer>): Promise<any> {
      const cleanId = customerId.trim();
      try {
          const response = await db.send(new UpdateCommand({
              TableName: this.tableName,
              Key: {
                  PK: `ORG#${orgId}`,
                  SK: `CUSTOMER#${cleanId}`
              },
              UpdateExpression: "SET #n = :name, email = :email, phone = :phone, address = :address",
              ExpressionAttributeNames: { "#n": "name" },
              ExpressionAttributeValues: {
                  ":name": data.name,
                  ":email": data.email,
                  ":phone": data.phone,
                  ":address": data.address
              },
              ReturnValues: "ALL_NEW"
          }));
           if (response.Attributes) {
              return { ...response.Attributes, id: cleanId };
          }
          return null;
      } catch (e) {
          console.error("Error updating customer:", e);
          return null;
      }
  }

  async deleteCustomer(orgId: string, customerId: string): Promise<boolean> {
      const cleanId = customerId.trim();
      try {
          await db.send(new DeleteCommand({
              TableName: this.tableName,
              Key: {
                  PK: `ORG#${orgId}`,
                  SK: `CUSTOMER#${cleanId}`
              }
          }));
          return true;
      } catch (e) {
           console.error("Error deleting customer:", e);
           return false;
      }
  }

  // --- Product Families ---
  async getProductFamilies(orgId: string): Promise<any[]> {
      try {
          const response = await db.send(new QueryCommand({
              TableName: this.tableName,
              KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
              ExpressionAttributeValues: {
                  ":pk": `ORG#${orgId}`,
                  ":sk": "FAMILY#"
              }
          }));
          return (response.Items || []).map(item => ({ ...item, id: item.SK.split('#')[1] }));
      } catch (e) {
           console.error("Error getting families:", e);
           return [];
      }
  }

  async createProductFamily(orgId: string, data: Partial<ProductFamily>): Promise<any> {
      const familyId = uuidv4();
      const item = {
          PK: `ORG#${orgId}`,
          SK: `FAMILY#${familyId}`,
          type: 'PRODUCT_FAMILY',
          name: data.name,
          default_items: data.default_items || [],
          base_margin: data.base_margin || 0
      };
      try {
          await db.send(new PutCommand({ TableName: this.tableName, Item: item }));
          return { ...item, id: familyId };
      } catch (e) {
          console.error("Error creating family:", e);
          return null;
      }
  }

  async deleteProductFamily(orgId: string, familyId: string): Promise<boolean> {
      try {
           await db.send(new DeleteCommand({
              TableName: this.tableName,
              Key: {
                  PK: `ORG#${orgId}`,
                  SK: `FAMILY#${familyId}`
              }
           }));
           return true;
      } catch (e) {
          console.error("Error deleting family:", e);
          return false;
      }
  }

  // --- Products ---
  async getProducts(orgId: string): Promise<any[]> {
        try {
            const response = await db.send(new QueryCommand({
                TableName: this.tableName,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues: {
                    ":pk": `ORG#${orgId}`,
                    ":sk": "PRODUCT#"
                }
            }));
            return (response.Items || []).map(item => ({ ...item, id: item.SK.split('#')[1] }));
        } catch (e) {
            console.error("Error getting products:", e);
            return [];
        }
  }

  async createProduct(orgId: string, data: any): Promise<any> {
      const productId = uuidv4();
      const item: any = {
          PK: `ORG#${orgId}`,
          SK: `PRODUCT#${productId}`,
          type: 'PRODUCT',
          name: data.name,
          price: data.price, // assuming number
          family_id: data.family_id || null,
          custom_fields: data.custom_fields || {}
      };
      if (item.family_id) {
          item.GSI2PK = `FAMILY#${item.family_id}`;
          item.GSI2SK = `PRODUCT#${productId}`;
      }

      try {
          await db.send(new PutCommand({ TableName: this.tableName, Item: item }));
          return { ...item, id: productId };
      } catch (e) {
          console.error("Error creating product:", e);
          return null;
      }
  }

  async getProduct(orgId: string, productId: string): Promise<any | null> {
    try {
        const response = await db.send(new GetCommand({
            TableName: this.tableName,
            Key: {
                PK: `ORG#${orgId}`,
                SK: `PRODUCT#${productId}`
            }
        }));
        return response.Item ? { ...response.Item, id: productId } : null;
    } catch (e) {
        console.error("Error getting product:", e);
        return null;
    }
  }

  async updateProduct(orgId: string, productId: string, data: any): Promise<any> {
       try {
            // Need to handle GSI updates which requires deleting old item or just PUTting logic if we want to be safe, but UpdateItem works for GSI attributes too.
            // Python code sets GSI2PK if family_id is updated.
            const expAttrNames: any = { '#n': 'name' };
            const expAttrValues: any = {
                ':name': data.name,
                ':price': data.price,
                // ':family_id': handled conditionally
                ':custom_fields': data.custom_fields || {}
            };
            let updateExpr = "SET #n = :name, price = :price, custom_fields = :custom_fields";
            
            if (data.family_id !== undefined) {
                 updateExpr += ", family_id = :family_id";
                 expAttrValues[':family_id'] = data.family_id || null;
            }
            // Handling GSI update in separate update or same? Same.
            if ( data.family_id ) {
                updateExpr += ", GSI2PK = :gsi2pk, GSI2SK = :gsi2sk";
                expAttrValues[':gsi2pk'] = `FAMILY#${data.family_id}`;
                expAttrValues[':gsi2sk'] = `PRODUCT#${productId}`;
            } else if (data.family_id === null) {
                // If explicitly set to null, remove GSIs?
                // Python did: "REMOVE description" (legacy?) and handled GSI.
                // Assuming family_id null means remove from family index.
                // But we can't combine SET and REMOVE easily in one go unless carefully constructed or use two expressions?
                // DynamoDB UpdateExpression supports SET a=b, c=d REMOVE e
                // So we can do it.
                // But constructing dynamic expression is tedious. I will assume simpler logic for now matching Python somewhat.
                // Python does separate update for GSI if needed. I will do same or merge.
                // Merging:
                if (data.family_id === null) {
                    // We need to REMOVE GSI keys.
                    // Let's just append REMOVE to the string.
                    // But we already have 'family_id = :family_id' (which sets it to null) in SET.
                     updateExpr += " REMOVE GSI2PK, GSI2SK";
                }
            }

            const response = await db.send(new UpdateCommand({
                TableName: this.tableName,
                Key: { PK: `ORG#${orgId}`, SK: `PRODUCT#${productId}` },
                UpdateExpression: updateExpr,
                ExpressionAttributeNames: expAttrNames,
                ExpressionAttributeValues: expAttrValues,
                ReturnValues: "ALL_NEW"
            }));
            return response.Attributes ? { ...response.Attributes, id: productId } : null;

       } catch (e) {
           console.error("Error updating product:", e);
           return null;
       }
  }

  async deleteProduct(orgId: string, productId: string): Promise<boolean> {
      try {
          await db.send(new DeleteCommand({
              TableName: this.tableName,
              Key: { PK: `ORG#${orgId}`, SK: `PRODUCT#${productId}` }
          }));
          return true;
      } catch (e) {
          console.error("Error deleting product:", e);
          return false;
      }
  }

  async getProductsByFamily(orgId: string, familyId: string): Promise<any[]> {
      try {
          const response = await db.send(new QueryCommand({
              TableName: this.tableName,
              IndexName: 'Family-Product-Index',
              KeyConditionExpression: 'GSI2PK = :gsi_pk AND begins_with(GSI2SK, :gsi_sk)',
              FilterExpression: 'PK = :pk',
              ExpressionAttributeValues: {
                  ':gsi_pk': `FAMILY#${familyId}`,
                  ':gsi_sk': 'PRODUCT#',
                  ':pk': `ORG#${orgId}`
              }
          }));
          return (response.Items || []).map(item => ({ ...item, id: item.SK.split('#')[1] }));
      } catch (e) {
          console.error("Error fetching products by family:", e);
          return [];
      }
  }

  // --- Settings ---
  async getTemplateSettings(orgId: string): Promise<any[]> {
      try {
          const response = await db.send(new GetCommand({
              TableName: this.tableName,
              Key: { PK: `ORG#${orgId}`, SK: 'SETTINGS#TEMPLATE' }
          }));
          return response.Item?.columns || [];
      } catch (e) {
           console.error("Error template settings:", e);
           return [];
      }
  }

  async updateTemplateSettings(orgId: string, columns: any[]): Promise<any[]> {
       try {
           await db.send(new PutCommand({
               TableName: this.tableName,
               Item: {
                   PK: `ORG#${orgId}`,
                   SK: 'SETTINGS#TEMPLATE',
                   columns: columns
               }
           }));
           return columns;
       } catch (e) {
           console.error("Error update template settings:", e);
           return [];
       }
  }

  // --- Product Settings ---
  async getProductSettings(orgId: string): Promise<any[]> {
      try {
          const response = await db.send(new GetCommand({
              TableName: this.tableName,
              Key: { PK: `ORG#${orgId}`, SK: 'SETTINGS#PRODUCT' }
          }));
          return response.Item?.columns || [];
      } catch (e) {
           console.error("Error product settings:", e);
           return [];
      }
  }

  async updateProductSettings(orgId: string, columns: any[]): Promise<any[]> {
       try {
           await db.send(new PutCommand({
               TableName: this.tableName,
               Item: {
                   PK: `ORG#${orgId}`,
                   SK: 'SETTINGS#PRODUCT',
                   columns: columns
               }
           }));
           return columns;
       } catch (e) {
           console.error("Error update product settings:", e);
           return [];
       }
  }

   // --- PDF Templates (Multi) ---
   async createPDFTemplate(orgId: string, data: any): Promise<any> {
    const templateId = uuidv4();
    const item = {
        PK: `ORG#${orgId}`,
        SK: `TEMPLATE#${templateId}`,
        type: 'PDF_TEMPLATE',
        name: data.name,
        columns: data.columns || [],
        created_at: this.getCurrentTimestamp()
    };
    try {
        await db.send(new PutCommand({ TableName: this.tableName, Item: item }));
        return { ...item, id: templateId };
    } catch (e) {
        console.error("Error create PDF template:", e);
        return null;
    }
   }

   async getPDFTemplates(orgId: string): Promise<any[]> {
       try {
           const response = await db.send(new QueryCommand({
               TableName: this.tableName,
               KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
               ExpressionAttributeValues: {
                   ":pk": `ORG#${orgId}`,
                   ":sk": "TEMPLATE#"
               }
           }));
           return (response.Items || []).map(item => ({ ...item, id: item.SK.split('#')[1] }));
       } catch (e) {
           console.error("Error fetching PDF templates:", e);
           return [];
       }
   }

   async getPDFTemplate(orgId: string, templateId: string): Promise<any> {
       try {
           const response = await db.send(new GetCommand({
               TableName: this.tableName,
               Key: { PK: `ORG#${orgId}`, SK: `TEMPLATE#${templateId}` }
           }));
           if (response.Item) return { ...response.Item, id: templateId };
           return null;
       } catch (e) {
           console.error("Error fetching PDF template:", e);
           return null;
       }
   }

   async updatePDFTemplate(orgId: string, templateId: string, data: Partial<PDFTemplate>): Promise<any> {
       const updateParts: string[] = [];
       const attrNames: any = {};
       const attrValues: any = {};
       
       if (data.name !== undefined) {
           updateParts.push("#n = :name");
           attrNames['#n'] = 'name';
           attrValues[':name'] = data.name;
       }
       if (data.columns !== undefined) {
            updateParts.push("#c = :columns");
            attrNames['#c'] = 'columns';
            attrValues[':columns'] = data.columns;
       }

       if (updateParts.length > 0) {
           updateParts.push("updated_at = :ua");
           attrValues[':ua'] = this.getCurrentTimestamp();
       } else {
           return null;
       }

       try {
           const response = await db.send(new UpdateCommand({
               TableName: this.tableName,
               Key: { PK: `ORG#${orgId}`, SK: `TEMPLATE#${templateId}` },
               UpdateExpression: `SET ${updateParts.join(', ')}`,
               ExpressionAttributeNames: Object.keys(attrNames).length ? attrNames : undefined,
               ExpressionAttributeValues: attrValues,
               ReturnValues: "ALL_NEW"
           }));
           return response.Attributes ? { ...response.Attributes, id: templateId } : null;
       } catch (e) {
           console.error("Error updating PDF template:", e);
           return null;
       }
   }

   async deletePDFTemplate(orgId: string, templateId: string): Promise<boolean> {
      try {
          await db.send(new DeleteCommand({
              TableName: this.tableName,
              Key: { PK: `ORG#${orgId}`, SK: `TEMPLATE#${templateId}` }
          }));
          return true;
      } catch (e) {
          console.error("Error deleting PDF template:", e);
          return false;
      }
   }

  // --- Storage ---
  async uploadPDFToS3(pdfBuffer: Buffer, orgId: string, quoteId: string): Promise<string | null> {
      const s3Key = `quotes/${orgId}/${quoteId}.pdf`;
      try {
          await s3.send(new PutObjectCommand({
              Bucket: this.bucketName,
              Key: s3Key,
              Body: pdfBuffer,
              ContentType: 'application/pdf',
          }));
          return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
      } catch (e) {
          console.error("Error upload PDF S3:", e);
          return null;
      }
  }

  async getPresignedS3Url(orgId: string, quoteId: string, expiresIn = 3600, download = false): Promise<string | null> {
      const s3Key = `quotes/${orgId}/${quoteId}.pdf`;
      try {
          const command = new GetObjectCommand({
              Bucket: this.bucketName,
              Key: s3Key,
              ResponseContentDisposition: download ? `attachment; filename="quote-${quoteId}.pdf"` : 'inline'
          });
          const url = await getSignedUrl(s3, command, { expiresIn });
          return url;
      } catch (e) {
          console.error("Error presigned URL:", e);
          return null;
      }
  }
}

export const services = new QuotelyService();
