import pandas as pd
import os

files = [
    'srcs/1.Activities Day Book.xlsx',
    'srcs/2.Attendence.xlsx', 
    'srcs/3.Production Records.xlsx',
    'srcs/5.Sales & Purchase 25-26.xlsx',
    'srcs/6.Matrl Calcualtion 25-26.xlsx'
]

for file in files:
    print(f"\n{'='*50}")
    print(f"Analyzing: {file}")
    if not os.path.exists(file):
        print("File not found.")
        continue
        
    try:
        xls = pd.ExcelFile(file)
        print("Sheet names:", xls.sheet_names)
        
        for sheet in xls.sheet_names:
            print(f"\n--- Sheet: {sheet} ---")
            df = pd.read_excel(xls, sheet_name=sheet, nrows=5)
            print("Columns:", df.columns.tolist())
            print("First 5 rows:")
            print(df.to_markdown(index=False))
            print("-" * 30)
            
    except Exception as e:
        print(f"Error reading {file}: {e}")
