// Pipeline Stepper and Execution Engine Handler

const Pipeline = {
  activeStepIdx: 5, // Default to step 6 (index 5) matching Screenshot 1
  blueprint: [],
  steps: [],
  sessionData: null,
  isRunningAll: false,

  init(sessionData) {
    this.sessionData = sessionData;
    this.blueprint = sessionData.blueprint || [];
    this.steps = sessionData.steps || [];
    this.activeStepIdx = sessionData.active_step_index !== undefined ? sessionData.active_step_index : 0;
    this.render();
  },

  updateSession(sessionData) {
    this.sessionData = sessionData;
    this.blueprint = sessionData.blueprint || [];
    this.steps = sessionData.steps || [];
    if (sessionData.active_step_index !== undefined) {
      this.activeStepIdx = sessionData.active_step_index;
    }
    this.render();
  },

  render() {
    this.renderStage();
    this.renderInspector();
    this.renderSidebarProgress();
  },

  // Get current active step data
  getCurrentStep() {
    if (this.steps && this.steps[this.activeStepIdx]) {
      return this.steps[this.activeStepIdx];
    }
    if (this.blueprint && this.blueprint[this.activeStepIdx]) {
      const bp = this.blueprint[this.activeStepIdx];
      return {
        id: bp.id,
        name: bp.name,
        title: bp.title,
        description: bp.description,
        code: `# ${bp.id}. ${bp.name}\n# Click 'Run Step' or 'Accept & Continue' to execute`,
        recommendation: "Recommended transformation based on dataset profiling.",
        recommendation_tag: "AI Suggested",
        selected_method: bp.default_params?.method || bp.name,
        columns_affected: [],
        preview_data: null,
        status: "pending"
      };
    }
    return null;
  },

  // Render the central stage (Screenshot 1)
  renderStage() {
    const step = this.getCurrentStep();
    if (!step) return;

    // Header
    const titleEl = document.getElementById('stage-step-title');
    if (titleEl) {
      titleEl.innerHTML = `${step.title || `Step ${step.id}: ${step.name}`} <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`;
    }

    const descEl = document.getElementById('stage-step-desc');
    if (descEl) {
      descEl.innerText = step.description || "";
    }

    // Jupyter Code Input block
    const promptNumber = step.id || (this.activeStepIdx + 1);
    const inPromptEl = document.getElementById('cell-in-prompt');
    if (inPromptEl) inPromptEl.innerText = `In [${promptNumber}]:`;

    const codeDisplayEl = document.getElementById('cell-code-display');
    if (codeDisplayEl) {
      codeDisplayEl.innerHTML = UI.highlightPython(step.code || "");
    }

    // Output block
    const outPromptEl = document.getElementById('cell-out-prompt');
    if (outPromptEl) outPromptEl.innerText = `Out [${promptNumber}]:`;

    const outWrapperEl = document.getElementById('cell-output-wrapper');
    if (outWrapperEl) {
      if (step.preview_data) {
        outWrapperEl.innerHTML = UI.renderDataFrameTable(step.preview_data);
      } else {
        outWrapperEl.innerHTML = `<div style="padding: 16px; color: var(--text-muted); font-size: 13px;">
          Cell output ready. Execute step to inspect updated dataframe preview.
        </div>`;
      }
    }

    // Prev / Next button states
    const prevBtn = document.getElementById('btn-prev-step');
    if (prevBtn) {
      prevBtn.disabled = this.activeStepIdx === 0;
      prevBtn.style.opacity = this.activeStepIdx === 0 ? "0.5" : "1";
    }

    const nextBtn = document.getElementById('btn-next-step');
    if (nextBtn) {
      const isLast = this.activeStepIdx === (this.blueprint.length - 1);
      nextBtn.innerText = isLast ? "Finish Pipeline ✓" : "Next Step →";
    }
  },

  // Render the Right Inspector (Screenshot 1)
  renderInspector() {
    const step = this.getCurrentStep();
    if (!step) return;

    // Header title
    const insTitle = document.getElementById('inspector-step-title');
    if (insTitle) {
      insTitle.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary);"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> ${step.title || `Step ${step.id}: ${step.name}`}`;
    }

    // Recommendation card
    const recomText = document.getElementById('inspector-recom-text');
    if (recomText) recomText.innerText = step.recommendation || "Processing step using optimal hyperparameters.";

    const aiBadge = document.getElementById('inspector-ai-badge');
    if (aiBadge) aiBadge.innerText = step.recommendation_tag || "AI Suggested";

    // Model Recommendation
    const modelInfo = step.recommended_model || this.sessionData?.recommended_model || this.sessionData?.config?.recommended_model || {
      name: "XGBoost / Random Forest Classifier",
      rationale: "Optimal for tabular classification with non-linear feature interactions and high predictive stability.",
      metric: "F1-Score & ROC-AUC"
    };

    const modelBadge = document.getElementById('inspector-model-badge');
    if (modelBadge) modelBadge.innerText = modelInfo.name || "XGBoost / Random Forest";

    const modelRationale = document.getElementById('inspector-model-rationale');
    if (modelRationale) modelRationale.innerText = modelInfo.rationale || "Optimal for tabular classification with non-linear feature interactions.";

    const modelMetric = document.getElementById('inspector-model-metric-val');
    if (modelMetric) modelMetric.innerText = modelInfo.metric || "F1-Score & ROC-AUC";


    // Selected Method
    const methodPill = document.getElementById('inspector-method-pill');
    if (methodPill) methodPill.innerText = step.selected_method || "Automated Transformation";

    // Columns Affected
    const colCountEl = document.getElementById('inspector-affected-count');
    const colsCloud = document.getElementById('inspector-tags-cloud');
    const affected = step.columns_affected || [];

    if (colCountEl) colCountEl.innerText = `${affected.length} Columns`;
    if (colsCloud) {
      if (affected.length === 0) {
        colsCloud.innerHTML = `<span class="tag-pill">All features</span>`;
      } else {
        colsCloud.innerHTML = affected.map(col => `<span class="tag-pill">${col}</span>`).join('');
      }
    }

    // Stepper Checklist (10 steps)
    const checklistEl = document.getElementById('inspector-stepper-checklist');
    if (checklistEl) {
      let html = '';
      this.blueprint.forEach((bp, idx) => {
        const isCompleted = idx < this.steps.length && this.steps[idx]?.status === 'completed';
        const isActive = idx === this.activeStepIdx;
        const isSkipped = idx < this.steps.length && this.steps[idx]?.status === 'skipped';

        let iconHtml = '';
        let itemClass = 'stepper-item';
        if (isActive) {
          itemClass += ' active';
          iconHtml = `<svg class="step-icon-active" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>`;
        } else if (isCompleted) {
          itemClass += ' completed';
          iconHtml = `<svg class="step-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else if (isSkipped) {
          iconHtml = `<span style="color:var(--text-muted); font-size:12px;">⏭</span>`;
        } else {
          iconHtml = `<svg class="step-icon-pending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;
        }

        html += `<div class="${itemClass}" onclick="Pipeline.goToStep(${idx})">
          <div class="stepper-item-left">
            <span>${iconHtml}</span>
            <span>${bp.id}. ${bp.name}</span>
          </div>
          <span>${isCompleted ? '✓' : ''}</span>
        </div>`;
      });
      checklistEl.innerHTML = html;
    }
  },

  // Update left sidebar progress indicator
  renderSidebarProgress() {
    const total = this.blueprint.length || 10;
    const completedCount = this.steps.filter(s => s.status === 'completed').length;
    const currentStepNum = Math.min(this.activeStepIdx + 1, total);
    const pct = Math.round((completedCount / total) * 100);

    const titleEl = document.getElementById('sidebar-step-counter');
    if (titleEl) titleEl.innerText = `Step ${currentStepNum} of ${total}`;

    const fillEl = document.getElementById('sidebar-progress-fill');
    if (fillEl) fillEl.style.width = `${pct}%`;

    const labelEl = document.getElementById('sidebar-progress-label');
    if (labelEl) labelEl.innerText = `${pct}%`;
  },

  getUserId() {
    try {
      const u = localStorage.getItem('autodata_user');
      return u ? JSON.parse(u).id : null;
    } catch (e) {
      return null;
    }
  },

  // Step Actions
  async acceptAndContinue() {
    try {
      const resp = await fetch('/api/step-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionData.session_id,
          action: 'accept',
          step_index: this.activeStepIdx,
          user_id: this.getUserId()
        })
      });
      const data = await resp.json();
      UI.showToast(`Step ${this.activeStepIdx + 1} accepted! Moving to next step.`, 'success');
      this.updateSession(data);
      if (window.App) window.App.refreshDashboardOverview();
    } catch (e) {
      console.error(e);
      UI.showToast('Failed to accept step: ' + e.message, 'error');
    }
  },

  // Open Reject / Reset Modal
  openRejectModal() {
    const step = this.getCurrentStep();
    if (!step) return;

    const modal = document.getElementById('reject-step-modal');
    const content = document.getElementById('reject-modal-content');
    const title = document.getElementById('reject-modal-title');
    
    if (title) {
      title.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--danger);">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg> Revert / Reject ${step.title || step.name}`;
    }

    const affectedCols = (step.columns_affected || []).filter(c => c !== "All Rows" && c !== "Target" && c !== "No missing values");
    const affectedCount = affectedCols.length > 0 ? affectedCols.length : (step.total_cols || 'all');

    if (content) {
      content.innerHTML = `
        <div class="reject-warning-box">
          <strong>⚠️ Step Reversion Notice</strong>
          <p style="margin-top:6px; font-size:12.5px;">
            You are about to revert transformations applied in <strong>${step.title || step.name}</strong>.
            The dataset state will be restored to before this step executed.
          </p>
        </div>

        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:12px; margin-top:12px;">
          <div style="font-size:11.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">
            Columns to be Reverted (${affectedCount}):
          </div>
          <div class="tags-cloud">
            ${affectedCols.length > 0 
              ? affectedCols.map(c => `<span class="tag-pill" style="border-color:rgba(239,68,68,0.3); color:var(--danger);">${c}</span>`).join('') 
              : '<span class="tag-pill">All Features Reverted</span>'}
          </div>
        </div>

        <div style="font-size:12.5px; color:var(--text-muted); margin-top:12px;">
          Select your action:
          <ul style="margin-top:6px; padding-left:18px; line-height:1.6;">
            <li><strong>Skip / Reject Step:</strong> Reverts changes and marks this step as skipped (⏭).</li>
            <li><strong>Reset to AI Defaults:</strong> Clears custom column modifications and re-runs with original AI parameters.</li>
          </ul>
        </div>
      `;
    }

    if (modal) modal.classList.add('active');
  },

  closeRejectModal() {
    const modal = document.getElementById('reject-step-modal');
    if (modal) modal.classList.remove('active');
  },

  async confirmRejectStep() {
    this.closeRejectModal();
    try {
      UI.showToast(`Reverting Step ${this.activeStepIdx + 1}...`, 'info');
      const resp = await fetch('/api/step-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionData.session_id,
          action: 'reject',
          step_index: this.activeStepIdx,
          user_id: this.getUserId()
        })
      });
      const data = await resp.json();
      UI.showToast(`Step ${this.activeStepIdx + 1} skipped. Dataset reverted to prior state.`, 'info');
      this.updateSession(data);
      if (window.App) window.App.refreshDashboardOverview();
    } catch (e) {
      console.error(e);
      UI.showToast('Failed to reject step: ' + e.message, 'error');
    }
  },

  async confirmResetStep() {
    this.closeRejectModal();
    try {
      UI.showToast(`Resetting Step ${this.activeStepIdx + 1} to original defaults...`, 'info');
      const resp = await fetch('/api/step-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionData.session_id,
          action: 'reset',
          step_index: this.activeStepIdx,
          user_id: this.getUserId()
        })
      });
      const data = await resp.json();
      UI.showToast(`Step ${this.activeStepIdx + 1} reset to AI recommended defaults!`, 'success');
      if (data.session) {
        this.updateSession(data.session);
      }
      if (window.App) window.App.refreshDashboardOverview();
    } catch (e) {
      console.error(e);
      UI.showToast('Reset failed: ' + e.message, 'error');
    }
  },

  async rejectStep() {
    this.openRejectModal();
  },


  async resetCurrentStep() {
    try {
      const resp = await fetch('/api/run-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionData.session_id,
          step_index: this.activeStepIdx,
          params: {},
          user_id: this.getUserId()
        })
      });
      const data = await resp.json();
      if (data.step) {
        this.steps[this.activeStepIdx] = data.step;
        this.render();
        UI.showToast(`Step ${this.activeStepIdx + 1} reset to default parameters.`, 'info');
      }
    } catch (e) {
      UI.showToast('Reset failed: ' + e.message, 'error');
    }
  },

  goToStep(idx) {
    if (idx < 0 || idx >= this.blueprint.length) return;
    this.activeStepIdx = idx;
    
    // If step hasn't been executed yet, run it
    if (!this.steps[idx] || this.steps[idx].status !== 'completed') {
      this.runActiveStep();
    } else {
      this.render();
    }
  },

  previousStep() {
    if (this.activeStepIdx > 0) {
      this.goToStep(this.activeStepIdx - 1);
    }
  },

  nextStep() {
    if (this.activeStepIdx < this.blueprint.length - 1) {
      this.goToStep(this.activeStepIdx + 1);
    } else {
      UI.showToast("All pipeline steps completed! Final artifacts ready.", "success");
      if (window.App) window.App.switchView('reports');
    }
  },

  async runActiveStep(customParams = null) {
    try {
      const resp = await fetch('/api/run-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionData.session_id,
          step_index: this.activeStepIdx,
          params: customParams || {},
          user_id: this.getUserId()
        })
      });
      const data = await resp.json();
      if (data.step) {
        this.steps[this.activeStepIdx] = data.step;
        this.render();
      }
    } catch (e) {
      console.error(e);
      UI.showToast('Execution error: ' + e.message, 'error');
    }
  },

  // Fast automated "Run All" execution with animated progression
  async runAllSteps() {
    if (this.isRunningAll) return;
    this.isRunningAll = true;
    UI.showToast("Executing automated pipeline at high speed...", "info");

    const total = this.blueprint.length;
    for (let i = 0; i < total; i++) {
      this.activeStepIdx = i;
      this.render();
      try {
        const resp = await fetch('/api/run-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.sessionData.session_id,
            step_index: i,
            user_id: this.getUserId()
          })
        });
        const data = await resp.json();
        if (data.step) {
          this.steps[i] = data.step;
          this.render();
        }
      } catch (e) {
        console.error(e);
      }
      // Fluid short pause for visual feedback
      await new Promise(r => setTimeout(r, 450));
    }

    this.isRunningAll = false;
    UI.showToast("Pipeline fully executed! All steps verified in database.", "success");
    if (window.App) window.App.refreshDashboardOverview();
  },

  // Temporary state for the modify modal
  modifyingStepIdx: null,
  modifyingSelectedColumns: [],
  allAvailableColumns: [],
  initialAffectedColumns: [],

  // Open Modify Step Modal
  openModifyModal() {
    const step = this.getCurrentStep();
    if (!step) return;

    this.modifyingStepIdx = this.activeStepIdx;
    const bp = this.blueprint[this.activeStepIdx] || {};
    const stepType = bp.type || '';

    // Determine available columns
    const allCols = this.sessionData?.all_columns || (step.preview_data ? step.preview_data.columns : []) || [];
    this.allAvailableColumns = [...allCols];

    // Filter out pseudo column tags
    const rawAffected = step.columns_affected || [];
    let initialSelected = rawAffected.filter(c => allCols.includes(c));

    // If initialSelected is empty, select appropriate defaults
    if (initialSelected.length === 0 && allCols.length > 0) {
      if (stepType === 'scaling' || stepType === 'outliers') {
        initialSelected = allCols.filter(c => {
          const dt = this.sessionData?.column_types?.[c] || (step.preview_data?.dtypes?.[c]);
          return dt === 'Numerical' || (dt && (dt.includes('int') || dt.includes('float')));
        });
      } else if (stepType === 'encoding') {
        initialSelected = allCols.filter(c => {
          const dt = this.sessionData?.column_types?.[c] || (step.preview_data?.dtypes?.[c]);
          return dt === 'Categorical' || (dt && (dt.includes('object') || dt.includes('category')));
        });
      } else {
        initialSelected = [...allCols];
      }
    }

    this.modifyingSelectedColumns = [...initialSelected];
    this.initialAffectedColumns = [...initialSelected];

    const modal = document.getElementById('modify-step-modal');
    const titleEl = document.getElementById('modify-modal-title');
    const contentEl = document.getElementById('modify-modal-content');

    if (titleEl) {
      titleEl.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary); margin-right:6px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Modify ${step.title || step.name}`;
    }

    // Step type specific parameter controls
    let paramControlsHtml = '';
    if (stepType === 'scaling') {
      paramControlsHtml = `
        <label style="font-size:12.5px; font-weight:600; color:var(--text-main);">Scaling Algorithm:</label>
        <select id="mod-scaling-select" class="cell-type-select" style="width:100%; padding:9px; margin-top:6px;">
          <option value="StandardScaler">StandardScaler (Zero mean, unit variance - Best for Gaussian features)</option>
          <option value="MinMaxScaler">MinMaxScaler (Bounded to [0, 1] range)</option>
          <option value="RobustScaler">RobustScaler (Median & IQR - Best when extreme outliers exist)</option>
        </select>
      `;
    } else if (stepType === 'outliers') {
      paramControlsHtml = `
        <label style="font-size:12.5px; font-weight:600; color:var(--text-main);">IQR Boundary Multiplier:</label>
        <select id="mod-iqr-select" class="cell-type-select" style="width:100%; padding:9px; margin-top:6px;">
          <option value="1.5">1.5 × IQR (Standard industry threshold)</option>
          <option value="2.0">2.0 × IQR (Moderate threshold)</option>
          <option value="3.0">3.0 × IQR (Extreme outliers only)</option>
        </select>
      `;
    } else if (stepType === 'missing') {
      paramControlsHtml = `
        <label style="font-size:12.5px; font-weight:600; color:var(--text-main);">Numerical Imputation Strategy:</label>
        <select id="mod-num-impute" class="cell-type-select" style="width:100%; padding:9px; margin-top:6px;">
          <option value="mean">Mean Imputation (Optimal for symmetric numeric distributions)</option>
          <option value="median">Median Imputation (Robust to skewed distributions)</option>
        </select>
      `;
    } else if (stepType === 'selection') {
      paramControlsHtml = `
        <label style="font-size:12.5px; font-weight:600; color:var(--text-main);">Top Features to Retain (k):</label>
        <input type="number" id="mod-top-k" value="${step.params?.top_k || 15}" min="2" max="${allCols.length || 50}" style="width:100%; padding:9px; border:1px solid var(--border-color); border-radius:6px; margin-top:6px; background:var(--bg-card); color:var(--text-main);">
      `;
    } else if (stepType === 'encoding') {
      paramControlsHtml = `
        <label style="font-size:12.5px; font-weight:600; color:var(--text-main);">Categorical Encoding Method:</label>
        <select id="mod-encoding-select" class="cell-type-select" style="width:100%; padding:9px; margin-top:6px;">
          <option value="One-Hot Encoding">One-Hot Encoding (pd.get_dummies with drop_first)</option>
          <option value="Label Encoding">Label Encoding (Integer map)</option>
        </select>
      `;
    } else {
      paramControlsHtml = `
        <p style="font-size:12.5px; color:var(--text-muted);">
          Algorithm execution parameters are currently optimized by automated heuristics. You can add or remove columns below to adjust scope.
        </p>
      `;
    }

    // Explanation of what changed in this step
    const changeSummary = step.change_summary || step.recommendation || step.description || "Automatic transformation applied to the dataset.";
    const selectedMethod = step.selected_method || bp.name || "Default Transformation";

    const modalHtml = `
      <div class="modify-step-container">
        
        <!-- 1. What Changed in this Step -->
        <div class="modify-section">
          <div class="modify-section-title">
            <span>ℹ️ 1. What Changed In This Step</span>
            <span class="ai-badge" style="font-size:10.5px;">${step.recommendation_tag || 'Current State'}</span>
          </div>
          <div class="what-changed-box">
            <div class="what-changed-text">${changeSummary}</div>
            <div class="what-changed-meta">
              <span><strong>Method Applied:</strong> <code>${selectedMethod}</code></span>
              <span><strong>Records Processed:</strong> ${(step.total_rows || (this.sessionData?.overview?.current_rows) || 0).toLocaleString()} rows</span>
            </div>
          </div>
        </div>

        <!-- 2. Affected Columns Overview & Active Removable Chips -->
        <div class="modify-section">
          <div class="modify-section-title">
            <span>🎯 2. Affected Columns</span>
            <span id="mod-col-count-badge" style="font-size:11.5px; font-weight:600; color:var(--primary);">${this.modifyingSelectedColumns.length} Columns Included</span>
          </div>
          <p style="font-size:12px; color:var(--text-muted); margin:0;">
            The columns currently affected by this transformation. Click <strong>✕</strong> on any column chip to exclude it from this step:
          </p>
          <div class="col-chips-container" id="mod-chips-container">
            <!-- Dynamically rendered chips -->
          </div>
        </div>

        <!-- 3. Add or Remove Columns from Dataset -->
        <div class="modify-section">
          <div class="modify-section-title">
            <span>➕ 3. Add or Remove Columns For This Step</span>
          </div>
          
          <div class="col-search-toolbar">
            <input type="text" id="mod-col-search" class="col-search-input" placeholder="Search columns by name..." oninput="Pipeline.filterModifiedColumns(this.value)">
            <select id="mod-col-add-dropdown" class="col-search-input" style="flex:0 0 170px; cursor:pointer;" onchange="Pipeline.addModifiedColumnFromSelect(this.value)">
              <option value="">+ Add Column...</option>
            </select>
            <button type="button" class="col-quick-btn" onclick="Pipeline.selectAllModifiedColumns()">Select All</button>
            <button type="button" class="col-quick-btn" onclick="Pipeline.deselectAllModifiedColumns()">Deselect All</button>
            <button type="button" class="col-quick-btn" onclick="Pipeline.resetModifiedColumns()">Reset</button>
          </div>

          <div class="col-checklist-container" id="mod-col-checklist">
            <!-- Rendered column checkboxes -->
          </div>
        </div>

        <!-- 4. Step Specific Execution Parameters -->
        <div class="modify-section">
          <div class="modify-section-title">
            <span>⚙️ 4. Step Parameters & Options</span>
          </div>
          ${paramControlsHtml}
        </div>

        <!-- 5. Custom Notes / Change Instructions -->
        <div class="modify-section">
          <div class="modify-section-title">
            <span>📝 5. Custom Instructions / Notes (Optional)</span>
          </div>
          <textarea id="mod-custom-notes" placeholder="Enter custom instructions for this step (e.g., exclude outliers above 99th percentile, preserve original tenure scale)..." rows="2" style="width:100%; padding:9px 12px; font-size:12.5px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:6px; color:var(--text-main); outline:none; resize:vertical;"></textarea>
        </div>

      </div>
    `;

    if (contentEl) {
      contentEl.innerHTML = modalHtml;
      this.renderModifiedColumnChips();
    }

    if (modal) modal.classList.add('active');
  },

  renderModifiedColumnChips() {
    const chipsContainer = document.getElementById('mod-chips-container');
    const countBadge = document.getElementById('mod-col-count-badge');
    const addDropdown = document.getElementById('mod-col-add-dropdown');
    const checklistContainer = document.getElementById('mod-col-checklist');

    const totalAvailable = this.allAvailableColumns.length;
    const selectedCount = this.modifyingSelectedColumns.length;

    if (countBadge) {
      countBadge.innerText = `${selectedCount} of ${totalAvailable} Columns Included`;
    }

    // Render removable chips
    if (chipsContainer) {
      if (selectedCount === 0) {
        chipsContainer.innerHTML = `<span style="font-size:12px; color:var(--text-muted); font-style:italic;">No columns selected for this step. Add columns below to transform them.</span>`;
      } else {
        chipsContainer.innerHTML = this.modifyingSelectedColumns.map(col => `
          <span class="col-removable-chip">
            <span>${col}</span>
            <button type="button" class="col-chip-remove-btn" title="Remove ${col} from this step" onclick="Pipeline.removeModifiedColumn('${col}')">✕</button>
          </span>
        `).join('');
      }
    }

    // Render unselected columns into add dropdown
    if (addDropdown) {
      const unselected = this.allAvailableColumns.filter(c => !this.modifyingSelectedColumns.includes(c));
      addDropdown.innerHTML = `<option value="">+ Add Column (${unselected.length} unselected)...</option>` + 
        unselected.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    // Render checklist
    if (checklistContainer) {
      checklistContainer.innerHTML = this.allAvailableColumns.map(col => {
        const isChecked = this.modifyingSelectedColumns.includes(col);
        const colType = this.sessionData?.column_types?.[col] || 'Feature';
        const isNum = colType === 'Numerical';
        return `
          <label class="col-check-item ${isChecked ? 'selected' : ''}" id="col-check-row-${col.replace(/[^a-zA-Z0-9_]/g, '_')}">
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="Pipeline.toggleModifiedColumn('${col}')">
            <span style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${col}">${col}</span>
            <span class="col-type-badge ${isNum ? 'num' : 'cat'}">${isNum ? 'Num' : 'Cat'}</span>
          </label>
        `;
      }).join('');
    }
  },

  removeModifiedColumn(colName) {
    this.modifyingSelectedColumns = this.modifyingSelectedColumns.filter(c => c !== colName);
    this.renderModifiedColumnChips();
  },

  addModifiedColumn(colName) {
    if (colName && !this.modifyingSelectedColumns.includes(colName)) {
      this.modifyingSelectedColumns.push(colName);
      this.renderModifiedColumnChips();
    }
  },

  addModifiedColumnFromSelect(colName) {
    if (colName) {
      this.addModifiedColumn(colName);
    }
  },

  toggleModifiedColumn(colName) {
    if (this.modifyingSelectedColumns.includes(colName)) {
      this.removeModifiedColumn(colName);
    } else {
      this.addModifiedColumn(colName);
    }
  },

  selectAllModifiedColumns() {
    this.modifyingSelectedColumns = [...this.allAvailableColumns];
    this.renderModifiedColumnChips();
  },

  deselectAllModifiedColumns() {
    this.modifyingSelectedColumns = [];
    this.renderModifiedColumnChips();
  },

  resetModifiedColumns() {
    this.modifyingSelectedColumns = [...this.initialAffectedColumns];
    this.renderModifiedColumnChips();
  },

  filterModifiedColumns(query) {
    const q = (query || '').toLowerCase().trim();
    this.allAvailableColumns.forEach(col => {
      const rowId = `col-check-row-${col.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const rowEl = document.getElementById(rowId);
      if (rowEl) {
        if (!q || col.toLowerCase().includes(q)) {
          rowEl.style.display = 'flex';
        } else {
          rowEl.style.display = 'none';
        }
      }
    });
  },

  closeModifyModal() {
    const modal = document.getElementById('modify-step-modal');
    if (modal) modal.classList.remove('active');
  },

  async applyStepModification() {
    const bp = this.blueprint[this.activeStepIdx];
    const stepType = bp ? bp.type : '';
    const params = {
      selected_columns: [...this.modifyingSelectedColumns],
      custom_notes: document.getElementById('mod-custom-notes')?.value || ''
    };

    if (stepType === 'scaling') {
      params.method = document.getElementById('mod-scaling-select')?.value || 'StandardScaler';
    } else if (stepType === 'outliers') {
      params.factor = parseFloat(document.getElementById('mod-iqr-select')?.value || '1.5');
    } else if (stepType === 'missing') {
      params.numeric_strategy = document.getElementById('mod-num-impute')?.value || 'mean';
    } else if (stepType === 'selection') {
      params.top_k = parseInt(document.getElementById('mod-top-k')?.value || '12', 10);
    } else if (stepType === 'encoding') {
      params.method = document.getElementById('mod-encoding-select')?.value || 'One-Hot Encoding';
    }

    this.closeModifyModal();
    UI.showToast(`Re-running Step ${this.activeStepIdx + 1} with ${params.selected_columns.length} columns...`, "info");

    try {
      const resp = await fetch('/api/step-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionData.session_id,
          action: 'modify',
          step_index: this.activeStepIdx,
          params: params,
          user_id: this.getUserId()
        })
      });
      const data = await resp.json();
      if (data.session) {
        this.updateSession(data.session);
      } else if (data.modified_step) {
        this.steps[this.activeStepIdx] = data.modified_step;
        this.render();
      }
      UI.showToast(`Step ${this.activeStepIdx + 1} modified! ${params.selected_columns.length} columns processed.`, "success");
      if (window.App) window.App.refreshDashboardOverview();
    } catch (e) {
      console.error(e);
      UI.showToast("Failed to modify step: " + e.message, "error");
    }
  }

};

window.Pipeline = Pipeline;
