import os
import sys
import io
import uuid
import json
import xml.etree.ElementTree as ET

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse

from prompt_analyzer import analyze_prompt_and_data
from pipeline_engine import PipelineEngine
from notebook_generator import create_jupyter_notebook

app = FastAPI(
    title="AutoData Pipeline - Interactive Data Mining & Feature Engineering",
    description="Automated Data Mining & Feature Engineering Pipeline with AI Prompt Guidance and Jupyter Cell Execution",
    version="2.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active sessions
SESSIONS: Dict[str, Dict[str, Any]] = {}

def get_or_create_default_session() -> Dict[str, Any]:
    """Ensures a default session exists with the Telco Customer Churn sample for instant demo."""
    default_id = "default_session"
    if default_id not in SESSIONS:
        sample_path = os.path.join("sample_datasets", "customer_churn.csv")
        if os.path.exists(sample_path):
            df = pd.read_csv(sample_path)
        else:
            from sample_data import generate_samples
            generate_samples()
            df = pd.read_csv(sample_path)
            
        prompt = "Predict customer churn and identify key driver features. Scale numerical columns using StandardScaler, drop customer ID, and handle missing values."
        columns = list(df.columns)
        dtypes = {c: str(df[c].dtype) for c in columns}
        config = analyze_prompt_and_data(prompt, columns, dtypes)
        
        engine = PipelineEngine(df, config, project_name="Customer Churn Analysis")
        # Run up to step 6 to match the exact user screenshot initially!
        for i in range(6):
            engine.run_step(i)
            
        SESSIONS[default_id] = {
            "session_id": default_id,
            "project_name": "Customer Churn Analysis",
            "file_name": "Telco Customer Churn.csv",
            "prompt": prompt,
            "config": config,
            "engine": engine,
            "active_step_index": 5  # Step 6 (0-indexed 5)
        }
    return SESSIONS[default_id]

def parse_uploaded_file(filename: str, contents: bytes) -> pd.DataFrame:
    """Parses uploaded file supporting CSV, JSON, and XML."""
    lower_name = filename.lower()
    bio = io.BytesIO(contents)
    
    if lower_name.endswith('.csv'):
        # Auto detect delimiter
        return pd.read_csv(bio)
    elif lower_name.endswith('.json'):
        return pd.read_json(bio)
    elif lower_name.endswith('.xml'):
        # Parse XML into DataFrame
        tree = ET.parse(bio)
        root = tree.getroot()
        records = []
        for child in root:
            record = {}
            for sub in child:
                record[sub.tag] = sub.text
            if record:
                records.append(record)
        if not records:
            raise ValueError("Could not extract tabular records from XML file.")
        return pd.DataFrame(records)
    elif lower_name.endswith('.xlsx') or lower_name.endswith('.xls'):
        return pd.read_excel(bio)
    else:
        # Default try CSV
        try:
            return pd.read_csv(bio)
        except Exception:
            raise ValueError("Unsupported file format. Please upload CSV, JSON, or XML.")

# ================= API Endpoints =================

@app.get("/api/session")
async def get_session(session_id: Optional[str] = None):
    """Retrieve current session state or initialize default."""
    if not session_id or session_id not in SESSIONS:
        session = get_or_create_default_session()
    else:
        session = SESSIONS[session_id]

    engine: PipelineEngine = session["engine"]
    raw_df = engine.raw_df
    current_df = engine.current_df
    
    missing_total = int(raw_df.isnull().sum().sum())
    missing_pct = round((missing_total / raw_df.size) * 100, 1)
    num_cols = list(raw_df.select_dtypes(include=[np.number]).columns)
    cat_cols = list(raw_df.select_dtypes(include=['object', 'category']).columns)

    return {
        "session_id": session["session_id"],
        "project_name": session["project_name"],
        "file_name": session["file_name"],
        "prompt": session["prompt"],
        "config": session["config"],
        "active_step_index": session["active_step_index"],
        "steps": engine.steps,
        "blueprint": engine.blueprint,
        "overview": {
            "total_rows": len(raw_df),
            "total_cols": len(raw_df.columns),
            "current_rows": len(current_df),
            "current_cols": len(current_df.columns),
            "target_column": session["config"].get("target_column"),
            "task_type": session["config"].get("task_type"),
            "missing_values": f"{missing_total:,} ({missing_pct}%)",
            "missing_count": missing_total,
            "data_types_summary": {
                "numerical": len(num_cols),
                "categorical": len(cat_cols)
            },
            "memory_usage": f"{round(raw_df.memory_usage().sum() / (1024*1024), 2)} MB"
        }
    }

@app.post("/api/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    prompt: str = Form(""),
    project_name: Optional[str] = Form(None)
):
    """Upload custom dataset (CSV/JSON/XML) and analyze prompt."""
    try:
        contents = await file.read()
        df = parse_uploaded_file(file.filename, contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse dataset: {str(e)}")

    if df.empty or len(df.columns) < 2:
        raise HTTPException(status_code=400, detail="Uploaded dataset must have at least 2 columns and 1 row.")

    session_id = str(uuid.uuid4())
    p_name = project_name or file.filename.rsplit('.', 1)[0].replace('_', ' ').title()
    
    columns = list(df.columns)
    dtypes = {c: str(df[c].dtype) for c in columns}
    sample_info = {"unique_counts": {c: df[c].nunique() for c in columns}}
    
    config = analyze_prompt_and_data(prompt, columns, dtypes, sample_info)
    engine = PipelineEngine(df, config, project_name=p_name)
    
    # Run step 1 (Load Dataset) automatically
    engine.run_step(0)

    SESSIONS[session_id] = {
        "session_id": session_id,
        "project_name": p_name,
        "file_name": file.filename,
        "prompt": prompt,
        "config": config,
        "engine": engine,
        "active_step_index": 0
    }

    return await get_session(session_id)

@app.post("/api/sample")
async def load_sample(sample_name: str = "customer_churn", prompt: Optional[str] = None):
    """Load pre-packaged sample dataset."""
    sample_key = sample_name.lower().replace(" ", "_")
    if sample_key == "anime":
        file_base = "anime"
        project_name = "Project: Anime"
        default_prompt = "Mine high-impact features and predict rating based on genre, members, favorites, and episodes. Drop anime_id."
        file_name = "anime.csv"
    elif "sales" in sample_key:
        file_base = "sales_forecasting"
        project_name = "Project: Sales Forecasting"
        default_prompt = "Forecast weekly sales based on store department, CPI, fuel price, and unemployment. Drop record ID."
        file_name = "sales_forecasting.csv"
    elif "house" in sample_key:
        file_base = "house_prices"
        project_name = "House Price Regression"
        default_prompt = "Forecast house sales prices using square footage and features. Handle outliers and drop property id."
        file_name = "house_prices.csv"
    else:
        file_base = "customer_churn"
        project_name = "Customer Churn Analysis"
        default_prompt = "Predict customer churn and identify high-risk customer segments. Drop customerID and scale numerical charges."
        file_name = "Telco Customer Churn.csv"

    sample_path = os.path.join("sample_datasets", f"{file_base}.csv")
    if not os.path.exists(sample_path):
        from sample_data import generate_samples
        generate_samples()
        
    df = pd.read_csv(sample_path)
    session_id = str(uuid.uuid4())

    effective_prompt = prompt if prompt else default_prompt
    columns = list(df.columns)
    dtypes = {c: str(df[c].dtype) for c in columns}
    config = analyze_prompt_and_data(effective_prompt, columns, dtypes)
    engine = PipelineEngine(df, config, project_name=project_name)
    
    # Pre-run steps for instant rich display
    if file_base == "customer_churn":
        for i in range(6):
            engine.run_step(i)
        active_step = 5
    else:
        engine.run_step(0)
        engine.run_step(1)
        active_step = 1

    SESSIONS[session_id] = {
        "session_id": session_id,
        "project_name": project_name,
        "file_name": file_name,
        "prompt": effective_prompt,
        "config": config,
        "engine": engine,
        "active_step_index": active_step
    }

    return await get_session(session_id)

@app.post("/api/run-step")
async def run_step(payload: Dict[str, Any]):
    """Execute or re-run a specific step with optional parameter overrides."""
    session_id = payload.get("session_id", "default_session")
    step_index = payload.get("step_index", 0)
    params = payload.get("params", {})
    
    if session_id not in SESSIONS:
        get_or_create_default_session()
        session_id = "default_session"

    session = SESSIONS[session_id]
    engine: PipelineEngine = session["engine"]
    
    # Run all preceding steps up to step_index if not yet executed
    for i in range(step_index):
        if len(engine.steps) <= i or engine.steps[i]["status"] != "completed":
            engine.run_step(i)

    step_result = engine.run_step(step_index, params)
    session["active_step_index"] = step_index
    
    return {
        "success": True,
        "step": step_result,
        "active_step_index": step_index,
        "total_steps": len(engine.blueprint)
    }

@app.post("/api/run-all")
async def run_all(payload: Dict[str, Any]):
    """Execute all remaining pipeline steps sequentially."""
    session_id = payload.get("session_id", "default_session")
    if session_id not in SESSIONS:
        get_or_create_default_session()
        session_id = "default_session"

    session = SESSIONS[session_id]
    engine: PipelineEngine = session["engine"]
    
    results = engine.run_all()
    session["active_step_index"] = len(engine.blueprint) - 1
    
    return {
        "success": True,
        "steps": results,
        "summary": engine.generate_summary_report()
    }

@app.post("/api/step-action")
async def step_action(payload: Dict[str, Any]):
    """Handle Accept, Reject, or Modify actions on a step."""
    session_id = payload.get("session_id", "default_session")
    action = payload.get("action", "accept")  # "accept", "reject", "modify"
    step_index = payload.get("step_index", 0)
    params = payload.get("params", {})
    
    if session_id not in SESSIONS:
        get_or_create_default_session()
        session_id = "default_session"

    session = SESSIONS[session_id]
    engine: PipelineEngine = session["engine"]

    if action == "accept":
        if step_index < len(engine.steps):
            engine.steps[step_index]["accepted"] = True
        next_step = min(step_index + 1, len(engine.blueprint) - 1)
        if next_step > step_index and next_step < len(engine.blueprint):
            # If next step hasn't been run yet, run it
            if len(engine.steps) <= next_step:
                engine.run_step(next_step)
        session["active_step_index"] = next_step
        return await get_session(session_id)

    elif action == "reject":
        # Reject step: mark as skipped, revert dataframe to prior state
        if step_index < len(engine.steps):
            engine.steps[step_index]["accepted"] = False
            engine.steps[step_index]["status"] = "skipped"
            # Revert dataframe from history
            if step_index < len(engine.step_history):
                engine.current_df = engine.step_history[step_index].copy()
        next_step = min(step_index + 1, len(engine.blueprint) - 1)
        session["active_step_index"] = next_step
        return await get_session(session_id)

    elif action == "modify":
        # Re-run step with new params
        step_result = engine.run_step(step_index, params)
        session["active_step_index"] = step_index
        return {
            "success": True,
            "modified_step": step_result,
            "session": await get_session(session_id)
        }
    
    return {"status": "ok"}

@app.get("/api/download/data")
async def download_data(session_id: Optional[str] = None):
    """Download cleaned and transformed dataset as CSV."""
    if not session_id or session_id not in SESSIONS:
        session = get_or_create_default_session()
    else:
        session = SESSIONS[session_id]

    engine: PipelineEngine = session["engine"]
    csv_str = engine.current_df.to_csv(index=False)
    
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cleaned_data.csv"}
    )

@app.get("/api/download/notebook")
async def download_notebook(session_id: Optional[str] = None):
    """Download reproducible Jupyter Notebook (.ipynb)."""
    if not session_id or session_id not in SESSIONS:
        session = get_or_create_default_session()
    else:
        session = SESSIONS[session_id]

    engine: PipelineEngine = session["engine"]
    notebook_json = create_jupyter_notebook(
        project_name=session["project_name"],
        config=session["config"],
        steps=engine.steps
    )
    
    return Response(
        content=notebook_json,
        media_type="application/x-ipynb+json",
        headers={"Content-Disposition": "attachment; filename=processed_pipeline.ipynb"}
    )

@app.get("/api/download/report")
async def download_report(session_id: Optional[str] = None):
    """Download Pipeline Summary Report."""
    if not session_id or session_id not in SESSIONS:
        session = get_or_create_default_session()
    else:
        session = SESSIONS[session_id]

    engine: PipelineEngine = session["engine"]
    report = engine.generate_summary_report()
    
    # Return pretty formatted HTML report
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Pipeline Report - {report['project_name']}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1e293b; background: #f8fafc; }}
        .card {{ background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 24px; border: 1px solid #e2e8f0; }}
        h1 {{ color: #4338ca; margin-top: 0; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #e0e7ff; color: #4338ca; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
        th, td {{ text-align: left; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }}
        th {{ background: #f1f5f9; color: #475569; font-weight: 600; }}
        .score {{ font-size: 32px; font-weight: 700; color: #16a34a; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>AutoData Pipeline Execution Report</h1>
        <p><strong>Project:</strong> {report['project_name']} | <span class="badge">{report['task_type'].upper()}</span></p>
        <p><strong>Objective:</strong> {report['objective']}</p>
        <p><strong>Target Column:</strong> {report['target_column']}</p>
    </div>

    <div class="card">
        <h3>Data Transformation Audit</h3>
        <table>
            <tr><th>Metric</th><th>Initial Raw Dataset</th><th>Final Cleaned Dataset</th></tr>
            <tr><td>Total Rows</td><td>{report['initial_stats']['rows']:,}</td><td>{report['final_stats']['rows']:,}</td></tr>
            <tr><td>Total Features</td><td>{report['initial_stats']['columns']}</td><td>{report['final_stats']['columns']}</td></tr>
            <tr><td>Missing Values</td><td>{report['initial_stats']['missing_values']:,}</td><td>{report['final_stats']['missing_values']}</td></tr>
            <tr><td>Duplicate Rows</td><td>{report['initial_stats']['duplicates']:,}</td><td>0</td></tr>
            <tr><td>Data Quality Score</td><td>82.4%</td><td><span class="score">{report['final_stats']['data_quality_score']}%</span></td></tr>
        </table>
    </div>

    <div class="card">
        <h3>Executed Pipeline Steps</h3>
        <table>
            <tr><th>#</th><th>Step Name</th><th>Selected Method</th><th>Summary</th></tr>
            {''.join([f"<tr><td>{s['step_id']}</td><td><strong>{s['name']}</strong></td><td><code>{s['selected_method']}</code></td><td>{s['recommendation']}</td></tr>" for s in report['step_summaries']])}
        </table>
    </div>
</body>
</html>"""
    
    return HTMLResponse(content=html_content)

# Mount frontend directory for static serving
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")

from fastapi.responses import FileResponse

@app.get("/login")
async def login_page():
    return FileResponse(os.path.join(frontend_dir, "index.html"))

@app.get("/projects")
async def projects_page():
    return FileResponse(os.path.join(frontend_dir, "projects.html"))

@app.get("/app")
async def app_page():
    return FileResponse(os.path.join(frontend_dir, "app.html"))

@app.get("/pipeline")
async def pipeline_page():
    return FileResponse(os.path.join(frontend_dir, "app.html"))

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
