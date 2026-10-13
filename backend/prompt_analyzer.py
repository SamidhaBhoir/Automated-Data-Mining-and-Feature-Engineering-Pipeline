import re
from typing import Dict, Any, List

def analyze_prompt_and_data(prompt: str, columns: List[str], dtypes: Dict[str, str], sample_df_info: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Parses user natural language goal and dataset schema to generate an
    intelligent data mining & feature engineering blueprint.
    """
    prompt_lower = prompt.lower() if prompt else ""
    
    # 1. Identify Target Column
    target_column = None
    target_candidates = []
    
    # Check if a column name is mentioned in prompt
    for col in columns:
        col_clean = col.lower().strip()
        # Look for explicit mentions like "predict <col>", "target is <col>", "<col> prediction", or just column name
        if re.search(r'\b(predict|target|classify|forecast|estimate|model)\s+([a-z0-9_]*\s+)?' + re.escape(col_clean) + r'\b', prompt_lower):
            target_candidates.insert(0, (col, 10))
        elif re.search(r'\b' + re.escape(col_clean) + r'\b', prompt_lower):
            target_candidates.append((col, 5))
            
    # Heuristics for common target names if not mentioned
    common_target_keywords = ['churn', 'target', 'label', 'price', 'sales', 'class', 'outcome', 'default', 'fraud', 'status', 'survived', 'bought']
    for col in columns:
        col_clean = col.lower().strip()
        for kw in common_target_keywords:
            if kw == col_clean:
                target_candidates.append((col, 8))
            elif kw in col_clean:
                target_candidates.append((col, 4))
                
    if target_candidates:
        # Sort by score descending
        target_candidates.sort(key=lambda x: x[1], reverse=True)
        target_column = target_candidates[0][0]
    else:
        # Fallback to the last column in dataset if appropriate
        target_column = columns[-1] if columns else None

    # 2. Detect Problem / Task Type
    task_type = "classification"
    if any(k in prompt_lower for k in ['regress', 'forecast', 'price', 'salary', 'cost', 'amount', 'continuous', 'value', 'numerical']):
        task_type = "regression"
    elif any(k in prompt_lower for k in ['cluster', 'segment', 'group', 'unsupervised', 'k-means', 'kmeans']):
        task_type = "clustering"
        target_column = None
    elif any(k in prompt_lower for k in ['classify', 'churn', 'fraud', 'detect', 'category', 'binary', 'multiclass', 'predict']):
        task_type = "classification"
    else:
        # Infer task type from target column dtype
        if target_column:
            t_dtype = str(dtypes.get(target_column, "")).lower()
            if any(num_t in t_dtype for num_t in ['int', 'float']):
                unique_count = sample_df_info.get("unique_counts", {}).get(target_column, 100) if sample_df_info else 100
                if unique_count <= 10:
                    task_type = "classification"
                else:
                    task_type = "regression"
            else:
                task_type = "classification"

    # 3. Identify Columns to Drop / Skip
    drop_columns = []
    # Explicitly mentioned to drop in prompt
    for col in columns:
        col_clean = col.lower().strip()
        if re.search(r'\b(drop|remove|ignore|exclude|skip|delete)\s+([a-z0-9_]*\s+)?' + re.escape(col_clean) + r'\b', prompt_lower):
            drop_columns.append(col)
            
    # Auto-detect ID or index columns
    id_patterns = [r'^id$', r'.*_id$', r'^cust.*id$', r'^customerid$', r'^property_id$', r'^uuid$', r'^index$']
    for col in columns:
        col_clean = col.lower().strip()
        if any(re.match(pat, col_clean) for pat in id_patterns) and col not in drop_columns:
            drop_columns.append(col)

    # 4. Feature Scaling Method
    scaling_method = "StandardScaler"
    if "minmax" in prompt_lower or "normaliz" in prompt_lower or "0 to 1" in prompt_lower or "0-1" in prompt_lower:
        scaling_method = "MinMaxScaler"
    elif "robust" in prompt_lower or "outlier" in prompt_lower:
        scaling_method = "RobustScaler"
        
    # 5. Outlier Treatment Method
    outlier_method = "IQR Method (Capping)"
    if "zscore" in prompt_lower or "z-score" in prompt_lower:
        outlier_method = "Z-Score Filtering"
    elif "remove" in prompt_lower and "outlier" in prompt_lower:
        outlier_method = "IQR Removal"

    # 6. Feature Selection Preference
    selection_method = "Mutual Information"
    if task_type == "regression":
        selection_method = "Correlation & F-Regression"
    elif task_type == "clustering":
        selection_method = "Variance Threshold & PCA"

    # 7. Synthesized Objective & Recommendation
    if task_type == "classification":
        objective_summary = f"Predict '{target_column}' using supervised classification. Optimize feature representations and remove non-predictive identifiers."
    elif task_type == "regression":
        objective_summary = f"Forecast continuous variable '{target_column}' using regression modeling with standardized numerical predictors."
    elif task_type == "clustering":
        objective_summary = "Unsupervised customer segmentation and clustering to uncover behavioral patterns."
    else:
        objective_summary = "Automated data mining, quality cleaning, and feature engineering exploration."

    return {
        "task_type": task_type,
        "target_column": target_column,
        "drop_columns": list(set(drop_columns)),
        "scaling_method": scaling_method,
        "outlier_method": outlier_method,
        "selection_method": selection_method,
        "objective_summary": objective_summary,
        "user_prompt": prompt
    }
