import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });

// AI-powered notification generator
export const generateSmartNotifications = async (inventoryData: any[], transactionData: any[], alertData: any[]) => {
  try {
    const prompt = `
    Based on the following medical inventory data, generate intelligent notifications and insights:

    Inventory Items: ${JSON.stringify(inventoryData.slice(0, 10))}
    Recent Transactions: ${JSON.stringify(transactionData.slice(0, 10))}
    Current Alerts: ${JSON.stringify(alertData)}

    Generate 3-5 actionable notifications in JSON format with the following structure:
    {
      "notifications": [
        {
          "id": "unique_id",
          "type": "warning|info|success|error",
          "title": "Brief title",
          "message": "Detailed message",
          "priority": "high|medium|low",
          "actionable": true/false,
          "suggestedAction": "What action to take",
          "category": "stock|maintenance|usage|efficiency"
        }
      ]
    }

    Focus on:
    1. Stock level predictions and reorder suggestions
    2. Usage pattern anomalies
    3. Maintenance scheduling optimization
    4. Cost-saving opportunities
    5. Operational efficiency improvements

    Return only valid JSON.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return {
        notifications: [
          {
            id: 'ai_error',
            type: 'info',
            title: 'AI Analysis Unavailable',
            message: 'Smart notifications are temporarily unavailable. Please check your API configuration.',
            priority: 'low',
            actionable: false,
            category: 'system'
          }
        ]
      };
    }
  } catch (error) {
    console.error('Gemini AI error:', error);
    return {
      notifications: [
        {
          id: 'ai_error',
          type: 'info',
          title: 'AI Analysis Unavailable',
          message: 'Smart notifications require a valid Gemini API key. Please configure it in your environment variables.',
          priority: 'low',
          actionable: false,
          category: 'system'
        }
      ]
    };
  }
};

// AI-powered email parsing for inventory updates
export const parseInventoryEmail = async (emailContent: string) => {
  try {
    const prompt = `
    Parse the following email content and extract inventory information. Convert it to the medical inventory database format:

    Email Content: ${emailContent}

    Expected database fields:
    - name (required)
    - description
    - category_id (map to: Medical Equipment, Surgical Supplies, Medications, Laboratory Equipment, Patient Care, Emergency Supplies, Disposables, Protective Equipment)
    - item_type (equipment|supplies|medications|consumables)
    - quantity (number)
    - min_quantity (number)
    - max_quantity (number)
    - unit_price (number)
    - location
    - serial_number
    - manufacturer
    - model
    - purchase_date (YYYY-MM-DD)
    - warranty_expiry (YYYY-MM-DD)
    - expiry_date (YYYY-MM-DD)
    - notes

    Return JSON format:
    {
      "items": [
        {
          "name": "Item name",
          "description": "Description",
          "category": "Category name",
          "item_type": "equipment|supplies|medications|consumables",
          "quantity": 10,
          "min_quantity": 5,
          "unit_price": 99.99,
          "location": "Storage location",
          "manufacturer": "Manufacturer name",
          "model": "Model number",
          "serial_number": "Serial number",
          "notes": "Additional notes"
        }
      ],
      "confidence": 0.95,
      "missing_fields": ["field1", "field2"],
      "suggestions": "Suggestions for missing data"
    }

    If the email doesn't contain inventory information, return:
    {
      "items": [],
      "confidence": 0,
      "error": "No inventory data found in email"
    }

    Return only valid JSON.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Email parsing error:', error);
    return {
      items: [],
      confidence: 0,
      error: 'Failed to parse email content'
    };
  }
};

// AI-powered Excel/CSV data mapping
export const mapExcelToInventory = async (excelData: any[], sampleRow: any) => {
  try {
    const prompt = `
    Map the following Excel/CSV data to medical inventory database format:

    Sample Row: ${JSON.stringify(sampleRow)}
    Column Headers: ${Object.keys(sampleRow).join(', ')}

    Target database fields:
    - name (required)
    - description
    - category (Medical Equipment, Surgical Supplies, Medications, Laboratory Equipment, Patient Care, Emergency Supplies, Disposables, Protective Equipment)
    - item_type (equipment|supplies|medications|consumables)
    - quantity (number)
    - min_quantity (number)
    - max_quantity (number)
    - unit_price (number)
    - location
    - serial_number
    - manufacturer
    - model
    - purchase_date (YYYY-MM-DD format)
    - warranty_expiry (YYYY-MM-DD format)
    - expiry_date (YYYY-MM-DD format)
    - notes

    Return a mapping configuration in JSON format:
    {
      "mapping": {
        "name": "excel_column_name",
        "description": "excel_column_name",
        "category": "excel_column_name",
        "quantity": "excel_column_name",
        "unit_price": "excel_column_name"
      },
      "transformations": {
        "category": {
          "mapping": {
            "medical_equipment": "Medical Equipment",
            "surgical": "Surgical Supplies"
          }
        },
        "item_type": {
          "rules": [
            {"if_category_contains": "equipment", "then": "equipment"},
            {"if_category_contains": "medication", "then": "medications"}
          ]
        }
      },
      "validation": {
        "required_fields": ["name", "quantity"],
        "data_types": {
          "quantity": "number",
          "unit_price": "number"
        }
      },
      "confidence": 0.95,
      "suggestions": "Suggestions for improving data quality"
    }

    Return only valid JSON.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Excel mapping error:', error);
    return {
      mapping: {},
      confidence: 0,
      error: 'Failed to map Excel data'
    };
  }
};

// AI-powered inventory optimization suggestions
export const generateInventoryOptimizations = async (inventoryData: any[], transactionData: any[]) => {
  try {
    const prompt = `
    Analyze the following medical inventory and transaction data to provide optimization suggestions:

    Inventory: ${JSON.stringify(inventoryData.slice(0, 20))}
    Transactions: ${JSON.stringify(transactionData.slice(0, 20))}

    Provide optimization suggestions in JSON format:
    {
      "optimizations": [
        {
          "type": "reorder_optimization|location_optimization|usage_prediction|cost_reduction",
          "item_id": "item_id",
          "item_name": "item_name",
          "current_situation": "Description of current situation",
          "recommendation": "Specific recommendation",
          "expected_benefit": "Expected benefit",
          "priority": "high|medium|low",
          "estimated_savings": 1000.00
        }
      ],
      "summary": {
        "total_potential_savings": 5000.00,
        "high_priority_actions": 3,
        "implementation_timeline": "2-4 weeks"
      }
    }

    Focus on:
    1. Optimal reorder points and quantities
    2. Storage location optimization
    3. Usage pattern predictions
    4. Cost reduction opportunities
    5. Waste reduction strategies

    Return only valid JSON.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Optimization analysis error:', error);
    return {
      optimizations: [],
      summary: {
        total_potential_savings: 0,
        high_priority_actions: 0,
        implementation_timeline: 'Unknown'
      }
    };
  }
};