# Barcode Scanner Feature - Complete Guide

## 📱 What is Barcode Scanning?

Barcode scanning allows users to quickly log meals by scanning the barcode on food packaging (like a box of cereal, protein bar, or canned food). Instead of manually entering nutrition information, the app automatically retrieves product data from a database.

## 🎯 How It Works

### **User Flow:**
1. User taps "Scan Barcode" button on Meals page
2. Camera opens (on mobile) or file upload (on desktop)
3. User scans/selects barcode image
4. App reads barcode number (e.g., "0123456789012")
5. App searches nutrition database using barcode
6. Product info appears (name, calories, protein, etc.)
7. User confirms and logs meal

### **Example:**
```
User scans: 🏷️ "Clif Bar - Chocolate Chip"
↓
Barcode: 722252301049
↓
API Returns:
- Name: "Clif Bar - Chocolate Chip"
- Calories: 250
- Protein: 10g
- Carbs: 45g
- Fats: 5g
- Serving size: 1 bar (68g)
↓
User confirms → Meal logged! ✅
```

---

## 🔧 Technical Implementation

### **1. Barcode Scanning Libraries**

#### **Option A: HTML5 Barcode Scanner (Mobile Web)**
```javascript
// Using html5-qrcode library (also supports barcodes)
import { Html5QrcodeScanner } from 'html5-qrcode'

const scanner = new Html5QrcodeScanner(
  "barcode-reader",
  { 
    fps: 10, 
    qrbox: { width: 250, height: 250 },
    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_BARCODE]
  }
)

scanner.render((barcode) => {
  // barcode = "722252301049"
  handleBarcodeScanned(barcode)
})
```

#### **Option B: ZXing (JavaScript)**
```javascript
import { BrowserMultiFormatReader } from '@zxing/library'

const codeReader = new BrowserMultiFormatReader()
codeReader.decodeFromVideoDevice(null, 'video', (result) => {
  const barcode = result.getText()
  handleBarcodeScanned(barcode)
})
```

#### **Option C: QuaggaJS**
```javascript
import Quagga from 'quagga'

Quagga.init({
  inputStream: {
    name: "Live",
    type: "LiveStream",
    target: document.querySelector('#scanner')
  },
  decoder: {
    readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
  }
}, (err) => {
  Quagga.onDetected((result) => {
    const barcode = result.codeResult.code
    handleBarcodeScanned(barcode)
  })
})
```

---

## 🗄️ Nutrition Database APIs

### **1. OpenFoodFacts (Free, Open Source)**
- **API**: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
- **Coverage**: 2+ million products worldwide
- **Free**: Yes
- **Rate Limit**: Generous

**Example Response:**
```json
{
  "status": 1,
  "product": {
    "product_name": "Clif Bar - Chocolate Chip",
    "nutriments": {
      "energy-kcal_100g": 368,
      "proteins_100g": 14.7,
      "carbohydrates_100g": 66.2,
      "fat_100g": 7.4
    },
    "serving_size": "68g",
    "image_url": "https://..."
  }
}
```

### **2. USDA FoodData Central (Free)**
- **API**: `https://api.nal.usda.gov/fdc/v1/foods/search`
- **Coverage**: US foods, very accurate
- **Free**: Yes (API key required)
- **Best for**: Raw ingredients, generic foods

### **3. Edamam Food Database (Paid)**
- **API**: `https://api.edamam.com/api/food-database/v2/parser`
- **Coverage**: Comprehensive
- **Free**: Limited (1000 calls/month)
- **Paid**: $0.01 per call

### **4. Nutritionix (Paid)**
- **API**: `https://api.nutritionix.com/v1_1/item`
- **Coverage**: Very comprehensive
- **Free**: Limited
- **Paid**: $0.01-0.02 per call

---

## 💻 Implementation Example

### **Step 1: Install Dependencies**

```bash
npm install html5-qrcode @zxing/library
# or
npm install quagga
```

### **Step 2: Create Barcode Scanner Component**

```typescript
// src/components/BarcodeScanner.tsx
import { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { X, Camera, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onBarcodeScanned: (barcode: string) => void
}

export function BarcodeScanner({ open, onClose, onBarcodeScanned }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    if (open && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "barcode-scanner",
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.0,
          supportedScanTypes: [
            Html5QrcodeScanType.SCAN_TYPE_BARCODE,
            Html5QrcodeScanType.SCAN_TYPE_QR_CODE
          ]
        },
        false // verbose
      )

      scanner.render(
        (decodedText) => {
          // Barcode scanned successfully
          onBarcodeScanned(decodedText)
          scanner.clear()
          onClose()
        },
        (errorMessage) => {
          // Scanning error (normal during scanning)
          // Only show if it's a real error
        }
      )

      scannerRef.current = scanner
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
        scannerRef.current = null
      }
    }
  }, [open, onClose, onBarcodeScanned])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode("barcode-file-reader")
      
      const result = await html5QrCode.scanFile(file, false)
      onBarcodeScanned(result)
      onClose()
    } catch (err) {
      setError('Could not read barcode from image')
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Camera Scanner */}
          <div id="barcode-scanner" className="w-full"></div>
          
          {/* File Upload Option */}
          <div className="border-t border-border pt-4">
            <label className="btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload Barcode Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <div className="text-error text-sm font-mono">{error}</div>
          )}

          <button onClick={onClose} className="btn-secondary w-full">
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### **Step 3: Create Nutrition Lookup Service**

```typescript
// src/services/barcodeLookup.ts
interface NutritionData {
  name: string
  calories: number
  protein: number
  carbs?: number
  fats?: number
  servingSize?: string
  imageUrl?: string
  brand?: string
}

/**
 * Lookup nutrition data from barcode using OpenFoodFacts
 */
export async function lookupBarcode(barcode: string): Promise<NutritionData | null> {
  try {
    // Remove any non-numeric characters
    const cleanBarcode = barcode.replace(/\D/g, '')
    
    if (!cleanBarcode || cleanBarcode.length < 8) {
      throw new Error('Invalid barcode')
    }

    // Try OpenFoodFacts first (free)
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`
    )
    
    const data = await response.json()
    
    if (data.status === 1 && data.product) {
      const product = data.product
      
      return {
        name: product.product_name || product.product_name_en || 'Unknown Product',
        brand: product.brands || '',
        calories: Math.round(product.nutriments?.['energy-kcal_100g'] || 0),
        protein: Math.round(product.nutriments?.proteins_100g || 0),
        carbs: Math.round(product.nutriments?.carbohydrates_100g || 0),
        fats: Math.round(product.nutriments?.fat_100g || 0),
        servingSize: product.serving_size || product.quantity || '100g',
        imageUrl: product.image_url || product.image_front_url,
      }
    }

    // Fallback: Try USDA API for generic foods
    return await lookupUSDA(barcode)
    
  } catch (error) {
    console.error('Error looking up barcode:', error)
    return null
  }
}

/**
 * Fallback: Lookup using USDA API
 */
async function lookupUSDA(barcode: string): Promise<NutritionData | null> {
  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${import.meta.env.VITE_USDA_API_KEY}&query=${barcode}`
    )
    
    const data = await response.json()
    
    if (data.foods && data.foods.length > 0) {
      const food = data.foods[0]
      const nutrients = food.foodNutrients || []
      
      return {
        name: food.description || 'Unknown Food',
        calories: findNutrient(nutrients, 'Energy') || 0,
        protein: findNutrient(nutrients, 'Protein') || 0,
        carbs: findNutrient(nutrients, 'Carbohydrate, by difference') || 0,
        fats: findNutrient(nutrients, 'Total lipid (fat)') || 0,
        servingSize: '100g',
      }
    }
    
    return null
  } catch (error) {
    console.error('USDA lookup error:', error)
    return null
  }
}

function findNutrient(nutrients: any[], name: string): number {
  const nutrient = nutrients.find(n => n.nutrientName === name)
  return nutrient?.value || 0
}
```

### **Step 4: Integrate into Meals Page**

```typescript
// Add to MealsPage.tsx
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { lookupBarcode } from '@/services/barcodeLookup'
import { Scan } from 'lucide-react'

export default function MealsPage() {
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [barcodeProduct, setBarcodeProduct] = useState<NutritionData | null>(null)

  const handleBarcodeScanned = async (barcode: string) => {
    setShowBarcodeScanner(false)
    
    // Show loading state
    const product = await lookupBarcode(barcode)
    
    if (product) {
      setBarcodeProduct(product)
      // Pre-fill meal form with product data
      setShowAddForm(true)
      // Auto-populate form fields
      setFormData({
        meal_type: 'snack', // or detect from time
        calories: product.calories,
        protein: product.protein,
        carbs: product.carbs,
        fats: product.fats,
        notes: product.name,
      })
    } else {
      toast({
        title: 'Product not found',
        description: 'Could not find nutrition data for this barcode. Please enter manually.',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      {/* Add Barcode Scanner Button */}
      <button
        onClick={() => setShowBarcodeScanner(true)}
        className="btn-primary flex items-center gap-2"
      >
        <Scan className="w-4 h-4" />
        <span>Scan Barcode</span>
      </button>

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner
        open={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </>
  )
}
```

---

## 📊 Database Schema Addition

```sql
-- Add barcode field to meals table
ALTER TABLE meals ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Create index for barcode lookups
CREATE INDEX IF NOT EXISTS idx_meals_barcode ON meals(barcode) WHERE barcode IS NOT NULL;

-- Optional: Cache frequently scanned products
CREATE TABLE IF NOT EXISTS barcode_cache (
  barcode TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  brand TEXT,
  nutrition_data JSONB NOT NULL,
  image_url TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 User Experience Flow

### **Mobile (Camera)**
```
1. User taps "Scan Barcode" 
   ↓
2. Camera permission requested
   ↓
3. Camera opens with barcode scanner overlay
   ↓
4. User points camera at barcode
   ↓
5. "Beep!" - Barcode detected
   ↓
6. Loading spinner: "Looking up product..."
   ↓
7. Product card appears with nutrition info
   ↓
8. User confirms → Meal logged!
```

### **Desktop (File Upload)**
```
1. User clicks "Scan Barcode"
   ↓
2. Dialog opens with file upload option
   ↓
3. User uploads barcode image
   ↓
4. Barcode detected from image
   ↓
5. Product info loaded
   ↓
6. Meal logged!
```

---

## ✅ Benefits

1. **Speed**: Log meals in seconds vs. minutes
2. **Accuracy**: No manual entry errors
3. **Convenience**: Works with packaged foods
4. **Completeness**: Gets full nutrition data automatically
5. **User Experience**: Modern, intuitive feature

---

## ⚠️ Limitations

1. **Packaged Foods Only**: Works best with barcoded products
2. **Database Coverage**: Some products may not be in database
3. **Camera Required**: Mobile devices need camera access
4. **Lighting**: Poor lighting can affect scanning
5. **Barcode Quality**: Damaged barcodes may not scan

---

## 🚀 Future Enhancements

1. **Offline Mode**: Cache frequently scanned products
2. **Multi-Barcode**: Scan multiple products at once
3. **Serving Size Adjuster**: Adjust nutrition for portion size
4. **Product History**: Remember frequently scanned items
5. **Barcode Validation**: Verify barcode format before lookup

---

## 📝 Summary

Barcode scanning transforms meal logging from a 2-3 minute manual process into a 10-second scan-and-confirm flow. It's especially valuable for:
- Packaged snacks
- Protein bars
- Canned foods
- Beverages
- Pre-packaged meals

The feature uses the device camera (mobile) or file upload (desktop) to read barcodes, then queries nutrition databases like OpenFoodFacts to automatically populate meal data.

