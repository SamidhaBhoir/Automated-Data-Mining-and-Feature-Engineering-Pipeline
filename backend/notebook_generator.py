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
