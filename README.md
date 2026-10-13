# AutoData Pipeline - Automated Data Mining & Feature Engineering Pipeline

An interactive, end-to-end automated data mining and feature engineering web application built with **FastAPI (Python)** and modern **Vanilla HTML/CSS/JS**. 

The system takes datasets (CSV, JSON, XML, Excel), processes them according to the user's natural language objective prompt, executes transformations step-by-step in an interactive Jupyter cell interface, allows the user to accept/modify/reject each step, and exports production-ready artifacts.

---

## 🌟 Key Features

1. **Dedicated Login & Project Selection Gateway (`/`)**:
   - Matches the reference design with Tailwind styling, subtle background glow effects, and tabbed **Sign In / Create Account** modes.
   - **Upload New Project**: Upload custom datasets (CSV, JSON, XML, Excel) with custom modeling prompts.
   - **Continue Previous Project**: Seamlessly load active workspaces such as **Customer Churn Analysis**, **Project: Anime**, **Project: Sales Forecasting**, and **House Price Regression**.
   - Profile management and one-click **Sign Out** to return to the gateway.

2. **Dataset Upload with Multi-Format Support**:
   - Drag & drop or file picker supporting **CSV, JSON, XML, and Excel (.xlsx)**.
   - Built-in one-click demo datasets (**Customer Churn**, **Anime**, **Sales Forecasting**, **House Prices**).

2. **Goal-Oriented AI Prompt Guidance**:
   - After uploading, provide an objective prompt (e.g., *"Predict customer churn and highlight key risk factors, drop customer ID and scale numeric charges"* or *"Forecast housing price, clip outliers"*).
   - The backend analyzes the prompt alongside dataset metadata to infer:
     - **Task Type** (Binary Classification, Multi-Class, Regression, Clustering).
     - **Target Column** identification.
     - **Features to Skip/Drop** (IDs, identifiers, non-predictive columns).
     - **Custom Scaling & Encoding Strategies** (StandardScaler, MinMaxScaler, RobustScaler, One-Hot Encoding).

3. **Jupyter Cell Execution Interface (Matching Screenshot 1)**:
   - **`In [X]` Code Cell**: Real, executable Python code with syntax highlighting using `pandas`, `sklearn`, and `numpy`.
   - **`Out [X]` Interactive Dataframe Table**: Scrollable transformed output table with rounded values and column headers.
   - **Right Inspector Panel**:
     - AI Recommendation Card (`AI Suggested`).
     - Selected Method Pill.
     - Affected Columns badges (`tenure`, `MonthlyCharges`, `TotalCharges`, etc.).
     - **Action Buttons**: `✓ Accept & Continue`, `✎ Modify Step`, `↺ Reset / Reject Step`.
     - **10-Step Pipeline Stepper**: Checkmarks for completed steps, active indicator, and pending circles.
   - **Execution Modes**: Step-by-step or **Fast Run All** for animated automated completion.

4. **Dashboard Overview (Matching Screenshot 2)**:
   - **4 KPI Cards**: Dataset dimensions, Target Column, Missing Values count & percentage, and Data Types (Numerical vs Categorical).
   - **Pipeline Overview List**: Expandable step cards with status tags (`Completed`, `In Progress`, `Pending`).
   - **Insights & Recommendations**: AI notices for class imbalance, missing values, and high-cardinality features.
   - **Dataset Summary**: Donut chart distribution and memory footprint.

5. **Downloadable Artifacts**:
   - 📥 **Cleaned Dataset** (`cleaned_data.csv`).
   - 📓 **Reproducible Jupyter Notebook** (`processed_pipeline.ipynb`) with real markdown explanations and executable Python code for each step.
   - 📊 **Executive Summary Report** (HTML/PDF) with before vs. after transformation audit.

---

## 🚀 Getting Started

### 1. Requirements
- Python 3.10+
- Installed packages: `fastapi`, `uvicorn`, `pandas`, `numpy`, `scikit-learn`, `python-multipart`

```bash
pip install -r requirements.txt
```

### 2. Start the Server
From the project directory:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Open in Browser
Navigate to:
```
http://127.0.0.1:8000
```

---

## 📁 Project Architecture

```
Major Project/
├── backend/
│   ├── main.py                  # FastAPI app, API routes, static file serving
│   ├── pipeline_engine.py       # 10-step data mining & feature engineering engine
│   ├── prompt_analyzer.py       # Natural language goal & dataset schema analyzer
│   ├── notebook_generator.py    # IPython Notebook (.ipynb) generator
│   └── sample_data.py           # Synthetic dataset generator for Churn & Housing
├── frontend/
│   ├── index.html               # Main dashboard & interactive pipeline interface
│   ├── css/
│   │   ├── style.css            # Responsive layout, dark mode, design tokens
│   │   └── notebook.css         # Jupyter cell & dataframe table styles
│   └── js/
│       ├── app.js               # Central UI coordinator & download handlers
│       ├── pipeline.js          # Interactive cell stepper & execution controls
│       └── ui.js                # Python syntax highlighter, theme toggle, toasts
├── sample_datasets/
│   ├── customer_churn.csv       # Telco Churn dataset
│   └── house_prices.csv         # House Prices dataset
└── requirements.txt             # Project dependencies
```

---

## 🔄 The 10 Automated Pipeline Steps

1. **Load Dataset**: Schema detection, format parsing, and memory footprint calculation.
2. **Data Understanding**: Exploratory profiling, descriptive stats, and cardinality checks.
3. **Missing Value Handling**: Mean/Median imputation for numeric features, Mode for categorical features.
4. **Duplicate Handling**: Redundant row screening and removal while maintaining indexing.
5. **Outlier Detection**: IQR method boundary calculation and Winsorization (capping).
6. **Feature Scaling**: StandardScaler / MinMaxScaler / RobustScaler transformation.
7. **Categorical Encoding**: One-Hot Encoding for nominal variables and Label Encoding for targets.
8. **Feature Engineering**: Ratio synthesis (`Charges_Per_Tenure`, `SqFt_Per_Bedroom`) and identifier removal.
9. **Feature Selection**: Mutual Information ranking and low-variance feature filtering.
10. **Finalize Pipeline**: Verification, export packaging, and train/test readiness validation.
