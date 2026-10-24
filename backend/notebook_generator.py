import json
from typing import List, Dict, Any

def create_jupyter_notebook(project_name: str, config: Dict[str, Any], steps: List[Dict[str, Any]]) -> str:
    """
    Constructs a valid IPython Notebook (.ipynb) JSON string
    containing markdown explanations and executable Python code cells
    for each pipeline step.
    """
    cells = []
    
    # Title Markdown Cell
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            f"# {project_name}\n",
            "### Automated Data Mining & Feature Engineering Pipeline\n",
            f"**Objective:** {config.get('objective_summary', 'End-to-end data processing')}\n\n",
            f"- **Target Column:** `{config.get('target_column', 'None')}`\n",
            f"- **Task Type:** `{config.get('task_type', 'classification')}`\n",
            f"- **User Prompt:** *\"{config.get('user_prompt', '')}\"*\n\n",
            "---\n"
        ]
    })
    
    # Environment Setup Cell
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 0. Environment Setup & Dependencies\n",
            "Ensure the required data science packages are installed:\n"
        ]
    })
    
    cells.append({
        "cell_type": "code",
        "execution_count": 1,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Install required dependencies\n",
            "# !pip install pandas numpy scikit-learn matplotlib seaborn\n\n",
            "import pandas as pd\n",
            "import numpy as np\n",
            "import matplotlib.pyplot as plt\n",
            "import seaborn as sns\n",
            "from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, OneHotEncoder, LabelEncoder\n\n",
            "pd.set_option('display.max_columns', None)\n",
            "print('Libraries imported successfully.')\n"
        ]
    })

    # Add each step cell
    for idx, step in enumerate(steps, start=2):
        name = step.get("name", f"Step {idx}")
        desc = step.get("description", "")
        method = step.get("selected_method", "")
        recom = step.get("recommendation", "")
        code = step.get("code", "# Step execution")

        # Markdown header cell
        cells.append({
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                f"### {step.get('title', name)}\n",
                f"**Description:** {desc}\n\n",
                f"> **Recommendation:** {recom}\n",
                f"> **Selected Method:** `{method}`\n"
            ]
        })

        # Code cell
        code_lines = [line + "\n" for line in code.splitlines()]
        cells.append({
            "cell_type": "code",
            "execution_count": idx,
            "metadata": {},
            "outputs": [],
            "source": code_lines
        })

    # Add Recommended Model Training Cell at the end of notebook
    model_info = config.get("recommended_model", {})
    if model_info:
        model_name = model_info.get("name", "XGBoost / Random Forest Classifier")
        task_type = config.get("task_type", "classification")
        target_col = config.get("target_column", "target")
        
        cells.append({
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 11. Recommended Model Training\n",
                f"### Recommended Architecture: **{model_name}**\n\n",
                f"- **Target Variable:** `{target_col}`\n",
                f"- **Recommended Metric:** `{model_info.get('metric', 'F1-Score / Accuracy')}`\n",
                f"- **Rationale:** {model_info.get('rationale', '')}\n\n",
                "Below is the starter training pipeline using the transformed dataset:\n"
            ]
        })
        
        if task_type == "classification":
            train_code = f"""# Train Recommended Model: {model_name}
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

# Separate features and target
if '{target_col}' in df.columns:
    X = df.drop(columns=['{target_col}'])
    y = df['{target_col}']
    
    # Train / Test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Initialize and train recommended model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    print("Classification Report on Transformed Features:")
    print(classification_report(y_test, y_pred))
else:
    print("Target column '{target_col}' not found for training.")"""
        elif task_type == "regression":
            train_code = f"""# Train Recommended Model: {model_name}
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import numpy as np

if '{target_col}' in df.columns:
    X = df.drop(columns=['{target_col}'])
    y = df['{target_col}']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print("Regression Evaluation:")
    print(f"R² Score: {{r2_score(y_test, y_pred):.4f}}")
    print(f"RMSE: {{np.sqrt(mean_squared_error(y_test, y_pred)):.4f}}")"""
        else:
            train_code = f"""# Train Recommended Clustering: {model_name}
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import numpy as np

num_features = df.select_dtypes(include=[np.number])
kmeans = KMeans(n_clusters=4, random_state=42, n_init='auto')
labels = kmeans.fit_predict(num_features)
print(f"Silhouette Score: {{silhouette_score(num_features, labels):.4f}}")"""

        cells.append({
            "cell_type": "code",
            "execution_count": len(steps) + 2,
            "metadata": {},
            "outputs": [],
            "source": [line + "\n" for line in train_code.splitlines()]
        })

    notebook = {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3 (ipykernel)",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.10.0"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }


    return json.dumps(notebook, indent=2)
