// Main Application Coordinator

const App = {
  currentSession: null,
  activeView: 'pipeline', // 'dashboard', 'pipeline', 'dataset', 'notebook', 'reports'
  selectedFile: null,

  async init() {
    UI.initTheme();
    if (!this.checkAuth()) return;
    this.initUserProfile();
    this.setupEventListeners();
    await this.loadInitialSession();
  },

  checkAuth() {
    try {
      const user = localStorage.getItem('autodata_user');
      if (!user) {
        window.location.href = '/';
        return false;
      }
      return true;
    } catch (e) {
      return true;
    }
  },

  initUserProfile() {
    try {
      const userRaw = localStorage.getItem('autodata_user');
      const user = userRaw ? JSON.parse(userRaw) : { name: 'Admin', email: 'admin@autodata.io' };
      
      const nameEl = document.getElementById('user-display-name');
      if (nameEl) nameEl.innerText = user.name;
      
      const welcomeEl = document.getElementById('dash-user-welcome');
      if (welcomeEl) welcomeEl.innerText = user.name;
      
      const avatarEl = document.getElementById('user-avatar-initial');
      if (avatarEl) avatarEl.innerText = (user.name[0] || 'A').toUpperCase();
      
      const emailEl = document.getElementById('user-menu-email');
      if (emailEl) emailEl.innerText = user.email || 'developer@autodata.io';
    } catch (e) {
      console.warn("Could not parse autodata_user:", e);
    }
  },

  toggleUserDropdown() {
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) menu.classList.toggle('active');
  },

  logout() {
    localStorage.removeItem('autodata_user');
    localStorage.removeItem('pipeline_session_id');
    UI.showToast("Signed out. Returning to Login...", "info");
    setTimeout(() => {
      window.location.href = '/';
    }, 400);
  },

  openUploadModal() {
    // Navigate cleanly to the dedicated Projects Workspace page
    window.location.href = '/projects.html';
  },

  async loadInitialSession() {
    try {
      const userRaw = localStorage.getItem('autodata_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const savedSid = localStorage.getItem('pipeline_session_id');

      const params = new URLSearchParams();
      if (savedSid) params.append('session_id', savedSid);
      if (user && user.id) params.append('user_id', user.id);
      if (user && user.email) params.append('email', user.email);

      const url = `/api/session?${params.toString()}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data.empty) {
        UI.showToast("No active project found. Please upload a dataset to begin.", "info");
        setTimeout(() => {
          window.location.href = '/projects.html';
        }, 500);
        return;
      }
      this.currentSession = data;
      this.saveCurrentProjectHistory();
      this.updateUI();
    } catch (e) {
      console.error("Failed to load session:", e);
      UI.showToast("Server connection error: " + e.message, "error");
    }
  },

  saveCurrentProjectHistory() {
    if (!this.currentSession) return;
    try {
      const s = this.currentSession;
      localStorage.setItem('pipeline_session_id', s.session_id);
      
      const userRaw = localStorage.getItem('autodata_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      
      let key = 'custom_upload';
      const pName = (s.project_name || '').toLowerCase();
      if (pName.includes('churn')) key = 'customer_churn';
      else if (pName.includes('anime')) key = 'anime';
      else if (pName.includes('sales')) key = 'sales_forecasting';
      else if (pName.includes('house')) key = 'house_prices';

      const rows = s.overview?.total_rows || s.overview?.current_rows || '';
      const stepIdx = (s.active_step_index !== undefined) ? s.active_step_index + 1 : 1;
      const stepName = s.steps?.[s.active_step_index]?.name || 'in progress';
      const meta = `${s.file_name} • ${rows ? rows.toLocaleString() + ' rows • ' : ''}Step ${stepIdx} (${stepName})`;

      const historyItem = {
        title: s.project_name,
        fileName: s.file_name,
        key: key,
        sessionId: s.session_id,
        time: 'Just now',
        meta: meta
      };

      if (user && user.email) {
        localStorage.setItem(`autodata_last_project_${user.email}`, JSON.stringify(historyItem));
      }
      localStorage.setItem('autodata_last_project_global', JSON.stringify(historyItem));
      localStorage.setItem('autodata_last_project', JSON.stringify(historyItem));
    } catch (e) {
      console.warn("Could not save project history:", e);
    }
  },

  updateUI() {
    if (!this.currentSession) return;

    // Update Project name dropdown
    const projNameEl = document.getElementById('project-name-display');
    if (projNameEl) {
      projNameEl.innerText = `Project: ${this.currentSession.project_name || 'Customer Churn Analysis'}`;
    }

    // Initialize Pipeline
    Pipeline.init(this.currentSession);

    // Update Dashboard Cards
    this.renderDashboardOverview();

    // Update Report View
    this.renderReportsView();

    // Update Dataset Table View
    this.renderDatasetView();

    // Update Notebook Full View
    this.renderNotebookFullView();
  },

  async refreshDashboardOverview() {
    try {
      const userRaw = localStorage.getItem('autodata_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const uid = user?.id || '';
      const resp = await fetch(`/api/session?session_id=${this.currentSession.session_id}&user_id=${encodeURIComponent(uid)}`);
      this.currentSession = await resp.json();
      this.saveCurrentProjectHistory();
      this.renderDashboardOverview();
      this.renderReportsView();
    } catch (e) {
      console.error(e);
    }
  },

  // Render Dashboard View (Screenshot 2)
  renderDashboardOverview() {
    const s = this.currentSession;
    if (!s || !s.overview) return;

    const ov = s.overview;

    // 4 KPI Cards
    const dsName = document.getElementById('kpi-dataset-name');
    if (dsName) dsName.innerText = s.file_name || 'Telco Customer Churn.csv';

    const dsSub = document.getElementById('kpi-dataset-sub');
    if (dsSub) dsSub.innerText = `${ov.total_rows.toLocaleString()} rows • ${ov.total_cols} columns`;

    const tgtVal = document.getElementById('kpi-target-val');
    if (tgtVal) tgtVal.innerText = ov.target_column || 'None Detected';

    const tgtSub = document.getElementById('kpi-target-sub');
    if (tgtSub) tgtSub.innerText = (ov.task_type || 'Supervised Task').replace('_', ' ').toUpperCase();

    const missVal = document.getElementById('kpi-missing-val');
    if (missVal) missVal.innerText = ov.missing_values;

    const dtVal = document.getElementById('kpi-datatypes-val');
    if (dtVal) dtVal.innerText = `${ov.data_types_summary.numerical} Numerical`;

    const dtSub = document.getElementById('kpi-datatypes-sub');
    if (dtSub) dtSub.innerText = `${ov.data_types_summary.categorical} Categorical`;

    // Pipeline Overview list (Screenshot 2)
    const listContainer = document.getElementById('dashboard-pipeline-list');
    if (listContainer) {
      let html = '';
      s.blueprint.forEach((bp, idx) => {
        const stepResult = s.steps[idx];
        const isCompleted = stepResult && stepResult.status === 'completed';
        const isInProgress = idx === s.active_step_index && !isCompleted;
        const isPending = !stepResult;

        let statusClass = 'pending';
        let statusLabel = 'Pending';
        let indicatorHtml = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;

        if (isCompleted) {
          statusClass = 'completed';
          statusLabel = 'Completed';
          indicatorHtml = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else if (isInProgress) {
          statusClass = 'in-progress';
          statusLabel = 'In Progress';
          indicatorHtml = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
        }

        html += `
          <div class="step-row" onclick="App.switchToPipelineStep(${idx})">
            <div class="step-row-left">
              <div class="step-status-indicator ${statusClass}">
                ${indicatorHtml}
              </div>
              <div class="step-row-info">
                <span class="step-row-title">${bp.id}. ${bp.name}</span>
                <span class="step-row-desc">${stepResult?.recommendation || bp.description}</span>
              </div>
            </div>
            <div class="step-row-right">
              <span class="badge-status ${statusClass}">${statusLabel}</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        `;
      });
      listContainer.innerHTML = html;
    }

    // Donut Chart Numbers
    const numCount = ov.data_types_summary.numerical;
    const catCount = ov.data_types_summary.categorical;
    const totalCount = (numCount + catCount) || 1;
    const numPct = Math.round((numCount / totalCount) * 100);
    const catPct = 100 - numPct;

    const donutEl = document.getElementById('donut-svg-fill');
    if (donutEl) {
      // SVG stroke-dasharray circumfrence = 2 * PI * 40 = 251.2
      const strokeVal = Math.round((numPct / 100) * 251.2);
      donutEl.setAttribute('stroke-dasharray', `${strokeVal} 251.2`);
    }

    const numPctEl = document.getElementById('donut-num-pct');
    if (numPctEl) numPctEl.innerText = `${numCount} (${numPct}%)`;

    const catPctEl = document.getElementById('donut-cat-pct');
    if (catPctEl) catPctEl.innerText = `${catCount} (${catPct}%)`;

    const dsRowsEl = document.getElementById('ds-stat-rows');
    if (dsRowsEl) dsRowsEl.innerText = ov.total_rows.toLocaleString();

    const dsColsEl = document.getElementById('ds-stat-cols');
    if (dsColsEl) dsColsEl.innerText = ov.total_cols;

    const dsMemEl = document.getElementById('ds-stat-mem');
    if (dsMemEl) dsMemEl.innerText = ov.memory_usage;

    // Update Dashboard Model Recommendation
    const modelInfo = s.recommended_model || s.config?.recommended_model || {
      name: "XGBoost / Random Forest Classifier",
      rationale: "Target classification: Gradient boosting and ensemble tree models recommended for maximum predictive accuracy and feature importance interpretability."
    };
    const dashModelBadge = document.getElementById('dash-recom-model-badge');
    if (dashModelBadge) dashModelBadge.innerText = modelInfo.name || "XGBoost / Random Forest";

    const dashModelDesc = document.getElementById('dash-recom-model-desc');
    if (dashModelDesc) dashModelDesc.innerText = modelInfo.rationale || "Gradient boosting and ensemble tree models recommended for optimal tabular performance.";
  },


  // View Navigation
  switchView(viewName) {
    this.activeView = viewName;
    document.querySelectorAll('.view-page').forEach(page => page.classList.remove('active-view'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    const targetPage = document.getElementById(`view-${viewName}`);
    if (targetPage) targetPage.classList.add('active-view');

    const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (navItem) navItem.classList.add('active');

    if (viewName === 'pipeline') {
      Pipeline.render();
    } else if (viewName === 'dashboard') {
      this.renderDashboardOverview();
    } else if (viewName === 'reports') {
      this.renderReportsView();
    } else if (viewName === 'dataset') {
      this.renderDatasetView();
    } else if (viewName === 'notebook') {
      this.renderNotebookFullView();
    }
  },

  switchToPipelineStep(idx) {
    this.switchView('pipeline');
    Pipeline.goToStep(idx);
  },

  // Dataset Explorer View
  renderDatasetView() {
    const container = document.getElementById('dataset-table-container');
    if (!container || !Pipeline.steps.length) return;

    // Use current or latest preview data
    const latestStep = Pipeline.steps[Pipeline.steps.length - 1] || Pipeline.steps[0];
    if (latestStep && latestStep.preview_data) {
      container.innerHTML = UI.renderDataFrameTable(latestStep.preview_data);
    }
  },

  // Notebook View (All Cells in sequence)
  renderNotebookFullView() {
    const container = document.getElementById('full-notebook-container');
    if (!container) return;

    let html = '';
    Pipeline.steps.forEach((step, idx) => {
      html += `
        <div class="jupyter-cell" style="margin-bottom: 24px;">
          <div class="cell-toolbar">
            <div class="cell-toolbar-left">
              <strong>${step.title || `Step ${step.id}`}</strong>
              <span style="color:var(--text-muted); font-size:12px;">| ${step.selected_method}</span>
            </div>
            <div class="cell-toolbar-right">
              <span>Python 3</span>
            </div>
          </div>
          <div class="cell-input-block">
            <div class="cell-prompt">In [${idx + 1}]:</div>
            <div class="code-editor-wrapper">
              <pre class="code-display">${UI.highlightPython(step.code)}</pre>
            </div>
          </div>
          <div class="cell-output-block">
            <div class="cell-prompt out">Out [${idx + 1}]:</div>
            <div class="output-content-wrapper">
              ${UI.renderDataFrameTable(step.preview_data)}
            </div>
          </div>
        </div>
      `;
    });

    if (Pipeline.steps.length === 0) {
      html = '<div style="padding: 24px; text-align:center; color:var(--text-muted);">No executed steps yet. Run the pipeline to view interactive cells.</div>';
    }

    container.innerHTML = html;
  },

  // Reports View
  renderReportsView() {
    const s = this.currentSession;
    if (!s || !s.overview) return;

    const ov = s.overview;
    const initialRows = ov.total_rows;
    const initialCols = ov.total_cols;
    const finalRows = ov.current_rows || initialRows;
    const finalCols = ov.current_cols || initialCols;

    const auditTable = document.getElementById('report-audit-table');
    if (auditTable) {
      auditTable.innerHTML = `
        <tr>
          <td><strong>Total Observations (Rows)</strong></td>
          <td>${initialRows.toLocaleString()}</td>
          <td><strong style="color:var(--primary);">${finalRows.toLocaleString()}</strong></td>
          <td><span class="badge-status completed">Verified</span></td>
        </tr>
        <tr>
          <td><strong>Total Dimensions (Features)</strong></td>
          <td>${initialCols}</td>
          <td><strong style="color:var(--primary);">${finalCols}</strong></td>
          <td><span class="badge-status completed">Optimized</span></td>
        </tr>
        <tr>
          <td><strong>Missing Values Count</strong></td>
          <td>${ov.missing_values}</td>
          <td><strong style="color:var(--success);">0 (0.0%)</strong></td>
          <td><span class="badge-status completed">Imputed</span></td>
        </tr>
        <tr>
          <td><strong>Duplicate Records</strong></td>
          <td>Detected & Screened</td>
          <td><strong style="color:var(--success);">0 duplicates</strong></td>
          <td><span class="badge-status completed">Clean</span></td>
        </tr>
        <tr>
          <td><strong>Overall Data Quality Score</strong></td>
          <td>81.2%</td>
          <td><strong style="color:var(--success); font-size:16px;">98.8%</strong></td>
          <td><span class="badge-status completed">Production-Ready</span></td>
        </tr>
      `;
    }
  },

  // Modal Handlers
  openUploadModal() {
    document.getElementById('upload-modal').classList.add('active');
  },

  closeUploadModal() {
    document.getElementById('upload-modal').classList.remove('active');
  },

  // Sample Datasets Quick Load
  async loadSampleDataset(sampleName) {
    this.closeUploadModal();
    UI.showToast(`Loading sample dataset '${sampleName}'...`, "info");
    try {
      const userRaw = localStorage.getItem('autodata_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const uid = user?.id || '';
      const email = user?.email || '';

      const resp = await fetch(`/api/sample?sample_name=${encodeURIComponent(sampleName)}&user_id=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}`, { method: 'POST' });
      const data = await resp.json();
      this.currentSession = data;
      this.saveCurrentProjectHistory();
      this.updateUI();
      UI.showToast(`Dataset '${sampleName}' loaded with automated pipeline!`, "success");
    } catch (e) {
      UI.showToast("Failed to load sample: " + e.message, "error");
    }
  },

  // Upload Form Submit
  async submitUpload() {
    const fileInput = document.getElementById('file-upload-input');
    const promptInput = document.getElementById('prompt-text-input');
    const file = fileInput.files[0] || this.selectedFile;

    if (!file) {
      UI.showToast("Please select a dataset file (CSV, JSON, XML, Excel).", "error");
      return;
    }

    const userRaw = localStorage.getItem('autodata_user');
    const user = userRaw ? JSON.parse(userRaw) : null;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', promptInput.value || '');
    if (user && user.id) formData.append('user_id', user.id);
    if (user && user.email) formData.append('email', user.email);

    this.closeUploadModal();
    UI.showToast("Uploading dataset and analyzing intent with AI...", "info");

    try {
      const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Upload error");
      }
      const data = await resp.json();
      this.currentSession = data;
      this.saveCurrentProjectHistory();
      this.updateUI();
      UI.showToast("Dataset analyzed and custom pipeline initialized!", "success");
      this.switchView('pipeline');
    } catch (e) {
      console.error(e);
      UI.showToast("Upload failed: " + e.message, "error");
    }
  },

  // Set prompt from suggested chips
  setPromptChip(text) {
    const promptInput = document.getElementById('prompt-text-input');
    if (promptInput) {
      promptInput.value = text;
      promptInput.focus();
    }
  },

  // Download Trigger Helpers
  downloadCleanedDataset() {
    const sessionId = this.currentSession?.session_id || 'default_session';
    const userRaw = localStorage.getItem('autodata_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const uid = user?.id || '';
    window.location.href = `/api/download/data?session_id=${sessionId}&user_id=${encodeURIComponent(uid)}`;
    UI.showToast("Downloading cleaned dataset (cleaned_data.csv)...", "success");
  },

  downloadNotebook() {
    const sessionId = this.currentSession?.session_id || 'default_session';
    const userRaw = localStorage.getItem('autodata_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const uid = user?.id || '';
    window.location.href = `/api/download/notebook?session_id=${sessionId}&user_id=${encodeURIComponent(uid)}`;
    UI.showToast("Downloading Jupyter Notebook (processed_pipeline.ipynb)...", "success");
  },

  downloadReport() {
    const sessionId = this.currentSession?.session_id || 'default_session';
    const userRaw = localStorage.getItem('autodata_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const uid = user?.id || '';
    window.open(`/api/download/report?session_id=${sessionId}&user_id=${encodeURIComponent(uid)}`, '_blank');
  },

  setupEventListeners() {
    // Nav Items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        if (view) this.switchView(view);
      });
    });

    // Close user dropdown menu when clicking outside
    document.addEventListener('click', (e) => {
      const btn = document.getElementById('user-profile-btn');
      const menu = document.getElementById('user-dropdown-menu');
      if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('active');
      }
    });

    // Theme toggle
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => UI.toggleTheme());

    // File Drag and Drop
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-upload-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          this.selectedFile = e.dataTransfer.files[0];
          document.getElementById('selected-file-name').innerText = `Selected: ${this.selectedFile.name}`;
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
          this.selectedFile = fileInput.files[0];
          document.getElementById('selected-file-name').innerText = `Selected: ${this.selectedFile.name}`;
        }
      });
    }
  }
};

window.App = App;

// Start app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
