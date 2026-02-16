import pandas as pd
import sys

def analyze_material_calculation_excel(file_path):
    """Analyze Material Calculation Excel file and extract features"""
    
    print(f"\n{'='*70}")
    print(f"MATERIAL CALCULATION EXCEL FILE ANALYSIS")
    print(f"{'='*70}")
    print(f"File: {file_path}\n")
    
    try:
        # Load the Excel file
        xls = pd.ExcelFile(file_path)
        
        print(f"📊 Number of Sheets: {len(xls.sheet_names)}")
        print(f"📋 Sheet Names: {', '.join(xls.sheet_names)}\n")
        
        # Analyze each sheet
        for sheet_name in xls.sheet_names:
            print(f"\n{'─'*70}")
            print(f"📄 SHEET: {sheet_name}")
            print(f"{'─'*70}")
            
            # Read the sheet
            df = pd.read_excel(xls, sheet_name=sheet_name)
            
            print(f"\n📐 Dimensions: {df.shape[0]} rows × {df.shape[1]} columns")
            print(f"\n📋 Columns ({len(df.columns)}):")
            for i, col in enumerate(df.columns, 1):
                print(f"  {i}. {col}")
            
            # Show data types
            print(f"\n📊 Data Types:")
            for col, dtype in df.dtypes.items():
                print(f"  • {col}: {dtype}")
            
            # Show first few rows
            print(f"\n🔍 First 5 Rows Preview:")
            print(df.head(5).to_string(index=False))
            
            # Show statistics for numeric columns
            numeric_cols = df.select_dtypes(include=['number']).columns
            if len(numeric_cols) > 0:
                print(f"\n📈 Numeric Column Statistics:")
                print(df[numeric_cols].describe().to_string())
            
            # Check for unique values in key columns
            print(f"\n🔢 Unique Value Counts:")
            for col in df.columns[:10]:  # Show first 10 columns
                unique_count = df[col].nunique()
                print(f"  • {col}: {unique_count} unique values")
            
            # Check for missing values
            missing = df.isnull().sum()
            if missing.any():
                print(f"\n⚠️ Missing Values:")
                for col, count in missing[missing > 0].items():
                    print(f"  • {col}: {count} missing")
            
        print(f"\n{'='*70}")
        print("ANALYSIS COMPLETE")
        print(f"{'='*70}\n")
        
    except Exception as e:
        print(f"❌ Error analyzing file: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    file_path = "srcs/6.Matrl Calcualtion 25-26.xlsx"
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    
    analyze_material_calculation_excel(file_path)
